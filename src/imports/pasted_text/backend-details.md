Backend, in full detail
The AI scoring contract

bot.py's rate_deal() builds a prompt (RATING_PROMPT) that asks the LLM for strict JSON only:

json
{"score":<1-10>,"verdict":"GREAT DEAL|GOOD DEAL|AVERAGE|POOR DEAL|SCAM|SPAM",
 "reason":"...","is_spam":bool,"has_suspicious_link":bool,
 "product_name":"...","hashtags":["tag1","tag2","tag3"]}

Scoring guidance is baked into the prompt itself (10 = all-time-low price, 9 = 30%+ off vs history, down to 1 = scam). rate_deal() then tries 8 providers in a fixed order (Cerebras → Groq → Gemini → SambaNova → Together → Cohere → OpenRouter → Mistral), each wrapped in its own _cerebras()/_groq()/etc. function that calls a shared _call_ai_text() helper. If a provider 429s, it sleeps and gives up on that one; if a provider returns malformed text, _parse_json() strips markdown fences and regexes out the {...} block before json.loads. The whole chain retries up to 3 times with increasing backoff before giving up and posting the deal unrated.

The 20-rule formatter

Once scored, generate_clean_post() builds a second, completely different prompt (CLEAN_FORMAT_PROMPT) — this one has nothing to do with scoring, it's purely about turning messy scraped text into a publish-ready post. It's extremely prescriptive: exact title format (ProductName @ ₹Price (Qualifier)), a fixed vocabulary of qualifiers ((Loot Deal), (Steal Deal), (Final Price)...), a banned-phrase list (no "Grab it now", "Hurry up", etc.), a max-2-emoji rule, no hashtags, 3–10 line length cap. _validate_clean_output() then checks the AI actually followed the rules (URL present, not raw JSON, sane length) — if it didn't, _manual_clean_format() builds the post from the structured fields directly, template-style, with zero AI involved. This is the fallback that guarantees a post always goes out even if every LLM is down.

Three separate layers of deduplication

This surprised me on the first pass, so worth calling out explicitly — there isn't one dedup check, there are three, doing different jobs:

Text fingerprint (sha256_fp / dup.check() in bot.py) — catches the exact same message reposted.
Canonical URL (canonical_url_key(), added by patch_dedup.py) — catches the same product posted with different caption wording, by stripping tracking params (tag, utm_*, fbclid, etc.) from the URL and, for Amazon, resolving straight to the ASIN.
ASIN price-check (check_asin_price()) — even if it's a genuine repost, it's only blocked if the price is the same or higher. A real price drop is allowed to repost, and bot.py's 48-hour window logic does the same thing independently with drop_info messaging ("Was ₹X → Now ₹Y ⬇️Z%").
The full loop — including the part I hadn't traced yet: how "Approve" gets a deal onto Telegram

There are two separate Redis Pub/Sub channels, and this is the piece that actually closes the loop between the dashboard and Telegram:

deals:finalized — worker.py (and bot.py) publish here when a deal is scored and saved. api.py's pubsub_listener() subscribes to this (plus a deals:new alias) and rebroadcasts the raw payload to every connected browser over the WebSocket — this is the "new deal appeared in Review tab" path.
deals:approved — when someone hits Approve in the dashboard, PUT /api/v1/deals/{fp_hash}/approve in api.py updates MongoDB, broadcasts a deal_approved WS event back to browsers (so other reviewers see it flip instantly), and also republishes the full deal document onto deals:approved. bot.py has a second, independent pubsub_listener(poster) subscribed to exactly that channel — when a message arrives, it's what actually calls Telegram's API to post the message. So bot.py plays two roles simultaneously: source-side scraper/rater, and destination-side "listen for approvals and publish" worker.

So a deal literally travels: Telegram source channel → listener.py → Redis queue → worker.py scores/saves → Mongo + deals:finalized → api.py → WebSocket → browser card → you tap Approve → api.py → Mongo update + deals:approved → bot.py's second listener → Telegram output channel.

Route table (api.py, FastAPI)

Beyond approve/reject/edit, there's a longer tail worth knowing about: POST .../image and DELETE .../image (manual image upload/removal per-deal), POST .../ai-rewrite (calls the AI chain again with a custom instruction, live from the edit modal), POST .../scrape-image (re-attempt image scraping), POST .../retry-affiliate (redo affiliate-link conversion if it failed the first time), PUT .../spam (flag as spam without a full reject), POST /deals/compose (manually author a deal from scratch instead of from a scraped message), GET /deals/desidime (separate feed for the DesiDime tab), and a catch-all GET /{full_path:path} at the very end that serves the React build for any unmatched route (standard SPA fallback routing).

Frontend, in full detail
One important thing I missed the first time: half the component folder is dead code

dealflow-main/src/app/components/deals/ (DealCard, DealPanel, DealImage) and components/common/ (ScoreRing, PriceBadge, StatusBadge, EmptyState, ErrorBoundary, Lightbox, OfflineBanner) look like a proper, modular component architecture — but App.tsx never imports from either folder. It redefines its own ScoreRing, ImageLightbox, DealCard, etc. as local functions inside the same 1,800-line file. So there are effectively two parallel implementations of the same UI sitting in this repo: the modular one (unused, more polished — e.g. its ScoreRing has proper role="meter" accessibility attributes that the inline one doesn't), and the monolithic one that's actually running. This is exactly the kind of thing your friend should know before he starts "fixing" a bug in components/deals/DealCard.tsx and wonders why nothing changes — he needs to be editing App.tsx.

State + data flow, precisely
BASE_DEALS is computed at module load time, synchronously, from a hardcoded pendingDealsRaw = {} object at the top of the file (empty in this build — it's meant to be swapped for a real JSON snapshot at build time). This becomes the initial useState<Deal[]> value before any network call happens.
On mount, loadDeals() calls fetchPendingDeals() → GET /api/v1/deals/pending → maps each raw Mongo doc through mapRawToDeal() → setDeals() replaces state, but only if the API returned at least one deal (if (apiDeals.length > 0)) — so an empty-but-successful response silently keeps showing stale BASE_DEALS, which is worth knowing if the dashboard looks "stuck."
This poll repeats every 15s via setInterval, independent of the WebSocket — belt-and-suspenders.
The WebSocket handler only reacts to two message types: new_deal (prepend to list, dedup by id, toast) and stats_update (currently a no-op — the comment literally says "can be consumed by StatsBar if lifted later," meaning stats aren't wired to live updates yet).
Approve/Reject/edit all follow the same pattern: mutate local state first (instant visual feedback + navigator.vibrate haptic), then fire the network call, and only touch state again if it fails (revert + error toast). This is why the UI feels instant even on a slow connection — it's not actually waiting for the server before showing you the result.
mapRawToDeal() — the translation layer

This is the single function responsible for turning MongoDB's shape (prices.sale, prices.mrp, category as "🔌 Electronics", source_channel, img_path as a server filesystem path) into the UI's flat Deal type. Some of the logic worth knowing: score gets rescaled from the AI's 1–10 to a 0–100 UI scale (Math.round(d.score * 10)), category strings get split into emoji + name (extractEmoji/extractCatName), and image URLs get reconstructed from either a full img_url or a server-relative img_path prefixed with API_BASE — meaning broken images are usually an API_BASE/IMAGES_BASE_URL mismatch, not a missing file.
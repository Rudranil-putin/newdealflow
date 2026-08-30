# DealBot + DealFlow — full setup guide

Two zips = one product:

- **`dealbot_code_only`** → Python backend (5 separate processes) that scrapes deals, scores them with AI, and posts them to Telegram.
- **`dealflow-main`** → React source for the review dashboard ("Command Deck") that the backend serves and talks to.

The compiled dashboard is *already* baked into `dealbot_code_only/dealbot/static/`, so the backend alone is a working product. `dealflow-main` is only needed if your friend wants to edit the UI.

---

## 1. What each backend file does

| File | Role |
|---|---|
| `listener.py` | Zero-logic Telegram listener. Watches source channels (via Telethon) and `LPUSH`es raw messages onto Redis list `queue:deals`. Newer, leaner replacement for the scrape loop inside `bot.py`. |
| `desidime_bot.py` | Scrapes `desidime.com/new` with `requests`+`BeautifulSoup` (DesiDime isn't on Telegram, so it needs its own path). Runs its deals through the same AI formatting chain as `bot.py`. |
| `worker.py` | The actual pipeline: pops jobs from Redis → dedups (including a canonical-URL dedup patched in via `patch_dedup.py`, already applied) → scores/categorizes → saves to MongoDB → publishes to Pub/Sub channel `deals:finalized`. |
| `bot.py` | The big one (2,300+ lines). All-in-one Telegram admin bot: AI-formats deal text (Cerebras → Groq → Gemini → Together fallback chain), sends previews to the admin for approval, auto-posts 9+/10 scores, posts approved deals to the output channel. Historically did its own scraping too — `worker.py`'s docstring says it's meant to eventually replace that part of `bot.py`. |
| `api.py` | FastAPI gateway. REST endpoints for approve/reject/edit/settings/channels + a `/ws` WebSocket that pushes new deals to the dashboard live. Also serves the compiled `static/` frontend, so this is the one process a browser actually talks to. |
| `patch_dedup.py` | One-time migration script that patched `worker.py.bak` → `worker.py` to add canonical-URL dedup. Already applied — you don't need to run it again unless you want to see what changed. |
| `start_bots.sh` | Kills any running instances, launches all 5 processes with `nohup`, and (on first run) installs a systemd service so they restart on reboot/crash. |
| `*.json` files (`pending_deals.json`, `deal_cache.json`, `seen_ids.json`, `dd_seen.json`, `dd_pending.json`, `daily_stats.json`, `last_cycle.json`, `trending.json`, `product_prices.json`) | On-disk state/cache snapshots from the live bot — pending review queue, dedup memory, daily stats. Safe to delete/reset for a fresh start; they'll regenerate. |
| `poster_session.session-journal` | A leftover Telethon SQLite journal file, tied to whatever Telegram account was logged in on the original server. **Won't work for your friend** — see step 4. |

## 2. What the frontend is

`dealflow-main/dealflow-main/src/app/App.tsx` (~1,800 lines) — a Vite + React + TypeScript + Tailwind + shadcn/ui app with 5 tabs: **Review** (swipe-style approve/reject cards with AI score rings), **DesiDime**, **Posted**, **Channels**, **Settings**. It talks to `api.py` over REST + WebSocket, with `API_BASE` hardcoded to `https://api.rudranil.me` in production — your friend needs to change that (see step 5).

## 3. Install dependencies

**Backend** — there's no `requirements.txt` in the zip, so create one:

```bash
cd dealbot
python3 -m venv venv && source venv/bin/activate
pip install fastapi "uvicorn[standard]" python-dotenv redis motor pymongo \
            telethon aiohttp aiofiles requests beautifulsoup4
```

**Frontend** (only if editing the UI):
```bash
cd dealflow-main
npm i
npm run dev
```

## 4. External services your friend needs to set up

1. **Redis** — local `redis-server` is fine for testing (`REDIS_URL=redis://127.0.0.1:6379/0`).
2. **MongoDB** — Atlas free tier or local `mongod`.
3. **A Telegram bot** — create one via [@BotFather](https://t.me/BotFather) → `TG_BOT_TOKEN`.
4. **A Telegram *user* account/API app** — for the scraping side (`listener.py`, `bot.py`'s scrape functions need a real user session, not the bot token, since bots can't read arbitrary channels). Get `TG_API_ID`/`TG_API_HASH` from https://my.telegram.org, then run Telethon's login flow once interactively to generate a fresh `.session` file — **the included `poster_session.session-journal` belongs to the original account and won't authenticate for anyone else.**
5. **AI API keys** (any subset works — the code falls through the chain): Cerebras, Groq, Gemini, Together, OpenRouter, Mistral, SambaNova, Cohere — all have free tiers.
6. **EarnKaro** affiliate account (optional — only needed for `EARNKARO_TOKEN` / auto-affiliate-link conversion).

## 5. Config to change before running

- `.env` — copy it, then replace **every** value with your friend's own credentials. Two things to note:
  - `LISTENER_SESSION_STRING` appears **twice** in the file — the second line silently overwrites the first, so make sure only the intended value survives.
  - `SOURCE_CHANNELS` should be a comma-separated list of the Telegram channel IDs/usernames to scrape.
- `api.py`: `IMAGES_DIR` defaults to `/home/rudranil777/dealbot/images` and `IMAGES_BASE_URL` to `http://74.225.250.0/images` — both are the original server's paths, change them.
- `App.tsx`: `API_BASE` is hardcoded to `https://api.rudranil.me` for production builds — point it at wherever `api.py` will actually run, or set `VITE_API_URL` for dev.
- Delete/rotate anything in `.env` from the original deployment — those are live secrets, not placeholders.

## 6. Run order

```
Redis + MongoDB running
        ↓
python3 listener.py      # or/and desidime_bot.py
        ↓
python3 worker.py        # processes the queue
        ↓
python3 bot.py           # admin review + posting
        ↓
uvicorn api:app --host 0.0.0.0 --port 8000   # dashboard backend
```

Or just run `./start_bots.sh` once everything above is configured — it starts all 5 and sets up auto-restart via systemd (Linux only; needs `sudo`).

Then open `http://<server>:8000` (or run the Vite dev server separately) to see the Review dashboard.

## 7. Note on `bot.py` vs `worker.py`

Per `worker.py`'s own docstring, the codebase is mid-migration: `bot.py` still contains its own legacy scrape-and-process loop, while `worker.py` is the new Redis-queue-based pipeline meant to eventually replace that part of `bot.py`. Both can run side by side right now, but your friend should be aware there's some overlap/duplication in deal-processing logic between the two — worth reading both before making changes.
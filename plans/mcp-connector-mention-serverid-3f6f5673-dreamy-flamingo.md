# DealFlow — Mobile Overhaul + Swipe-to-Triage Plan

## Context

All previous redesign components are built. The mobile experience is unacceptable: touch targets are 28px, fonts drop to 9px, BatchFooter overlaps MobileNav, and no swipe gestures exist. The user asked to delete KeyboardShortcuts and make the phone experience outstanding. This plan replaces the cramped desktop-ported mobile UI with a proper swipe-to-triage pattern (Tinder/Gmail/Superhuman) and fixes every layout defect.

---

## What Gets Deleted

- `src/components/KeyboardShortcuts.tsx` — deleted entirely
- All references in `ReviewView.tsx` (import, state, render, `?` keyboard case)

---

## Swipe-to-Triage (the headline feature)

On mobile, the primary approve/reject workflow becomes:

```
Swipe right ≥ 80px  → green reveal "✓ APPROVE" → card flies off right → approve API
Swipe left  ≥ 80px  → red reveal  "✗ REJECT"  → card flies off left  → reject API
Release < threshold  → spring back to center, no action
Tap card body        → opens EditModal
```

No on-card buttons needed for the primary flow. Desktop keeps existing approve/reject/edit buttons.

### Implementation in `DealCard.tsx`

Add refs: `touchStartX`, `touchStartY`, `isScrolling`  
Add state: `swipeX` (number), `swiping` (bool), `swipeDir` ("right"|"left"|null for exit animation)

```
onTouchStart  → record startX, startY, reset isScrolling
onTouchMove   → if |deltaY| > |deltaX| first 10px: set isScrolling=true, return
                else: setSwipeX(rubberband(deltaX)), e.preventDefault()
onTouchEnd    → if |swipeX| >= 80: vibrate(10), setSwipeDir, schedule approve/reject after 280ms
                else: setSwipeX(0), setSwiping(false)
```

Rubberband: `deltaX * (1 - 0.25 * Math.log(1 + Math.abs(deltaX) / 80))` — slows card past threshold.

Card wrapper gets `touch-action: pan-y` normally, `touch-action: none` while `swiping`.

**CSS animations** in `index.css`:
```css
@keyframes cardFlyRight { to { transform: translateX(120%) rotate(12deg); opacity: 0; } }
@keyframes cardFlyLeft  { to { transform: translateX(-120%) rotate(-12deg); opacity: 0; } }
.swipe-exit-right { animation: cardFlyRight 0.28s cubic-bezier(0.4,0,1,1) forwards; }
.swipe-exit-left  { animation: cardFlyLeft  0.28s cubic-bezier(0.4,0,1,1) forwards; }
```

Reveal layers behind the card:
```tsx
{/* Green layer */}
<div className="absolute inset-0 rounded-xl flex items-center pl-5"
     style={{ background: "#16a34a", opacity: Math.max(0, swipeX) / 80 }}>
  <span className="text-white font-black text-xl">✓ APPROVE</span>
</div>
{/* Red layer */}
<div className="absolute inset-0 rounded-xl flex items-center justify-end pr-5"
     style={{ background: "#dc2626", opacity: Math.max(0, -swipeX) / 80 }}>
  <span className="text-white font-black text-xl">✗ REJECT</span>
</div>
```

---

## Layout & Touch Target Fixes

### `index.css`
```css
/* Single column on mobile */
.deal-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 768px) {
  .deal-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
}

/* Card image height */
.deal-card-image { height: 180px; }
@media (min-width: 768px) { .deal-card-image { height: 152px; } }

/* Font floor on mobile */
@media (max-width: 768px) {
  .text-\[9px\], .text-\[8px\], .text-\[7px\] { font-size: 11px !important; }
}

/* No-scrollbar */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* BatchFooter bottom offset (mobile accounts for MobileNav height) */
@media (max-width: 768px) {
  .batch-footer { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 60px + 14px) !important; }
}
```

Remove the broken `.mobile-nav` padding-bottom rule (replaced by inline style in MobileNav).

### `MobileNav.tsx`
- Height: `calc(60px + env(safe-area-inset-bottom, 0px))` via inline style
- `paddingBottom: env(safe-area-inset-bottom, 0px)` inline (remove `.mobile-nav` class)
- Icon size: 17 → 20px
- Labels: `text-[9px]` → `text-[11px]`
- Pending badge: 14px → 16px circle, `text-[9px]`

### `DealCard.tsx` touch targets
- Reject button: `w-7 h-7` → `w-11 h-11` (44px)
- Edit button: `w-7 h-7` → `w-11 h-11`
- Approve button: `h-7` → `h-11`
- Batch checkbox: wrap in `w-11 h-11 flex items-center justify-center` outer button
- Card image zone: switch from `style={{ height: 152 }}` to `className="deal-card-image ..."`

### `BatchFooter.tsx`
- Replace inline `paddingBottom` with class `batch-footer` (CSS handles mobile vs desktop split)
- Raise to `z-50`
- All buttons: `h-11` (44px)

### `StatsBar.tsx`
- Items 3-6: add `className="hidden md:flex"` — mobile shows only Pending, Approved, Avg Score
- Label font: `text-[9px]` → `text-[11px]`
- Value font: `text-[10px]` → `text-[12px]`
- `minHeight: 34` → `minHeight: 44`

### `ReviewView.tsx` toolbar — 3 rows → 2 rows on mobile + bottom sheet

**New state:** `showMobileSheet: boolean`

**Row 1 (always):** Search bar full-width + `md:` Batch button + `md:` Keyboard icon removed  
**Row 2 (always):** Status filter pills (`overflow-x-auto no-scrollbar`) + `md:` sort buttons  
**Row 3 → desktop only:** `hidden md:flex` on broadcast row  

**Mobile additions:**
- Batch toggle: icon button `w-11 h-11 md:hidden`
- `···` button: `w-11 h-11 md:hidden` → opens `showMobileSheet`

**Mobile sheet** (fixed bottom, `z-50`, `md:hidden`):
```
[drag handle]
Sort: [Score] [New] [Hot]  — h-11 each
Broadcast: [Telegram ●] [WhatsApp ○] [X ○]  — h-11 each
[Done button h-11]
```

**Grid scroll container** bottom padding:
```tsx
paddingBottom: batchMode && selected.size > 0
  ? "calc(env(safe-area-inset-bottom,0px) + 60px + 64px)"  // MobileNav + BatchFooter
  : "calc(env(safe-area-inset-bottom,0px) + 60px)"         // MobileNav only
```
Use `md:pb-4` to override on desktop.

---

## Build Order

1. `index.css` — add all new CSS rules, remove `.mobile-nav` rule
2. Delete `KeyboardShortcuts.tsx`
3. `MobileNav.tsx` — height, font, icon, safe-area fixes
4. `BatchFooter.tsx` — z-index, touch targets, CSS class
5. `StatsBar.tsx` — hide items 3-6 on mobile, font sizes
6. `DealCard.tsx` — swipe gesture, touch targets, fly-off animation, image class
7. `ReviewView.tsx` — remove KeyboardShortcuts, simplify toolbar, mobile sheet, scroll padding

---

## Verification

1. 375px viewport (iPhone SE): grid is single column, no horizontal overflow
2. Swipe card right 90px → card flies off, approve toast fires
3. Swipe card 40px, release → springs back, no action
4. Vertical scroll in grid unaffected by swipe detection
5. MobileNav fully visible, not clipped behind iPhone home bar
6. BatchFooter sits above MobileNav (not overlapping)
7. All action buttons ≥ 44px computed height
8. No text below 11px on mobile viewport
9. `···` sheet opens with sort + broadcast controls
10. Desktop (`md+`): all existing behaviour preserved — swipe inactive, keyboard nav works

---

## Aesthetic Stance

**Dark Terminal Command Center** — Linear meets Bloomberg. Dense, fast, zero decorative chrome.

- **Ground:** Near-black `#0a0a0b` background, `#111113` cards, `#1a1a1f` sidebar
- **Primary:** `#E63946` (existing brand red — keep it)
- **Success:** `#16a34a` | **Warning:** `#f59e0b` | **Danger:** `#dc2626`
- **Border:** `#1e1e24` hairline
- **Fonts:** Inter (UI labels/body) + JetBrains Mono (prices, scores, timestamps, counts)
- **Radius:** 12px cards, 8px chips/buttons, 16px modals
- **Motion:** Framer Motion spring animations (already in repo), kept subtle

---

## File Plan

### New files to create in `src/`

```
src/index.css                  — add Google Font @imports (Inter, JetBrains Mono), theme tokens
src/App.tsx                    — root: layout shell, tab router, WS hook, state
src/components/
  Sidebar.tsx                  — desktop nav + WS dot + 6-stat live dashboard
  MobileNav.tsx                — bottom nav (5 items incl. DesiDime)
  MobileHeader.tsx             — top bar with WS dot + pending badge
  StatsBar.tsx                 — live strip above deal grid
  ReviewView.tsx               — toolbar + batch mode + grid
  DealCard.tsx                 — improved card (signals, copy coupon, channel filter)
  ScoreRing.tsx                — SVG ring with glow (extracted, reusable)
  EditModal.tsx                — editor + Retry Affiliate / Scrape Image / Spam buttons
  DesiDimeView.tsx             — fixed WS + same grid
  PostedView.tsx               — with auto_posted badge + Compose FAB
  ChannelsView.tsx             — channel list with live 24h counts
  SettingsView.tsx             — settings form
  BatchFooter.tsx              — sticky multi-select action bar
  KeyboardShortcuts.tsx        — overlay cheatsheet + actual keyboard handler
  ComposeModal.tsx             — manual deal authoring (POST /deals/compose)
  WSStatusDot.tsx              — green/amber/red connection indicator
  ImageLightbox.tsx            — fullscreen image viewer
```

---

## Design Decisions Per Component

### Sidebar (desktop, 220px)
- Logo `D` pill (gradient red→orange) + "DealFlow" + WS status dot
- Nav: Review [pending badge], DesiDime [cyan live dot], Posted, Channels, Settings
- Active item: red left-bar + subtle red tint bg
- Bottom stats panel: 2-col grid
  ```
  📤 Posted  12  |  🤖 Auto   4
  ✅ Checked 47  |  🚫 Scam   2
  🔄 Dupes    8  |  ❓ Unrated 6
  ```
  These update live from `stats_update` WS frames (currently discarded in existing code)
- Theme toggle button (moon/sun icon)

### WS Status Dot
- Green + pulse = connected
- Amber + slow pulse = reconnecting (shows `retry N` tooltip)
- Red = dead + "Reconnect" click handler

### Mobile Nav (5 items)
```
🔥 Review  |  🛍 DesiDime  |  ✅ Posted  |  📡 Channels  |  ⚙️ Settings
```
Active: red top-bar + red icon color

### Stats Bar (Review tab, sticky below toolbar)
```
⏳ Pending: 34  ·  ✅ Approved: 12  ·  ❌ Rejected: 8  ·  📊 Avg Score: 6.4  ·  🔗 Affiliate: 53%  ·  ⚡ Session: +7
```
Thin mono font, muted colors, updates live from WS.

### Toolbar (Review tab)
Three rows:
1. Search input (full width) + `⌨` shortcuts button + `□ Batch` toggle
2. Status filter pills (pending/approved/rejected/all with counts) + Sort buttons (Score/New/Hot)
3. Broadcast row: `🟢 Live` dot + `✈️ Telegram ●` + `WhatsApp ○` + `𝕏 ○`

### Deal Card
Keeps existing image treatment (blurred bg + dot grid). Additions:
- **Signals row**: 2-3 small chips below price — e.g. `[48% off]` `[Affiliated]` `[COUPON: SAVE20 📋]`
  - COUPON chip: tap → copy to clipboard → toast "SAVE20 copied!"
- **Channel badge**: clickable → filters grid to that channel; "All channels" pill appears in toolbar to clear
- **Score ring hover tooltip**: shows verdict string (e.g. "Strong deal — high confidence score.")
- **Verdict text**: 1-line below title on hover/long-press (mobile)
- Status overlays unchanged (green check / red X / amber draft)

### Batch Mode
Toggle `□ Batch` in toolbar. When active:
- Checkbox top-left of each card (card gets focus ring on hover)
- Sticky `BatchFooter` slides up from bottom:
  ```
  ☑ 8 selected  [✗ Reject All]  [✓ Approve All]  [✕ Clear]
  ```
- Calls API sequentially, shows progress toast

### Edit Modal — new buttons
Adds a row of tertiary action buttons above the footer:
```
[🔗 Retry Affiliate]  [🖼 Scrape Image]  [🚫 Mark Spam]
```
- `Retry Affiliate` → POST `.../retry-affiliate` → updates affText in state
- `Scrape Image` → POST `.../scrape-image` → updates imgUrl in state
- `Mark Spam` → PUT `.../spam` → closes modal + removes card
Mobile card preview: make it a collapsible `▼ Preview` section (not hidden on mobile).

### Compose Modal (new)
Triggered by `+` FAB in Posted tab.
Fields: Category (emoji picker grid), Title, Sale Price (₹), MRP (₹), Image URL, Post Text (textarea).
Footer: `[Cancel]` `[Save Draft]` `[Compose & Approve →]`
Submits to `POST /api/v1/deals/compose`.

### Keyboard Shortcuts
Active when no modal is open, focused on Review tab:
| Key | Action |
|-----|--------|
| `A` | Approve focused card |
| `R` | Reject focused card |
| `E` | Edit focused card |
| `→` / `←` | Next / prev card |
| `B` | Toggle batch mode |
| `Space` | Approve focused (same as A) |
| `Esc` | Deselect / close |
| `?` | Toggle shortcuts overlay |

Focus ring on active card: 2px `#E63946` outline.

---

## Bug Fixes Included

1. **DesiDime tab added to NAV array** — tab becomes reachable
2. **DesiDime WS handler fixed** — actually attaches `addEventListener` to shared WS
3. **`stats_update` WS frames wired** — feed into `StatsBar` and `Sidebar` live stats
4. **`sendWA` / `sendX` buttons rendered** — broadcast control shows all three toggles

---

## Token Map (`src/index.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

@import 'tailwindcss';

@theme inline {
  --color-background: #0a0a0b;
  --color-foreground: #f0f0f2;
  --color-card: #111113;
  --color-card-foreground: #f0f0f2;
  --color-sidebar: #0d0d10;
  --color-border: #1e1e24;
  --color-muted: #1a1a20;
  --color-muted-foreground: #6b7280;
  --color-primary: #E63946;
  --color-primary-foreground: #ffffff;
  --color-secondary: #18181c;
  --color-input: #141418;
  --radius: 12px;
}
```

Light mode tokens preserved in `.light` block.

---

## Build Order

1. `src/index.css` — fonts + tokens
2. `src/App.tsx` — shell + WS hook + state (no UI yet, just wiring)
3. `ScoreRing`, `WSStatusDot`, `ImageLightbox` — atomic pieces
4. `DealCard` — with signals, coupon copy, channel filter click
5. `Sidebar` + `MobileNav` + `MobileHeader` — navigation shell
6. `StatsBar` — live strip
7. `ReviewView` — toolbar + grid + batch mode
8. `BatchFooter` — multi-select bar
9. `EditModal` — with new API buttons
10. `DesiDimeView` — fixed WS
11. `PostedView` — with auto_posted + Compose FAB
12. `ComposeModal` — new feature
13. `ChannelsView`, `SettingsView` — existing logic, new styles
14. `KeyboardShortcuts` — overlay + hook

---

## Verification

- All 5 tabs reachable on desktop sidebar and mobile nav (including DesiDime)
- WS dot changes color on connect/disconnect
- Stats bar updates on `stats_update` WS frame
- Batch mode: select cards → bulk approve/reject works
- Coupon chip: tap → clipboard toast
- Channel badge: click → filters grid → clear pill appears
- Edit modal: Retry Affiliate / Scrape Image / Spam buttons visible + functional
- Compose modal: submits to POST /deals/compose
- Keyboard shortcuts: A/R/E/arrows/B/? all work in Review tab
- Dark mode default, light mode toggle works

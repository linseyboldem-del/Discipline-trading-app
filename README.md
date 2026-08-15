# Discipline — Personal Trading System (EdgeFlo-style MVP)

A personal, single-user trading discipline app: pre-trade rule checklist,
trade journal, performance analytics, and AI coaching on your own trade
history. Built to run on the same stack as Aethelgard, so it should feel
familiar to deploy and extend.

## Architecture

```
React (Vite, Tailwind)  --auth+CRUD-->  Supabase (Postgres + Auth, RLS)
        |
        --backend-only calls (needs secrets)-->
        |
Node/Express  ---->  Supabase (service role, for cross-checks)
        |
        ---->  Anthropic API (AI Coach)
```

- **Frontend** talks to Supabase directly for trades, rules, and profile
  (protected by Row Level Security — every row is scoped to `auth.uid()`).
- **Backend** exists only for the two things that need a secret or shared
  server-side logic: the pre-trade checklist evaluation and the AI coach
  (Anthropic API key must never reach the browser).

## Setup

### 1. Supabase
1. Create a new Supabase project.
2. Open the SQL editor, paste and run `backend/db/schema.sql`.
3. Under Authentication → Providers, leave Email enabled (default). Turn
   off "Confirm email" in Auth settings if you want to sign in immediately
   without checking an inbox — this is a single-user personal tool.
4. Grab your Project URL, `anon` public key, and `service_role` key from
   Project Settings → API.

### 2. Backend
```powershell
cd backend
npm install
cp .env.example .env   # then fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
npm run dev
```
Runs on `http://localhost:8787` by default. Health check: `GET /health`.

### 3. Frontend
```powershell
cd frontend
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm run dev
```
Runs on `http://localhost:5173`. Sign up with any email/password — it's
your own private instance.

### 4. First-time app setup
1. Sign up on the login screen.
2. Go to **Rules & Settings** and set your real risk rules first — the
   checklist and daily-loss-limit logic depend on this row existing.
3. Log a few trades in **Journal** to see the Dashboard and AI Coach
   populate.

## Deploying (same pattern as Aethelgard)
- **Backend → Render**: new Web Service from this repo's `backend/`
  folder, set the same env vars as `.env.example`, build command
  `npm install`, start command `npm start`.
- **Frontend → Vercel**: import this repo, root directory `frontend/`,
  framework preset Vite, set the `VITE_*` env vars in Vercel's dashboard,
  and set `VITE_API_URL` to your Render backend URL once it's live.
- Update `FRONTEND_ORIGIN` in the Render backend env vars to your Vercel
  URL once deployed, to lock down CORS.

## Extending later
- Screenshot upload: add a Supabase Storage bucket and wire
  `screenshot_url` in `TradeForm.jsx` to an upload call.

## Scanner module (Signals)

An independent scanner that grades ICT/SMC confluence setups across your
configured pairs — no TradingView involved. It reuses your existing MT5
infrastructure rather than a new data source:

```
Your MT5 terminal (Windows)
   -> python-bridge/fetch_and_push.py  (polls MT5, pushes candles)
   -> POST /api/scanner/ingest         (backend, service-role auth)
   -> market_candles table (Supabase)
   -> background scheduler every N min -> detection pipeline -> signals table
   -> Grade A/B (per your min_grade_for_alert) -> Telegram alert
   -> Signals page in the app
```

### What "Grade A" means here
The detection pipeline (`backend/lib/detection/`) implements, in plain
JS, the same concepts from the manual: swing-based market structure
(BOS/CHoCH), liquidity pools + sweep detection, order blocks,
displacement, Fair Value Gaps, and Breaker Blocks. `grading.js` stacks
these into a score; Grade A requires an FVG/OB overlap (Unicorn-style),
HTF bias alignment, and kill-zone timing all at once — the same bar Part
6 of the manual sets. Grade B is a partial-confluence setup; Grade C is
noise-level and mostly useful for tuning.

**Be honest with yourself about what this is**: these are heuristic
pattern-matching functions approximating ICT concepts algorithmically,
not a certified signal service. Swing detection, displacement
thresholds, and the grading cutoffs in `grading.js` are reasonable
starting points, not tuned/backtested values — expect to adjust them
after watching a couple weeks of output against what you'd have called
manually. Treat every signal as a lead to check on your own chart, not
an instruction.

### Setup
1. Run `backend/db/schema_scanner.sql` in the Supabase SQL editor
   (after the original `schema.sql`).
2. Add `SCANNER_INGEST_KEY` (any long random string) and, if you want
   Telegram alerts, `TELEGRAM_BOT_TOKEN` to the backend's `.env`.
3. In `python-bridge/`: `pip install -r requirements.txt`, copy
   `.env.example` to `.env` with the same `SCANNER_INGEST_KEY` and your
   backend URL, then `python fetch_and_push.py` (or `run_bridge.ps1`).
   Leave it running the same way you run your other always-on scripts.
4. In the app, go to **Rules & Settings** → Scanner & Signals, pick your
   pairs/timeframes, and save. If you want Telegram alerts: message your
   bot once, hit `https://api.telegram.org/bot<token>/getUpdates` to find
   your chat_id, and paste it in.
5. The backend scans automatically every `SCAN_INTERVAL_MINUTES` (default
   15), or hit "Scan Now" on the Signals page any time.

### Telegram bot setup (2 minutes)
1. Message [@BotFather](https://t.me/BotFather) on Telegram, `/newbot`,
   follow the prompts — it gives you a token.
2. Put that token in the backend's `TELEGRAM_BOT_TOKEN`.
3. Message your new bot anything once (so Telegram has a chat with you
   on record), then visit
   `https://api.telegram.org/bot<token>/getUpdates` in a browser — your
   chat_id is in the JSON response.

- Aethelgard cross-check: the `ruleEngine.js` logic is pure and framework-
  free — it could be imported into a shared package if you ever want the
  same discipline rules enforced before Aethelgard fires a live signal.
  The scanner's `detection/` module is similarly pure and could run
  inside Aethelgard directly later if you decide the two systems should
  share one detection engine instead of two parallel implementations.

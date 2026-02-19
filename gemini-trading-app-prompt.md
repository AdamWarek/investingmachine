# 🤖 Gemini Pro Prompt — Virtual Trading Web App (GitHub Pages)

> Copy the entire prompt below and paste it into Gemini Pro. If the output gets truncated, follow up with:
> *"Continue from where you left off — generate the [section name] next."*
>
> Replace `YOUR_ALPHA_VANTAGE_KEY_HERE` with a free key from [alphavantage.co](https://www.alphavantage.co/support/#api-key)

---

## PROMPT START

```
You are an expert full-stack web developer and quantitative finance engineer.
Build a complete, single-file web application for a virtual personal trading
simulator with real market data and automated technical-analysis-based trading
logic. The app MUST be deployable on GitHub Pages (static hosting only — no
server, no Node.js runtime, no backend whatsoever at runtime).

---

## GITHUB PAGES DEPLOYMENT REQUIREMENTS

The final deliverable must be structured for GitHub Pages hosting:

### File Structure:
```
/                          ← repository root
├── index.html             ← single self-contained app file (ALL JS + CSS inline)
├── README.md              ← setup and usage instructions
└── .nojekyll              ← empty file to disable Jekyll processing
```

### Constraints imposed by GitHub Pages (static hosting):
- NO server-side code (Node.js, Python, PHP, etc.) at runtime
- NO npm build step required — the app must run directly from index.html
- ALL JavaScript and CSS must be either inline or loaded from public CDNs
- ALL API calls must be made directly from the browser (client-side fetch)
- localStorage is the ONLY persistence layer available (no database, no cookies)
- GitHub Pages serves over HTTPS — all API endpoints must also be HTTPS
- CORS: only use APIs that allow browser-side requests without a proxy
  (CoinGecko ✅, Stooq ✅ with a CORS note, Alpha Vantage ✅ with API key)

### Stooq CORS note:
Stooq CSV requests from a browser may be blocked by CORS policy. To work
around this, add a fallback: if the direct Stooq fetch fails, load a
hardcoded set of recent prices for GPW instruments and show a warning banner:
"⚠️ Polish market live data unavailable (CORS) — showing cached/demo data."

### README.md must include:
1. Project description (one paragraph)
2. Step-by-step GitHub Pages deployment:
   a. Fork or clone the repo
   b. Go to repo Settings → Pages → set source to "Deploy from branch: main, / (root)"
   c. Wait ~60 seconds, visit https://[username].github.io/[repo-name]/
3. Alpha Vantage API key setup (where to find and insert it in index.html)
4. How to add funds and use manual trading
5. Known limitations (API rate limits, CORS for Polish market)

---

## TECH STACK (CDN only — no build tools)

- React 18 via CDN (unpkg or jsDelivr), with Babel standalone for JSX
- Tailwind CSS via CDN (Play CDN)
- Chart.js via CDN (candlestick plugin included)
- ALL in a single index.html file with inline scripts and styles

Load order in <head>:
```html
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

Use `<script type="text/babel">` for all React/JSX code.

---

## DATA SOURCES (all HTTPS, browser-accessible)

- **US Stocks:** Alpha Vantage `TIME_SERIES_DAILY` — `https://www.alphavantage.co/query`
  API key placeholder: `const AV_API_KEY = "YOUR_ALPHA_VANTAGE_KEY_HERE";`
- **Polish Stocks (GPW):** Stooq CSV — `https://stooq.com/q/d/l/?s={TICKER}.pl&i=d`
  (fetch with try/catch; fall back to demo data on CORS failure)
- **Cryptocurrency:** CoinGecko REST v3 — `https://api.coingecko.com/api/v3`
  No API key needed. Rate limit: ~30 req/min (add 1.2s delay between calls)
- **USD/PLN FX rate:** CoinGecko or Alpha Vantage FX endpoint (HTTPS ✅)

---

## WALLET & PORTFOLIO ENGINE

- Starting balance: $100,000.00 USD
- Persist ALL state in localStorage (key: `virtualTrader_state`)
  — survives page refresh and GitHub Pages re-visits
- "Add Funds" button: user inputs any amount → added to cash balance
- Track:
  - Total portfolio value (USD)
  - Available cash balance
  - Unrealized P&L (USD + %)
  - Realized P&L (USD + %)
  - Daily P&L
  - All-time ROI %
- Transaction history log: timestamp, instrument, action (BUY/SELL),
  quantity, price, total value, reason string

---

## TAB STRUCTURE

Build 4 clearly separated tabs at the top of the app:

### TAB 1 — 🇵🇱 Polish Market (GPW)
- Universe: PKN, CDR, PKO, PEO, LPP, DNP, KGH, ALE, MBK, CPS,
  JSW, PGE, PZU, OPL, TEN
- Data source: Stooq.pl (with CORS fallback to demo data)
- Currency: PLN (auto-convert P&L to USD using live FX)
- Auto-trading: enabled (see logic below)
- Auto-select and hold TOP 5 instruments for day trading

### TAB 2 — 🇺🇸 US Markets (NYSE / NASDAQ)
- Universe: AAPL, MSFT, NVDA, TSLA, AMZN, META, GOOGL, AMD,
  NFLX, COIN, SPY, QQQ, SOFI, PLTR, RIVN, MARA, SMCI, IONQ, HOOD, GME
- Data source: Alpha Vantage TIME_SERIES_DAILY
- Currency: USD
- Auto-trading: enabled
- Auto-select and hold TOP 5 instruments for day trading

### TAB 3 — ₿ Cryptocurrency
- Universe: BTC, ETH, BNB, SOL, XRP, DOGE, ADA, AVAX, MATIC,
  LINK, DOT, UNI, PEPE, WIF, JUP
- Data source: CoinGecko /coins/markets + /coins/{id}/ohlc
- Currency: USD
- Auto-trading: enabled (24/7 market — trigger logic every hour)
- Auto-select and hold TOP 5 instruments for day trading

### TAB 4 — 🌐 Universal Market (Best Picks)
- Aggregates ALL instruments from Tabs 1–3
- Displays a ranked leaderboard: TOP 10 best instruments for day
  trading TODAY across all markets, sorted by composite score
- Allow user to manually buy/sell any instrument from this list
  or search by ticker symbol
- Show a "Why this instrument?" card for each suggestion

---

## AUTOMATED TRADING ENGINE

Run on data load and on a configurable interval (default: 60s).
Show a visible countdown timer to next auto-refresh.

### Instrument Scoring (0–100 composite score):
1. RSI(14): +20pts if RSI 40–60 (neutral zone) or <30 (oversold reversal)
2. MACD Signal Cross: +20pts if MACD crossed above signal in last 3 candles
3. Volume Spike: +15pts if today's volume > 1.5× 20-day average volume
4. Bollinger Band position: +15pts if price near lower band (dip buy)
5. Price vs EMA(20): +10pts if price recently crossed above EMA(20)
6. ADX Trend Strength: +10pts bonus if ADX > 25
7. Penalties: −15pts if RSI > 75 (overbought); −10pts if price near upper BB

### Auto-BUY logic (per tab, top 5 positions):
- Only buy if: score > 60, cash > $500, fewer than 5 open positions in tab
- Position sizing: 10% of total portfolio value (configurable 5–20% via slider)
- Execute at latest daily close price
- Log with full reason string

### Auto-SELL logic (check on every refresh):
Sell when ANY condition is true:
- Stop-loss: price ≤ buy price × (1 − SL%) — default 3%
- Take-profit: price ≥ buy price × (1 + TP%) — default 5%
- RSI crosses above 75 (overbought exit)
- MACD death cross (MACD drops below signal line)
- Held > 5 trading days without hitting TP or SL
- Log with full reason string

---

## MANUAL TRADING (all tabs)

- Search bar: type ticker → auto-lookup current price → show mini sparkline
- Quantity input (shares/units)
- BUY 🟢 and SELL 🔴 buttons
- Pre-trade summary: estimated cost, available cash, estimated P&L
- Confirmation modal before executing
- All manual trades appear in transaction history

---

## STATISTICS DASHBOARD

Collapsible panel at top of every tab showing:

**Global stats:**
- 💰 Total Portfolio Value (USD)
- 💵 Available Cash
- 📈 Total Unrealized P&L (USD + %)
- ✅ Total Realized P&L (USD + %)
- 📆 Today's P&L
- 🏆 Best performing position (ticker + %)
- 💀 Worst performing position (ticker + %)
- 📊 Win rate % (profitable closed trades / total closed trades)
- 📉 Max drawdown %
- 🔄 Total trades executed

**Per-tab positions table:**
Ticker | Qty | Avg Buy Price | Current Price | P&L $ | P&L % | Score | [Sell]

**Portfolio value chart:**
Line chart (Chart.js) — X axis: date/time, Y axis: USD value
(data points saved to localStorage on every auto-refresh)

---

## AI REASONING SECTION (rule-based, no external AI calls)

For every held position and every suggestion, show a collapsible card:

**📋 Why was this bought/sold?**
- Entry reason: list of triggered indicator conditions
  (e.g., "RSI = 28 (oversold), MACD bullish crossover detected,
  volume 2.1× 20-day average, price touched lower Bollinger Band")
- Exit reason (if sold): which specific condition triggered the sell
- Score breakdown: mini progress bar per scoring component (labeled)
- Risk badge: 🟢 LOW / 🟡 MEDIUM / 🔴 HIGH (based on ATR volatility)
- Suggested hold period: SHORT (1 day) / MEDIUM (2–5 days)

---

## TECHNICAL INDICATORS — implement from scratch in pure JS

All indicators calculated from OHLCV array. No external TA library.

```javascript
// RSI(14)
function calcRSI(closes, period = 14) { /* implement Wilder's smoothing */ }

// EMA(n)
function calcEMA(closes, period) { /* exponential moving average */ }

// MACD (12, 26, 9)
function calcMACD(closes) {
  // macdLine = EMA(12) - EMA(26)
  // signalLine = EMA(9) of macdLine
  // histogram = macdLine - signalLine
}

// Bollinger Bands (20, 2)
function calcBollingerBands(closes, period = 20, stdDev = 2) { /* upper/mid/lower */ }

// ATR(14) — for volatility/risk badge
function calcATR(highs, lows, closes, period = 14) { /* Average True Range */ }

// ADX(14) — trend strength
function calcADX(highs, lows, closes, period = 14) { /* Average Directional Index */ }

// Volume SMA(20)
function calcVolumeSMA(volumes, period = 20) { /* simple average */ }
```

---

## UI / UX REQUIREMENTS

**Theme:** Dark navy background (#0f1117), green (#22c55e) for profit,
red (#ef4444) for loss, white text, subtle card borders

**Layout (desktop-first, tablet responsive):**
- Fixed header: app name, global portfolio value, global P&L, wallet balance
- Tab bar below header (4 tabs)
- Per-tab layout:
  - Top summary strip: cash | tab P&L | auto-trade status | countdown timer
  - Collapsible stats panel
  - Open positions table (color-coded P&L cells)
  - Suggestions/scoring panel (top 5 ranked candidates)
  - Reasoning cards (collapsible, one per position/suggestion)
  - Transaction history (last 50 trades, filterable by tab)

**Interactive controls:**
- ⚙️ Settings panel (gear icon, slide-in drawer):
  - API key input field (Alpha Vantage)
  - Starting capital (reset button)
  - Position size % (slider 5–20%)
  - Stop-loss % (slider 1–10%)
  - Take-profit % (slider 2–15%)
  - Auto-trade interval: 15s / 30s / 60s / 5min
  - Toggle: show/hide reasoning cards
- 🟢 Auto-trading ON / 🔴 OFF toggle per tab
- 🔄 "Refresh Data Now" button per tab
- ➕ "Add Funds" button (global, opens modal)

**Toast notifications** (bottom-right, 4s auto-dismiss):
- Every auto-trade: "✅ AUTO-BUY: NVDA × 12 @ $887.40 | RSI oversold + MACD cross"
- Every auto-sell: "🔴 AUTO-SELL: TSLA × 8 @ $201.10 | Take-profit hit (+5.2%)"
- Errors: "⚠️ API rate limit hit — using cached data"

**Loading states:** skeleton shimmer placeholders while fetching data

---

## DATA CACHING STRATEGY (critical for GitHub Pages / API limits)

```javascript
// Alpha Vantage: 25 req/day free tier
// Cache policy: re-fetch only if data older than 23 hours
function getCached(key) {
  const item = localStorage.getItem(key);
  if (!item) return null;
  const { data, timestamp } = JSON.parse(item);
  if (Date.now() - timestamp > 23 * 60 * 60 * 1000) return null;
  return data;
}
function setCache(key, data) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

// CoinGecko: add 1200ms delay between requests + retry on 429
async function fetchWithDelay(url, delayMs = 1200) {
  await new Promise(r => setTimeout(r, delayMs));
  const res = await fetch(url);
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 5000)); // wait 5s and retry once
    return fetch(url);
  }
  return res;
}
```

---

## ERROR HANDLING

- Wrap ALL fetch calls in try/catch
- On API failure: use cached data if available, else show demo/placeholder data
- Never crash the app — show inline error banners per section
- Show data freshness timestamp next to each market section:
  "Last updated: 14:32:07 · Source: live / cached / demo"

---

## FORMATTING

- All USD values: `$1,234.56` (2 decimal places, thousands separator)
- All PLN values: `1 234,56 PLN` (Polish format) + `($312.45)`
- Crypto: up to 6 decimal places (e.g., `0.000123 BTC`)
- Percentages: always show sign: `+3.45%` / `−1.20%`
- Green color for positive values, red for negative, gray for zero

---

## DELIVERABLE — EXACT FILES TO PRODUCE

1. **`index.html`** — complete, self-contained, runs by opening in any browser.
   All JS (React + app logic) and CSS inline. No external files except CDN links.

2. **`README.md`** — includes:
   - What the app does (brief description)
   - GitHub Pages deployment steps (Settings → Pages → branch: main → / root)
   - How to get and insert an Alpha Vantage API key
   - How to use the app (tabs, auto-trading, manual trading, add funds)
   - Known limitations (CORS for Polish stocks, AV rate limits, demo data fallback)
   - Screenshot placeholder section

3. **`.nojekyll`** — empty file (prevents GitHub Pages from running Jekyll,
   which would interfere with the `_` prefixed assets if any)

Do NOT truncate any code. Do NOT use placeholder comments like
"// ... rest of component here". Write the full implementation.
Add inline comments explaining each major section of the code.
The app must work by simply opening index.html in Chrome or Firefox,
OR by visiting the GitHub Pages URL after deployment.
```

---

## POST-PROMPT FOLLOW-UPS (if Gemini truncates)

If the output is cut off, send these follow-up prompts one at a time:

1. *"Continue generating — pick up from where the JavaScript was cut off."*
2. *"Now generate the full README.md file for this project."*
3. *"Now generate the trading engine functions: calcRSI, calcMACD, calcBollingerBands, calcATR, calcADX in full."*
4. *"Now generate the CoinGecko crypto tab component in full."*
5. *"Now generate the Polish market (GPW) tab with Stooq fetching and CORS fallback."*

---

## GITHUB PAGES DEPLOYMENT CHECKLIST

After Gemini produces the files, follow these steps:

- [ ] Create a new GitHub repository (public)
- [ ] Upload `index.html`, `README.md`, and `.nojekyll` to the root
- [ ] Go to **Settings → Pages → Branch: `main` → Folder: `/ (root)`** → Save
- [ ] Wait ~60 seconds
- [ ] Visit `https://[your-username].github.io/[repo-name]/`
- [ ] Open `index.html` in a text editor and replace `YOUR_ALPHA_VANTAGE_KEY_HERE`
  with your free key from [alphavantage.co](https://www.alphavantage.co/support/#api-key)
- [ ] Commit the change — GitHub Pages will auto-redeploy

---

*Prompt version: 1.0 | Created for Gemini Pro | App: Virtual Trading Simulator*

# 🌸 OpenBloom

<p align="center">
  <strong>The free, open-source Bloomberg-style market terminal.</strong><br>
  <em>Institutional-grade market data, 4-panel terminal workflow, options chains, macro curves, SEC filings, and quant backtesting — with zero subscriptions and zero API keys.</em>
</p>

<p align="center">
  <a href="https://openbloom.vercel.app/"><img src="https://img.shields.io/badge/Live_Demo-openbloom.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen.svg?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"></a>
  <img src="https://img.shields.io/badge/Platform-Web%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux-orange?style=for-the-badge" alt="Cross-Platform">
</p>

---

> [!IMPORTANT]
> 🚀 **Live Web Version:** Try OpenBloom right now in your browser without installing anything:  
> **👉 [https://openbloom.vercel.app](https://openbloom.vercel.app/)**

---

## 💡 Why OpenBloom?

A Bloomberg Terminal costs **over \$24,000 per user each year**, locking students, independent traders, researchers, and small funds out of institutional-quality tools.

**OpenBloom democratizes market research.** Built with pure Node.js and modern web standards:
- **\$0 Forever:** 100% free and open-source under the Apache 2.0 license.
- **Zero API Keys & Zero Accounts:** Every metric is fetched on-the-fly from free, public financial sources.
- **Runs Everywhere:** Run it locally for unlimited privacy, or open the web deployment from anywhere.
- **Four-Panel Layout:** Monitor equities, derivatives, macro curves, and news simultaneously just like a professional trading desk.
- **No Heavy Dependencies:** No bloated runtime, no Docker requirement, no compilation step.

```text
+-----------------------------------+-----------------------------------+
|  PANEL 1: WORLD INDICES (WEI)     |  PANEL 2: TOP NEWS (TOP)          |
|  SPX 5,980.20  +0.45%             |  * Fed Signals Measured Rate Path |
|  NDX 21,120.50 +0.62%             |  * Semis Lead Global Tech Rebound |
+-----------------------------------+-----------------------------------+
|  PANEL 3: FED RATE PATH (WIRP)    |  PANEL 4: ECONOMIC CALENDAR (ECO) |
|  Next FOMC: 25 bps cut (86.2%)    |  US CPI YoY: 2.4% (Cons: 2.5%)    |
|  Year-End Implied: 3.85%          |  Nonfarm Payrolls: 195k           |
+-----------------------------------+-----------------------------------+
```

---

## ⚡ Quick Start

### Option 1: Instant Cloud Demo
Open **[https://openbloom.vercel.app](https://openbloom.vercel.app/)** in your browser.

### Option 2: Run Locally (Recommended for Fast Local Feeds)

Prerequisite: [Node.js 18 or newer](https://nodejs.org).

```bash
# Clone the repository
git clone https://github.com/akshayjadhav237237-cmd/openbloom.git
cd openbloom

# Verify data sources and run offline tests
node scripts/check.js

# Launch the terminal (starts background server and opens browser)
node scripts/launch.js
```

> **Quick Launch:** Next time, simply double-click `start.bat` on Windows or `start.command` on macOS.  
> To stop the terminal at any time, run: `node scripts/stop.js`

---

## 🖥️ How It Works

Type a **ticker** followed by a **function code** and press **Enter** (or click **GO**):

| Command Example | What You Get |
|---|---|
| `AAPL DES` | Complete company profile, valuation, and executive info |
| `NVDA OMON` | Full real-time options chain with IV, Greeks, and implied move |
| `SPX INDEX GP` | S&P 500 candlestick chart with technical indicators |
| `CL1 COMDTY GP` | Front-month WTI Crude Oil futures chart |
| `EURUSD CURNCY GP` | EUR/USD currency cross chart |
| `BTC GP` | Bitcoin live candlestick chart |
| `WIRP` | Fed rate probability path priced from fed funds futures |
| `GC` | US Treasury yield curve across all tenors |
| `TOP` | Consolidated multi-source market news feed |
| `SPY BTST` | Run a strategy backtest with institutional quant checks |

### Navigation Shortcuts
- `Ctrl` / `Cmd` + `1` to `4`: Switch active panel
- `LAYOUT 1` / `LAYOUT 2` / `LAYOUT 4`: Toggle between 1, 2, or 4 panels
- `Esc`: Go back to the previous function in the current panel
- `HELP`: Interactive manual showing every function code
- `DATA`: Source attribution and data freshness monitor

---

## 📊 Comprehensive Function Library

### 📈 Equities & Company Intelligence
- **`DES`** — Company description, key financials, P/E, beta, market cap, and sector info
- **`BQ`** — Detailed stock quote including pre-market & after-hours prints, bid/ask spread
- **`FA`** — Fundamental analysis: multi-period Income Statement, Balance Sheet, Cash Flow
- **`CF`** — Company SEC filings viewer (10-K, 10-Q, 8-K, Form 4)
- **`INSD`** — Real-time insider buying and selling transactions
- **`HDS`** — Institutional and fund ownership breakdowns
- **`ERN`** — Earnings calendar, historical surprises, and analyst estimates
- **`MOST`** — Most active volume, top gainers, and top losers

### ⚡ Options & Volatility Analytics
- **`OMON`** — Options chain: calls/puts, bid/ask, implied volatility, Delta, Gamma, Theta, Vega, Open Interest, and expiry-implied expected moves
- **`GEX`** — Gamma Exposure surface: Net GEX by strike, call resistance walls, put support walls, and the Gamma Flip line
- **`OVDV`** — Volatility surface and term structure across expiries

### 🏛️ Macro, Fixed Income & Policy
- **`WIRP`** — World Interest Rate Probabilities: Fed rate path implied by Fed Funds futures
- **`GC`** — Treasury yield curve comparison across tenors (1M to 30Y)
- **`BTMM`** — Money markets: SOFR, EFFR, Treasury Bills, and repo rates
- **`CBRT`** — Central bank policy rates tracker (Fed, ECB, BOJ, BOE, SNB, and more)
- **`ECO`** — Global economic release calendar with actual vs. consensus figures
- **`ECST`** — Macroeconomic time series (CPI, Unemployment, Payrolls, GDP)
- **`COT`** — CFTC Commitments of Traders institutional positioning reports

### 🌐 Global Markets, FX & Crypto
- **`WEI`** — World Equity Indices monitor across Americas, EMEA, and Asia-Pacific
- **`GLCO`** — Global Commodities: Energy, Precious Metals, Industrial Metals, Agriculture
- **`FXC`** — Foreign exchange matrix with real-time cross-rates
- **`CRYPTO`** — Cryptocurrency dashboard streaming from major exchanges

### 🧪 Technical Analysis & Quant Backtester
- **`GP` / `GIP` / `HP`** — Candlestick charts, intraday bars, and historical tables powered by TradingView Lightweight Charts™
- **`BTST`** — Interactive strategy backtester:
  - Backtest MA crossovers, RSI mean-reversion, Bollinger breakouts, Supertrend, MACD, and VWAP
  - Realistic trade execution modeling (next-bar open, bid/ask spread slippage)
  - Quant checks: Sharpe Ratio, Sortino Ratio, Maximum Drawdown, Win Rate, Profit Factor, and trade-by-trade CSV export

---

## 🔌 Developer Integration (Python, Excel & REST API)

OpenBloom includes a built-in REST API replicating Bloomberg's famous `BDP` (snapshot) and `BDH` (historical) endpoints:

```text
# Historical daily/weekly/monthly bars (CSV or JSON)
http://localhost:3787/api/bdh?security=AAPL%20US%20EQUITY&fields=PX_OPEN,PX_HIGH,PX_LOW,PX_LAST,PX_VOLUME&per=D&format=csv

# Current point-in-time security snapshot
http://localhost:3787/api/bdp?securities=AAPL%20US%20EQUITY,SPX%20INDEX&fields=NAME,PX_LAST,CHG_PCT_1D,PE_RATIO&format=csv
```

### Python Integration
```python
import pandas as pd

# Load historical daily bars directly into pandas
url = "http://localhost:3787/api/bdh?security=NVDA%20US%20EQUITY&fields=PX_LAST,PX_VOLUME&format=csv"
df = pd.read_csv(url, parse_dates=["date"], index_col="date")
print(df.tail())
```

### Excel Integration
1. Open Excel -> **Data** -> **From Web**
2. Paste any OpenBloom API URL with `&format=csv`
3. Click **Load** — your spreadsheet updates with live data every time you click **Refresh All**.

---

## 🤖 AI Agent Integration (MCP)

OpenBloom includes a native Model Context Protocol (MCP) server, allowing AI coding assistants (Claude Code, Claude Desktop, Cursor) to directly query financial screens:

```bash
claude mcp add --scope user openbloom -- node /full/path/to/openbloom/scripts/mcp.js
```

Ask your AI assistant questions like:
- *"What does the futures market price for the next Fed meeting?"*
- *"Show me NVDA's options skew and implied volatility for next week's earnings."*
- *"Backtest an RSI 30/70 mean-reversion strategy on SPY over the last 3 years."*

---

## 🛠️ Adding Custom Screens

Creating a new screen takes two small files:
1. **Backend Route (`lib/fn/<name>.js`):** Fetches the data and exports `default async function (query)`.
2. **Frontend UI (`public/js/fn/<name>.js`):** Renders the screen using built-in table and chart helpers.

---

## ⚖️ License & Attribution

- **License:** Distributed under the **[Apache License 2.0](LICENSE)**.
- **Author:** Akshay Jadhav.
- **Charts:** Rendered using [TradingView Lightweight Charts™](https://www.tradingview.com/) (Copyright TradingView, Inc., Apache 2.0).
- **Disclaimer:** OpenBloom is an independent educational open-source project built exclusively from publicly accessible data feeds. It is **not** affiliated with, endorsed by, or connected to Bloomberg L.P.

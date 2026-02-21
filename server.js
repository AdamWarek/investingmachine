const express = require('express');
const cors = require('cors');
const path = require('path');
const { execSync } = require('child_process');
// fetch is native in Node 22
require('dotenv').config();
const { getPortfolio, savePortfolio } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve allowed static files

// --- Trading Logic ---

let marketData = { us: [], pl: [], crypto: [] };
let lastFetch = 0;

// Helper to generate history for charts (Fallback/Mock)
const generateHistory = (currentPrice) => {
    const dates = [];
    const prices = [];
    const opens = [];
    const highs = [];
    const lows = [];
    const volumes = [];
    let p = currentPrice;
    const now = new Date();
    for (let i = 0; i <= 60; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.unshift(date.toLocaleDateString());

        const change = (Math.random() - 0.5) * 0.04;
        const open = p;
        const close = p / (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.floor(Math.random() * 1000000) + 500000;

        prices.unshift(close);
        opens.unshift(open);
        highs.unshift(high);
        lows.unshift(low);
        volumes.unshift(volume);

        p = close; // walk back
    }
    prices[prices.length - 1] = currentPrice;
    return { dates, prices, opens, highs, lows, volumes, lastUpdate: new Date().toISOString() };
};

// Real Data Fetcher (Yahoo Finance direct)
const fetchYahooHistory = async (symbol, interval = '1d', range = '3mo') => {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        const result = data.chart.result[0];
        const quote = result.indicators.quote[0];
        const timestamps = result.timestamp;

        if (!timestamps || !quote) throw new Error("Invalid Yahoo Data Structure");

        const cleanData = {
            dates: [], prices: [], opens: [], highs: [], lows: [], volumes: []
        };

        for (let i = 0; i < timestamps.length; i++) {
            if (quote.close[i] === null) continue;
            const date = new Date(timestamps[i] * 1000);
            cleanData.dates.push(date.toLocaleDateString());
            cleanData.prices.push(quote.close[i]);
            cleanData.opens.push(quote.open[i]);
            cleanData.highs.push(quote.high[i]);
            cleanData.lows.push(quote.low[i]);
            cleanData.volumes.push(quote.volume[i]);
            cleanData.lastUpdate = date.toISOString();
        }
        return cleanData;
    } catch (e) {
        console.error(`Failed to fetch history for ${symbol}:`, e.message);
        return null; // Signals to use fallback
    }
};

const fetchCrypto = async () => {
    const symbols = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD'];
    const results = [];
    for (const symbol of symbols) {
        const history = await fetchYahooHistory(symbol);
        const displaySymbol = symbol.replace('-USD', '');
        if (history && history.prices.length > 0) {
            const lastPrice = history.prices[history.prices.length - 1];
            const prevPrice = history.prices[history.prices.length - 2] || lastPrice;
            const change = ((lastPrice - prevPrice) / prevPrice) * 100;
            results.push({ symbol: displaySymbol, name: displaySymbol, price: lastPrice, change: change, lastUpdate: history.lastUpdate, ...history });
        } else {
            results.push({ symbol: displaySymbol, price: 0, change: 0, name: symbol, ...generateHistory(1000) });
        }
    }
    return results;
};

const fetchUSStocks = async () => {
    const symbols = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD'];
    const results = [];
    for (const symbol of symbols) {
        const history = await fetchYahooHistory(symbol);
        if (history && history.prices.length > 0) {
            const lastPrice = history.prices[history.prices.length - 1];
            const prevPrice = history.prices[history.prices.length - 2] || lastPrice;
            const change = ((lastPrice - prevPrice) / prevPrice) * 100;
            results.push({ symbol, name: symbol, price: lastPrice, change: change, lastUpdate: history.lastUpdate, ...history });
        } else {
            results.push({ symbol, price: 0, change: 0, name: symbol, ...generateHistory(100) });
        }
    }
    return results;
};

const fetchPLStocks = async () => {
    const symbols = ['PKO.WA', 'KGH.WA', 'CDR.WA', 'ALE.WA', 'PZU.WA', 'DIN.WA'];
    const results = [];
    for (const symbol of symbols) {
        const history = await fetchYahooHistory(symbol);
        const shortSymbol = symbol.replace('.WA', '');
        if (history && history.prices.length > 0) {
            const lastPrice = history.prices[history.prices.length - 1];
            const prevPrice = history.prices[history.prices.length - 2] || lastPrice;
            const change = ((lastPrice - prevPrice) / prevPrice) * 100;
            results.push({ symbol: shortSymbol, name: symbol, price: lastPrice, change: change, lastUpdate: history.lastUpdate, ...history });
        } else {
            results.push({ symbol: shortSymbol, price: 0, change: 0, name: symbol, ...generateHistory(50) });
        }
    }
    return results;
};

async function fetchMarketData() {
    console.log("Fetching market data update...");
    if (marketData.us.length === 0) {
        marketData.us = [{ symbol: 'AAPL', price: 173.50, change: 1.24, name: 'Apple Inc. (Loading)', ...generateHistory(173.50) }];
    }
    try {
        const [cryptoData, usData, plData] = await Promise.all([
            fetchCrypto(),
            fetchUSStocks(),
            fetchPLStocks()
        ]);
        marketData = { us: usData, pl: plData, crypto: cryptoData };
        lastFetch = Date.now();
        console.log("✅ Market Data Updated");
    } catch (e) {
        console.error("Critical Error in fetchMarketData:", e.message);
    }
    return marketData;
}

// --- Technical Indicators ---
const calcSMA = (data, period) => {
    if (data.length < period) return null;
    const sum = data.slice(data.length - period).reduce((a, b) => a + b, 0);
    return sum / period;
};

const calcStdDev = (data, period, sma) => {
    if (data.length < period) return 0;
    const slice = data.slice(data.length - period);
    const mean = sma || calcSMA(data, period);
    const sqDiffs = slice.map(v => Math.pow(v - mean, 2));
    const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / period;
    return Math.sqrt(avgSqDiff);
};

const calcBollingerBands = (prices, period = 20, multiplier = 2) => {
    const sma = calcSMA(prices, period);
    if (!sma) return null;
    const stdDev = calcStdDev(prices, period, sma);
    return {
        middle: sma,
        upper: sma + (stdDev * multiplier),
        lower: sma - (stdDev * multiplier)
    };
};

const calcEMA = (prices, period) => {
    if (prices.length < period) return null;
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] * k) + (ema * (1 - k));
    }
    return ema;
};

const calcRSI = (closes, period = 14) => {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

const calcMACD = (closes) => {
    if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
    const ema12 = [];
    const ema26 = [];
    const macdLine = [];
    let k12 = 2 / (12 + 1);
    let e12 = closes.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
    for (let i = 12; i < closes.length; i++) {
        e12 = (closes[i] * k12) + (e12 * (1 - k12));
        ema12[i] = e12;
    }
    let k26 = 2 / (26 + 1);
    let e26 = closes.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
    for (let i = 26; i < closes.length; i++) {
        e26 = (closes[i] * k26) + (e26 * (1 - k26));
        ema26[i] = e26;
    }
    for (let i = 26; i < closes.length; i++) {
        macdLine.push((ema12[i] || 0) - (ema26[i] || 0));
    }
    if (macdLine.length < 9) return { macd: 0, signal: 0, histogram: 0 };
    const k9 = 2 / (9 + 1);
    let signal = macdLine.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
    for (let i = 9; i < macdLine.length; i++) {
        signal = (macdLine[i] * k9) + (signal * (1 - k9));
    }
    const currentMacd = macdLine[macdLine.length - 1];
    return {
        macd: currentMacd,
        signal: signal,
        histogram: currentMacd - signal,
        prevMacd: macdLine[macdLine.length - 2],
        prevSignal: signal
    };
};

const calcADX = (highs, lows, closes, period = 14) => {
    if (highs.length < period * 2) return 20;
    const trs = [];
    const dmPlus = [];
    const dmMinus = [];

    for (let i = 1; i < highs.length; i++) {
        const up = highs[i] - highs[i - 1];
        const down = lows[i - 1] - lows[i];
        dmPlus.push((up > down && up > 0) ? up : 0);
        dmMinus.push((down > up && down > 0) ? down : 0);
        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
        trs.push(tr);
    }
    let smTR = trs.slice(0, period).reduce((a, b) => a + b, 0);
    let smDMPlus = dmPlus.slice(0, period).reduce((a, b) => a + b, 0);
    let smDMMinus = dmMinus.slice(0, period).reduce((a, b) => a + b, 0);
    const dxs = [];

    for (let i = period; i < trs.length; i++) {
        smTR = smTR - (smTR / period) + trs[i];
        smDMPlus = smDMPlus - (smDMPlus / period) + dmPlus[i];
        smDMMinus = smDMMinus - (smDMMinus / period) + dmMinus[i];
        const diPlus = smTR === 0 ? 0 : (smDMPlus / smTR) * 100;
        const diMinus = smTR === 0 ? 0 : (smDMMinus / smTR) * 100;
        const sumDi = diPlus + diMinus;
        const dx = sumDi === 0 ? 0 : (Math.abs(diPlus - diMinus) / sumDi) * 100;
        dxs.push(dx);
    }

    if (dxs.length < period) return dxs[dxs.length - 1] || 20;
    let adx = dxs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxs.length; i++) {
        adx = ((adx * (period - 1)) + dxs[i]) / period;
    }
    return adx;
};

const calculateScore = (asset) => {
    const prices = asset.prices;
    const volumes = asset.volumes;
    const highs = asset.highs;
    const lows = asset.lows;
    const opens = asset.opens;

    if (!prices || prices.length < 30) return { score: 0, reasons: [] };

    let score = 0;
    const reasons = [];

    const rsi = calcRSI(prices, 14);
    if (rsi >= 40 && rsi <= 60) {
        score += 20;
        reasons.push("RSI Neutral (40-60)");
    } else if (rsi < 30) {
        score += 20;
        reasons.push("RSI Oversold (<30)");
    } else if (rsi > 75) {
        score -= 15;
        reasons.push("RSI Overbought (>75)");
    }

    const macdData = calcMACD(prices);
    if (macdData.histogram > 0) {
        score += 20;
        reasons.push("MACD Bullish");
    }

    const currentVol = volumes[volumes.length - 1];
    const avgVol = volumes.slice(Math.max(0, volumes.length - 21), volumes.length - 1).reduce((a, b) => a + b, 0) / 20;
    if (currentVol > 1.5 * avgVol) {
        score += 15;
        reasons.push("Volume Spike (>1.5x Avg)");
    }

    const bb = calcBollingerBands(prices, 20, 2);
    const currentPrice = prices[prices.length - 1];
    if (bb) {
        if (currentPrice <= bb.lower * 1.02) {
            score += 15;
            reasons.push("Near Lower BB (Dip)");
        } else if (currentPrice >= bb.upper * 0.98) {
            score -= 10;
            reasons.push("Near Upper BB");
        }
    }

    const ema20 = calcEMA(prices, 20);
    if (ema20 && currentPrice > ema20) {
        score += 10;
        reasons.push("Price > EMA(20)");
    }

    const adx = calcADX(highs, lows, prices, 14);
    if (adx > 25) {
        score += 10;
        reasons.push(`ADX Strong Trend (${adx.toFixed(1)})`);
    }

    return { score: Math.max(0, Math.min(100, score)), reasons };
};

// --- Bot Execution Logic ---
const executeTrade = async (asset, mode, qty, reason) => {
    try {
        const portfolio = await getPortfolio();
        const price = asset.price;
        const totalCost = price * qty;

        if (mode === 'BUY') {
            if (portfolio.cash < totalCost) return;

            portfolio.cash -= totalCost;
            const pos = portfolio.positions.find(p => p.symbol === asset.symbol);
            if (pos) {
                pos.avgPrice = ((pos.avgPrice * pos.qty) + totalCost) / (pos.qty + qty);
                pos.qty += qty;
            } else {
                portfolio.positions.push({ symbol: asset.symbol, qty, avgPrice: price });
            }
            portfolio.history.push({ date: new Date(), type: 'BUY', symbol: asset.symbol, qty, price, reason });
            botLogger(`ROBOT: Bought ${asset.symbol} - ${reason}`);

        } else {
            const pos = portfolio.positions.find(p => p.symbol === asset.symbol);
            if (!pos || pos.qty < qty) return;

            portfolio.cash += totalCost;
            if (pos.qty === qty) {
                portfolio.positions = portfolio.positions.filter(p => p.symbol !== asset.symbol);
            } else {
                pos.qty -= qty;
            }
            portfolio.history.push({ date: new Date(), type: 'SELL', symbol: asset.symbol, qty, price, reason });
            botLogger(`ROBOT: Sold ${asset.symbol} - ${reason}`);
        }

        // Recalc Equity
        let equity = portfolio.cash;
        portfolio.positions.forEach(p => {
            const allAssets = [...marketData.us, ...marketData.pl, ...marketData.crypto];
            const liveAsset = allAssets.find(a => a.symbol === p.symbol);
            const currentPrice = liveAsset ? liveAsset.price : p.avgPrice;
            equity += (p.qty * currentPrice);
        });
        portfolio.equity = equity;

        await savePortfolio(portfolio);
    } catch (e) {
        console.error("Bot failed to execute trade:", e);
    }
};

let botIntervalId = null;
let botConfig = {
    enabled: false,
    interval: 60, // seconds
    posSizePct: 10,
    slPct: 3,
    tpPct: 5,
    buyScore: 60
};

// --- Bot Live Logging ---
const botLogs = [];
const MAX_BOT_LOGS = 100;
const botLogger = (message) => {
    botLogs.push({ time: Date.now(), msg: message });
    if (botLogs.length > MAX_BOT_LOGS) {
        botLogs.shift();
    }
    console.log(message);
};

const runAutoTrading = async () => {
    if (!botConfig.enabled) return;
    botLogger("ROBOT: Running trading cycle...");

    const portfolio = await getPortfolio();
    const allAssets = [...marketData.us, ...marketData.pl, ...marketData.crypto];
    botLogger(`ROBOT: Checking ${allAssets.length} assets against ${portfolio.positions.length} open positions.`);

    // 1. AUTO-SELL CHECKS
    for (const pos of portfolio.positions) {
        const asset = allAssets.find(a => a.symbol === pos.symbol);
        if (!asset) continue;

        const pnlPct = (asset.price - pos.avgPrice) / pos.avgPrice;
        let sellReason = null;

        if (pnlPct <= -(botConfig.slPct / 100)) sellReason = `Stop Loss Hit (${(pnlPct * 100).toFixed(2)}%)`;
        else if (pnlPct >= (botConfig.tpPct / 100)) sellReason = `Take Profit Hit (+${(pnlPct * 100).toFixed(2)}%)`;

        const rsi = calcRSI(asset.prices);
        if (!sellReason && rsi > 75) sellReason = `RSI Overbought (${rsi.toFixed(0)})`;

        const macd = calcMACD(asset.prices);
        if (!sellReason && macd.histogram < 0 && macd.prevMacd > macd.prevSignal) sellReason = "MACD Death Cross";

        if (sellReason) {
            await executeTrade(asset, 'SELL', pos.qty, sellReason);
        }
    }

    // Refresh portfolio after possible sells to get accurate cash
    const updatedPortfolio = await getPortfolio();

    // 2. AUTO-BUY CHECKS
    const scored = allAssets.map(a => ({ asset: a, ...calculateScore(a) }));
    const candidates = scored.filter(s => s.score >= botConfig.buyScore);
    candidates.sort((a, b) => b.score - a.score);
    botLogger(`ROBOT: Found ${candidates.length} buy candidates with score >= ${botConfig.buyScore}.`);

    let availableCash = updatedPortfolio.cash;
    botLogger(`ROBOT: Available cash: $${availableCash.toFixed(2)}`);

    if (candidates.length > 0 && availableCash > 500) {
        const best = candidates[0];
        botLogger(`ROBOT: Top candidate is ${best.asset.symbol} with score ${best.score}. Currently held: ${!!updatedPortfolio.positions.find(p => p.symbol === best.asset.symbol)}`);

        const sizeAmt = updatedPortfolio.equity * (botConfig.posSizePct / 100);
        const qty = Math.floor(sizeAmt / best.asset.price);

        if (qty > 0 && availableCash > (qty * best.asset.price)) {
            await executeTrade(best.asset, 'BUY', qty, `Score: ${best.score} (${best.reasons.join(', ')})`);
        } else {
            botLogger(`ROBOT: Wanted to buy ${best.asset.symbol} but couldn't afford calculated qty ${qty}.`);
        }
    }
};

const updateBotTimer = () => {
    if (botIntervalId) clearInterval(botIntervalId);
    if (botConfig.enabled) {
        botIntervalId = setInterval(runAutoTrading, botConfig.interval * 1000);
        runAutoTrading(); // Run immediately on toggle
    }
};

// API routes for Bot Control
app.get('/api/bot/config', (req, res) => {
    res.json(botConfig);
});

app.get('/api/bot/logs', (req, res) => {
    res.json(botLogs);
});

app.post('/api/bot/toggle', (req, res) => {
    botConfig.enabled = !botConfig.enabled;
    console.log(`🤖 Bot Toggled. Enabled: ${botConfig.enabled}`);
    updateBotTimer();
    res.json(botConfig);
});

app.post('/api/bot/config', (req, res) => {
    botConfig = { ...botConfig, ...req.body };
    console.log(`⚙️ Bot Config Updated:`, botConfig);
    updateBotTimer();
    res.json(botConfig);
});

// Initial Fetch for testing and then poll every 15 minutes to save API hits
fetchMarketData();
setInterval(fetchMarketData, 15 * 60 * 1000);

// --- API ---

app.get('/api/history/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    const interval = req.query.interval || '1d';
    const range = req.query.range || '3mo';

    try {
        const history = await fetchYahooHistory(symbol, interval, range);
        if (history) {
            res.json(history);
        } else {
            res.status(500).json({ error: "Failed to fetch history" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/market-data', (req, res) => {
    res.json(marketData);
});

app.get('/api/status', async (req, res) => {
    const portfolio = await getPortfolio();
    res.json({
        marketData,
        portfolio,
        serverTime: new Date()
    });
});

app.get('/api/portfolio', async (req, res) => {
    try {
        const portfolio = await getPortfolio();
        res.json(portfolio);
    } catch (err) {
        res.status(500).json({ error: "Failed to get portfolio" });
    }
});

app.post('/api/portfolio', async (req, res) => {
    try {
        const newPortfolio = req.body;
        await savePortfolio(newPortfolio);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to save portfolio" });
    }
});

app.post('/api/trade', async (req, res) => {
    const { symbol, type, qty, price } = req.body;
    const portfolio = await getPortfolio();
    const totalCost = price * qty;

    if (type === 'BUY') {
        if (portfolio.cash < totalCost) return res.status(400).json({ error: "Insufficient Funds" });

        portfolio.cash -= totalCost;
        const pos = portfolio.positions.find(p => p.symbol === symbol);
        if (pos) {
            pos.qty += qty;
            pos.avgPrice = ((pos.avgPrice * pos.qty) + totalCost) / (pos.qty + qty);
        } else {
            portfolio.positions.push({ symbol, qty, avgPrice: price });
        }
        portfolio.history.push({ date: new Date(), type: 'BUY', symbol, qty, price, reason: 'Manual Trade' });
    } else {
        const pos = portfolio.positions.find(p => p.symbol === symbol);
        if (!pos || pos.qty < qty) return res.status(400).json({ error: "Insufficient Holdings" });

        portfolio.cash += totalCost;
        if (pos.qty === qty) {
            portfolio.positions = portfolio.positions.filter(p => p.symbol !== symbol);
        } else {
            pos.qty -= qty;
        }
        portfolio.history.push({ date: new Date(), type: 'SELL', symbol, qty, price, reason: 'Manual Trade' });
    }

    // Recalc Equity
    let equity = portfolio.cash;
    portfolio.positions.forEach(pos => {
        let current = pos.avgPrice;
        // In a real app we'd use live price not avg, but for now...
        equity += (pos.qty * current);
    });
    portfolio.equity = equity;

    await savePortfolio(portfolio);
    res.json({ success: true, portfolio });
});

app.get('/ping', (req, res) => {
    console.log("Ping received (Keep-Alive)");
    res.send('pong');
});

// App Version (Git Hash)
let appVersion = 'unknown';
try {
    appVersion = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
    console.error("Failed to get git version:", e.message);
}

app.get('/api/version', (req, res) => {
    res.json({ version: appVersion });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`- Dashboard: http://localhost:${PORT}/index.html`);
});

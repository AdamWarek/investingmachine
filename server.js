const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();
const { getPortfolio, savePortfolio } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve allowed static files

// --- Trading Logic ---

let marketData = { us: [], pl: [], crypto: [] };
let lastFetch = 0;

// Helper to generate history for charts (simulated for now)
const generateHistory = (currentPrice) => {
    const dates = [];
    const prices = [];
    let p = currentPrice;
    const now = new Date();
    for (let i = 0; i <= 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.unshift(date.toISOString().split('T')[0]);
        prices.unshift(p);
        p = p / (1 + (Math.random() - 0.5) * 0.05);
    }
    return { dates, prices };
};

const fetchCrypto = async () => {
    const mockData = [
        { symbol: 'BTC', price: 64230, change: 2.4, name: 'Bitcoin (Fallback)', ...generateHistory(64230) },
        { symbol: 'ETH', price: 3450, change: -1.2, name: 'Ethereum (Fallback)', ...generateHistory(3450) },
        { symbol: 'SOL', price: 145.00, change: 5.4, name: 'Solana (Fallback)', ...generateHistory(145.00) }
    ];

    try {
        // Simple timeout to avoid hanging
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple&order=market_cap_desc&per_page=5&page=1&sparkline=false', { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`CoinGecko status: ${res.status}`);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) throw new Error("Empty Crypto Data");

        return data.map(coin => ({
            symbol: coin.symbol.toUpperCase(),
            price: coin.current_price,
            change: coin.price_change_percentage_24h,
            name: coin.name,
            ...generateHistory(coin.current_price)
        }));
    } catch (err) {
        console.warn("Crypto fetch failed:", err.message);
        return mockData;
    }
};

const fetchUSStocks = async () => {
    const apiKey = process.env.AV_API_KEY;
    const mockData = [
        { symbol: 'AAPL', price: 173.50, change: 1.24, name: 'Apple Inc. (Mock)', ...generateHistory(173.50) },
        { symbol: 'NVDA', price: 885.20, change: 3.50, name: 'NVIDIA Corp. (Mock)', ...generateHistory(885.20) },
        { symbol: 'MSFT', price: 420.00, change: 0.80, name: 'Microsoft (Mock)', ...generateHistory(420.00) }
    ];

    if (!apiKey || apiKey === 'YOUR_ALPHA_VANTAGE_KEY') return mockData;

    try {
        const symbol = 'AAPL';
        const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`);
        const data = await res.json();
        const quote = data['Global Quote'];

        if (quote && quote['05. price']) {
            return [{
                symbol: symbol,
                price: parseFloat(quote['05. price']),
                change: parseFloat(quote['10. change percent'].replace('%', '')),
                name: 'Apple Inc.',
                ...generateHistory(parseFloat(quote['05. price']))
            }];
        }
        console.warn("AV Quote Empty or Warning:", data);
        return mockData; // Fallback on empty API response
    } catch (err) {
        console.warn("AV fetch failed:", err.message);
        return mockData; // Fallback on network error
    }
};

async function fetchMarketData() {
    console.log("Fetching market data...");

    // Initial data if empty (Fail-safe)
    if (marketData.us.length === 0) {
        marketData.us = [
            { symbol: 'AAPL', price: 173.50, change: 1.24, name: 'Apple Inc. (Loading)', ...generateHistory(173.50) }
        ];
    }

    try {
        const [cryptoData, usData] = await Promise.all([
            fetchCrypto(),
            fetchUSStocks()
        ]);

        const plData = [
            { symbol: 'PKO', price: 45.20, change: 1.10, name: 'PKO BP', ...generateHistory(45.20) },
            { symbol: 'CDR', price: 115.00, change: 0.50, name: 'CD Projekt', ...generateHistory(115.00) },
            { symbol: 'XTB', price: 65.00, change: 2.10, name: 'XTB S.A.', ...generateHistory(65.00) }
        ];

        marketData = { us: usData, pl: plData, crypto: cryptoData };
        lastFetch = Date.now();
        console.log("Market Data Updated Successfully");
    } catch (e) {
        console.error("Critical Error in fetchMarketData:", e);
    }
    return marketData;
}

// --- Auto Trading Bot ---
// Runs every 5 minutes to be safe with rate limits on free tiers
setInterval(async () => {
    console.log("🤖 Bot Loop: Checking markets...");
    await fetchMarketData();

    const portfolio = await getPortfolio();
    const btc = marketData.crypto.find(c => c.symbol === 'BTC');

    // Simple Strategy Example: Buy BTC if < 60000
    if (btc && btc.price < 60000 && portfolio.cash > btc.price) {
        console.log(`💡 BUY SIGNAL: BTC at ${btc.price}`);
        portfolio.cash -= btc.price;

        const pos = portfolio.positions.find(p => p.symbol === 'BTC');
        if (pos) {
            pos.qty += 1;
            pos.avgPrice = ((pos.avgPrice * pos.qty) + btc.price) / (pos.qty + 1);
        } else {
            portfolio.positions.push({ symbol: 'BTC', qty: 1, avgPrice: btc.price });
        }

        portfolio.history.push({
            date: new Date(), type: 'BUY', symbol: 'BTC', qty: 1, price: btc.price, reason: 'Auto-Buy (< 60k)'
        });
        await savePortfolio(portfolio);
    }

    // Calculate Equity
    let equity = portfolio.cash;
    portfolio.positions.forEach(pos => {
        let current = pos.avgPrice;
        const all = [...marketData.us, ...marketData.crypto, ...marketData.pl];
        const match = all.find(m => m.symbol === pos.symbol);
        if (match) current = match.price;
        equity += (pos.qty * current);
    });
    portfolio.equity = equity;

    await savePortfolio(portfolio);

}, 5 * 60 * 1000); // Every 5 minutes

// Initial Fetch
fetchMarketData();

// --- API ---

app.get('/api/status', async (req, res) => {
    const portfolio = await getPortfolio();
    res.json({
        marketData,
        portfolio,
        serverTime: new Date()
    });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`- Dashboard: http://localhost:${PORT}/index.html`);
});

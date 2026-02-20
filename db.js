const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Fallback to in-memory if no Supabase credentials
let supabase = null;
if (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL') {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Connected to Supabase.");
} else {
    console.warn("WARNING: Supabase credentials missing. Using in-memory storage (data will assume lost on restart).");
}

let memoryStore = {
    portfolio: { cash: 100000, positions: [], equity: 100000 },
    history: [],
    marketData: {}
};

async function getPortfolio() {
    if (!supabase) return memoryStore.portfolio;
    try {
        const { data, error } = await supabase
            .from('portfolios')
            .select('*')
            .single(); // Assuming single user for now

        if (error) {
            // If no row exists, create default
            if (error.code === 'PGRST116') {
                await savePortfolio(memoryStore.portfolio);
                return memoryStore.portfolio;
            }
            console.error("Supabase Error (getPortfolio):", error);
            return memoryStore.portfolio;
        }
        return data.data; // We store JSON in a 'data' column
    } catch (err) {
        console.error("DB Error:", err);
        return memoryStore.portfolio;
    }
}

async function savePortfolio(portfolio) {
    if (!supabase) {
        memoryStore.portfolio = portfolio;
        return;
    }
    try {
        // Upsert based on ID 1 (single user app)
        const { error } = await supabase
            .from('portfolios')
            .upsert({ id: 1, data: portfolio });

        if (error) console.error("Supabase Error (savePortfolio):", error);
    } catch (err) {
        console.error("DB Error:", err);
    }
}

async function getMarketData() {
    if (!supabase) return memoryStore.marketData;
    // ... Implement similar caching logic or just return empty to force fetch
    // For simplicity, we might just keep market data in memory since it's transient
    return memoryStore.marketData;
}

// History is part of portfolio JSON in this simple version, 
// but in a real app would be a separate table. 
// We'll stick to the JSON blob approach for "Beginner Vibe" simplicity.

module.exports = {
    getPortfolio,
    savePortfolio,
    getMarketData
};

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkRows() {
    const { data, error } = await supabase.from('portfolios').select('*');
    console.log("Error:", error);
    console.log("Data length:", data ? data.length : 0);
    console.log("Data:", JSON.stringify(data, null, 2));

    const { data: singleData, error: singleError } = await supabase.from('portfolios').select('*').single();
    console.log("Single Error:", singleError);
}
checkRows();

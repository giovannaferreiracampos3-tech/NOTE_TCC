const { createClient } = require('@supabase/supabase-js');

// Aqui o código puxa exatamente os nomes que você colocou no .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
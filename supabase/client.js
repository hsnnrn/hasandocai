const { createClient } = require('@supabase/supabase-js');

function supabaseClientFromEnv() {
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Supabase URL or KEY not set in env');
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

module.exports = { supabaseClientFromEnv };


import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPolicies() {
    console.log("Attempting to list policies (may fail if not authorized)...");
    // This usually requires admin keys or being an owner, but let's try.
    const { data, error } = await supabase.rpc('get_policies'); // unlikely to exist
    if (error) {
        console.log("RPC get_policies failed (expected).");
    }

    // Try to see if we can see rows in self_reviews again
    const { data: rows, error: err } = await supabase.from('self_reviews').select('id');
    console.log("Self reviews found:", rows?.length);
    if (err) console.error("Error fetching self_reviews:", err);
}

checkPolicies();

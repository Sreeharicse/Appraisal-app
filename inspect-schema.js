
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
    console.log("Inspecting self_reviews table...");
    // We can't query information_schema directly via PostgREST unless it's exposed.
    // But we can try to do a dry-run insert or something.
    
    // Let's try to fetch one row and see the columns
    const { data, error } = await supabase.from('self_reviews').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Sample row:", data[0]);
    }
}

inspectSchema();


import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
    console.log("Inspecting evaluations table...");
    const { data: evalData, error: evalError } = await supabase.from('evaluations').select('*').limit(1);
    if (evalError) {
        console.error("Eval Error:", evalError);
    } else {
        console.log("Eval Sample row:", evalData[0]);
    }
}

inspectSchema();

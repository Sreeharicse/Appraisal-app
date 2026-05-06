
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
    console.log("Fetching a cycle and a profile...");
    const { data: cycles } = await supabase.from('cycles').select('id').limit(1);
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);

    if (!cycles || !profiles || cycles.length === 0 || profiles.length === 0) {
        console.error("Not enough data to test.");
        return;
    }

    const cycleId = cycles[0].id;
    const profileId = profiles[0].id;

    console.log(`Attempting insert for Cycle: ${cycleId}, Profile: ${profileId}`);
    
    const payload = {
        cycle_id: cycleId,
        employee_id: profileId,
        summary: 'Test summary',
        comments: '{}',
        submitted_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('self_reviews').insert(payload).select();
    
    if (error) {
        console.error("Insert Error:", error.code, error.message, error.details);
    } else {
        console.log("Insert Success:", data);
        
        console.log("Attempting SECOND insert for SAME cycle/profile (should 409 if unique constraint exists)...");
        const { error: error2 } = await supabase.from('self_reviews').insert(payload).select();
        if (error2) {
            console.log("Second Insert Error (as expected if unique):", error2.code, error2.message);
        } else {
            console.log("Second Insert SUCCESS (No unique constraint on cycle+employee!)");
        }
    }
}

testInsert();

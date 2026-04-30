
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConstraints() {
    console.log("Checking for duplicate self_reviews...");
    const { data, error } = await supabase.from('self_reviews').select('employee_id, cycle_id');
    if (error) {
        console.error("Error fetching self_reviews:", error);
        return;
    }

    const counts = {};
    data.forEach(r => {
        const key = `${r.employee_id}:${r.cycle_id}`;
        counts[key] = (counts[key] || 0) + 1;
    });

    const duplicates = Object.entries(counts).filter(([key, count]) => count > 1);
    if (duplicates.length > 0) {
        console.log("Found duplicates (meaning NO unique constraint):", duplicates);
    } else {
        console.log("No duplicates found. Attempting a duplicate insert to test constraint...");
        if (data.length > 0) {
            const first = data[0];
            const { error: insErr } = await supabase.from('self_reviews').insert({
                employee_id: first.employee_id,
                cycle_id: first.cycle_id,
                summary: 'test conflict'
            });
            if (insErr) {
                console.log("Insert failed as expected (Constraint exists):", insErr.code, insErr.message);
            } else {
                console.log("Insert SUCCEEDED (NO unique constraint!)");
            }
        } else {
            console.log("No data to test with.");
        }
    }
}

checkConstraints();

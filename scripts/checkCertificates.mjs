import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read environment variables from .env file
const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCertificates() {
    console.log('=== Checking Generated Certificates ===\n');

    // Get all certificates
    const { data: allCerts, error: allError } = await supabase
        .from('generated_certificates')
        .select('*');

    if (allError) {
        console.error('Error fetching all certificates:', allError);
        return;
    }

    console.log(`Total certificates in database: ${allCerts?.length || 0}\n`);

    if (allCerts && allCerts.length > 0) {
        console.log('Certificates found:');
        allCerts.forEach((cert, idx) => {
            console.log(`\n${idx + 1}. Certificate ID: ${cert.id}`);
            console.log(`   Training ID: ${cert.training_id}`);
            console.log(`   Employee Name: "${cert.employee_name}"`);
            console.log(`   Employee ID: ${cert.employee_id || 'NULL'}`);
            console.log(`   Certificate URL: ${cert.certificate_url}`);
            console.log(`   Created At: ${cert.created_at}`);
        });

        // Check for training "TRY CERTI" (ID: b1def59f-73f1-4678-8875-128e2b8d661b)
        const trainingId = 'b1def59f-73f1-4678-8875-128e2b8d661b';
        const certsForTraining = allCerts.filter(c => c.training_id === trainingId);
        
        console.log(`\n\n=== Certificates for training ${trainingId} ===`);
        console.log(`Found: ${certsForTraining.length}`);
        if (certsForTraining.length > 0) {
            certsForTraining.forEach(cert => {
                console.log(`  - Employee Name: "${cert.employee_name}"`);
            });
        }

        // Check if any match the name variations
        const nameVariations = [
            'Roque, Charles Tamondong',
            'Roque, Charles',
            'Charles Tamondong Roque',
            'Charles Roque'
        ];

        console.log('\n\n=== Checking Name Matches ===');
        nameVariations.forEach(name => {
            const matches = allCerts.filter(c => c.employee_name === name);
            console.log(`"${name}": ${matches.length} matches`);
        });

        // Show exact employee_name values for comparison
        console.log('\n\n=== Unique Employee Names in Database ===');
        const uniqueNames = [...new Set(allCerts.map(c => c.employee_name))];
        uniqueNames.forEach((name, idx) => {
            console.log(`${idx + 1}. "${name}"`);
        });
    } else {
        console.log('No certificates found in the database.');
    }

    // Check RLS policies
    console.log('\n\n=== Checking RLS Policies ===');
    const { data: policies, error: policyError } = await supabase
        .rpc('exec_sql', { 
            sql: `
                SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
                FROM pg_policies 
                WHERE tablename = 'generated_certificates'
                ORDER BY policyname;
            `
        })
        .single();

    if (!policyError && policies) {
        console.log('Policies:', JSON.stringify(policies, null, 2));
    } else {
        console.log('Could not fetch policies (may need service role key)');
    }
}

checkCertificates().then(() => {
    console.log('\n=== Done ===');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
  }
});

// Retrieve environment variables
const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SUPABASE_ANON_KEY = env['VITE_SUPABASE_PUBLISHABLE_KEY'];

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createSuperAdmin() {
  console.log('Creating super admin user...');
  
  const { data, error } = await supabase.auth.signUp({
    email: 'iniyadelights@gmail.com',
    password: 'kRVJ@2115#',
  });

  if (error) {
    console.error('Failed to create super admin:', error.message);
    process.exit(1);
  }

  console.log('Super admin created successfully!');
  console.log('Email:', data.user?.email);
  console.log('User ID:', data.user?.id);
  
  // Note: If you have email confirmations enabled in your Supabase project settings,
  // you will need to check the email to verify the account, or disable email
  // confirmations in the Supabase Dashboard under Authentication -> Providers -> Email.
}

createSuperAdmin();

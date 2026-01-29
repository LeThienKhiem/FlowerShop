// Supabase Configuration
// Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY with your actual Supabase credentials

const SUPABASE_URL = 'https://rfalymblhmqkjgajlktp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kjq9y-ClW1XgZR9mo9hiOg_lf8G2jqx';

// Initialize Supabase client
// The Supabase CDN v2 provides window.supabase with createClient function
if (typeof window.supabase !== 'undefined') {
  const { createClient } = window.supabase;
  // Create client and assign to window.supabase for global access
  window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Also create a global 'supabase' variable for convenience
  // Use var to make it function-scoped globally accessible
  var supabase = window.supabase;
} else {
  console.error('Supabase CDN not loaded. Make sure the Supabase script is loaded before this file.');
}


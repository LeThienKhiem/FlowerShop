import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://rfalymblhmqkjgajlktp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kjq9y-ClW1XgZR9mo9hiOg_lf8G2jqx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

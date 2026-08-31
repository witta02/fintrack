import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : (typeof process !== "undefined" ? process.env : {});
const supabaseUrl = env?.VITE_SUPABASE_URL || "https://mock.supabase.co";
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY || "mock-anon-key";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);
export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseKey) : null;

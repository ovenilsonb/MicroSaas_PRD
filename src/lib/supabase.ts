/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

/**
 * SUPABASE CONFIGURATION
 * 
 * Currently DISABLED by default (mode set to 'local' in StorageModeContext)
 * 
 * To enable in the future:
 * 1. Set up your Supabase project and get the credentials
 * 2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env
 * 3. Change the default mode in StorageModeContext.tsx back to 'supabase'
 * 4. Run the SQL migrations to create the database tables
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== '' && 
    supabaseAnonKey !== '' &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
};

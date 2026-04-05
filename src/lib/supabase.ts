/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SUPABASE CONFIGURATION
 *
 * Supabase client is created lazily to avoid making requests
 * with placeholder credentials when the user is in local-only mode.
 *
 * All callers should check `isSupabaseConfigured()` before using,
 * or use `mode === 'supabase'` from StorageModeContext which
 * implicitly guards against this.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client: SupabaseClient | undefined;

function createSupabaseClient(): typeof _client {
  if (_client) return _client;
  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseClient();
}

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

/**
 * Lazy supabase instance — only connects when actually used.
 * Callers should still guard with `isSupabaseConfigured()` or `mode === 'supabase'`.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      console.warn(
        '[supabase] Called without Supabase being configured. ' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or switch mode to supabase first.',
      );
      return undefined;
    }
    return Reflect.get(client, prop, client);
  },
});

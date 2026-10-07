import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// When the env vars aren't set yet (e.g. first opening this project before
// completing the Supabase setup steps in the README), we deliberately don't
// throw - every screen that needs Supabase checks isSupabaseConfigured and
// shows a friendly "not connected yet" message instead of a blank crash.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

/**
 * Default user ID for development/testing purposes.
 * Used to mock authenticated user when real authentication is not needed.
 */
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

// Browser/client-side Supabase instance (do not use for auth cookie management)
// For development, these can be set in .env file
// For production (Cloudflare Pages), use createSupabaseServerInstance with runtime env
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("SUPABASE_URL and SUPABASE_KEY must be defined in environment variables");
    }

    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};

// Export for backward compatibility
export { supabaseClient };

export type SupabaseClient = typeof supabaseClient;

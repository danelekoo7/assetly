import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

/**
 * Default user ID for development/testing purposes.
 * Used to mock authenticated user when real authentication is not needed.
 */
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = typeof supabaseClient;

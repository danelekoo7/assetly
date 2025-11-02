import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { AstroCookies } from "astro";

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

// SSR helpers for server-side Supabase instance with proper cookie handling
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
  env?: Record<string, string>;
}) => {
  // Get environment variables from runtime (Cloudflare Pages) or fallback to import.meta.env (dev)
  const supabaseUrl = context.env?.SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = context.env?.SUPABASE_KEY || import.meta.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_KEY must be defined. " +
        "For Cloudflare Pages, set them in the dashboard under Settings → Environment variables. " +
        "For local development, add them to your .env file."
    );
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};

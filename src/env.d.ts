/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client";
import type { Session } from "@supabase/supabase-js";

interface User {
  id: string;
  email: string | undefined;
}

declare namespace App {
  interface Locals {
    user?: User;
    supabase: SupabaseClient;
    session?: Session | null;
  }
}

export const prerender = false;

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.server";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
  });

  // Sign out user and clear auth cookies via Supabase SSR helper
  await supabase.auth.signOut();

  // Redirect back to home page after logout
  return redirect("/", 303);
};

export const GET: APIRoute = async () => new Response("Method Not Allowed", { status: 405 });

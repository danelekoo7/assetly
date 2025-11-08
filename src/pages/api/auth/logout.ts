export const prerender = false;

import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ locals, redirect }) => {
  const { supabase } = locals;

  // Sign out user and clear auth cookies via Supabase SSR helper
  await supabase.auth.signOut();

  // Redirect back to home page after logout
  return redirect("/", 303);
};

export const GET: APIRoute = async () => new Response("Method Not Allowed", { status: 405 });

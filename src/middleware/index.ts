import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.server";

// Public paths - Server-rendered pages and Auth API endpoints
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/reset-password",
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Skip auth check for public paths
  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
    supabaseUrl: locals.runtime?.env?.SUPABASE_URL,
    supabaseKey: locals.runtime?.env?.SUPABASE_KEY,
  });

  // Always get user session first
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    locals.user = { id: user.id, email: user.email };
  } else {
    // Redirect to login for protected routes
    return redirect("/login");
  }

  return next();
});

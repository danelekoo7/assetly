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
  // Create Supabase instance for all requests
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Make supabase available in locals for all requests
  locals.supabase = supabase;

  // Skip auth check for public paths
  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }

  // Verify user authentication using getUser() which validates the JWT
  // This is more secure than getSession() as it contacts the Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Set user in locals if authenticated
  if (user) {
    locals.user = { id: user.id, email: user.email };

    // After verifying the user, we can safely get the session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    locals.session = session;
  } else {
    // Redirect to login for protected routes
    return redirect("/login");
  }

  return next();
});

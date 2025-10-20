import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client";

export const onRequest = defineMiddleware(async (context, next) => {
  const accessToken = context.cookies.get("sb-access-token");
  const refreshToken = context.cookies.get("sb-refresh-token");

  context.locals.supabase = supabaseClient;

  if (accessToken && refreshToken) {
    const {
      data: { session },
    } = await supabaseClient.auth.setSession({
      refresh_token: refreshToken.value,
      access_token: accessToken.value,
    });
    context.locals.session = session;
  } else {
    context.locals.session = null;
  }

  return next();
});

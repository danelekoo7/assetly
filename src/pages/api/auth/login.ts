import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServerInstance } from "../../../db/supabase.server";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const json = await request.json().catch(() => ({}));
    const parse = bodySchema.safeParse(json);
    if (!parse.success) {
      return new Response(JSON.stringify({ error: "Invalid payload", details: parse.error.flatten() }), {
        status: 400,
      });
    }

    const { email, password } = parse.data;

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
      supabaseUrl: locals.runtime?.env?.SUPABASE_URL,
      supabaseKey: locals.runtime?.env?.SUPABASE_KEY,
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Normalize some known errors to stable messages for the UI
      let message = error.message || "Authentication failed";
      if (/invalid login credentials/i.test(message)) {
        message = "Invalid login credentials";
      } else if (/email not confirmed/i.test(message)) {
        message = "Email not confirmed";
      }
      return new Response(JSON.stringify({ error: message }), { status: 401 });
    }

    return new Response(JSON.stringify({ user: { id: data.user?.id, email: data.user?.email } }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Unexpected server error" }), { status: 500 });
  }
};

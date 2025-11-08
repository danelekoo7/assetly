export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }), {
        status: 400,
      });
    }

    const { email, password } = parsed.data;

    const { supabase } = locals;

    const emailRedirectTo = new URL("/login", request.url).toString();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (error) {
      const message = error.message || "Registration failed";
      if (/already registered/i.test(message)) {
        return new Response(JSON.stringify({ error: "User already registered" }), { status: 409 });
      }
      return new Response(JSON.stringify({ error: message }), { status: 400 });
    }

    // Supabase will send a confirmation email. In most setups, no session is created until email is confirmed.
    const responseBody = {
      message: "Rejestracja rozpoczęta. Sprawdź skrzynkę e‑mail i potwierdź konto, korzystając z linku aktywacyjnego.",
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    };

    return new Response(JSON.stringify(responseBody), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Unexpected server error" }), { status: 500 });
  }
};

export const GET: APIRoute = async () => new Response("Method Not Allowed", { status: 405 });

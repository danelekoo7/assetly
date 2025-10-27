import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerSchema } from "@/lib/validation/auth.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

export default function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    setError(null);
    setSuccessEmail(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });

      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (!res.ok) {
        const msg = (data?.error as string) || "Wystąpił błąd. Spróbuj ponownie później.";
        if (/already/i.test(msg)) {
          setError("Użytkownik o tym adresie email już istnieje");
        } else {
          setError(msg);
        }
        setIsLoading(false);
        return;
      }

      // Success: inform user to check inbox for confirmation link
      setSuccessEmail(values.email);
      setIsLoading(false);
      // Optionally, we could redirect after a short delay to /login
    } catch {
      setError("Wystąpił błąd sieci. Spróbuj ponownie później.");
      setIsLoading(false);
    }
  };

  const disabled = isLoading || !!successEmail;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Utwórz konto</h2>
          <p className="text-sm text-muted-foreground">Wprowadź swoje dane, aby zarejestrować się</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successEmail && (
          <Alert>
            <AlertDescription>
              Rejestracja prawie gotowa! Wysłaliśmy link aktywacyjny na adres <b>{successEmail}</b>. Otwórz wiadomość i
              kliknij w link, aby potwierdzić konto. Po potwierdzeniu możesz się zalogować.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="twoj@email.pl" disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hasło</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Potwierdź hasło</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={disabled}>
          {isLoading ? "Rejestracja..." : successEmail ? "Sprawdź e‑mail" : "Zarejestruj się"}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Masz już konto? </span>
          <a href="/login" className="font-medium text-primary hover:underline">
            Zaloguj się
          </a>
        </div>
      </form>
    </Form>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginSchema } from '@/lib/validation/auth.schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        const msg = (data?.error as string) || 'Wystąpił błąd. Spróbuj ponownie później.';
        if (msg.includes('Invalid login credentials')) {
          setError('Nieprawidłowy email lub hasło');
        } else if (msg.includes('Email not confirmed')) {
          setError('Aktywuj swoje konto poprzez link w mailu');
        } else {
          setError('Wystąpił błąd. Spróbuj ponownie później.');
        }
        setIsLoading(false);
        return;
      }

      // Success -> redirect to dashboard/root
      window.location.href = '/';
    } catch (e) {
      setError('Wystąpił błąd sieci. Spróbuj ponownie później.');
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Zaloguj się
          </h2>
          <p className="text-sm text-muted-foreground">
            Wprowadź swoje dane logowania
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="twoj@email.pl"
                  disabled={isLoading}
                  {...field}
                />
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
                <Input
                  type="password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="text-right">
          <a
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Zapomniałem hasła
          </a>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Logowanie...' : 'Zaloguj się'}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Nie masz konta? </span>
          <a
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Zarejestruj się
          </a>
        </div>
      </form>
    </Form>
  );
}

import { z } from "zod";

export const emailSchema = z.string().email("Nieprawidłowy format adresu email");

export const passwordSchema = z
  .string()
  .min(8, "Hasło musi mieć minimum 8 znaków")
  .regex(/[A-Z]/, "Hasło musi zawierać przynajmniej jedną dużą literę")
  .regex(/[0-9]/, "Hasło musi zawierać przynajmniej jedną cyfrę");

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są zgodne",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Hasło jest wymagane"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są zgodne",
    path: ["confirmPassword"],
  });

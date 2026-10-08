// auth.validator.ts => Schemas Zod del FRONTEND: validan ANTES de enviar el request para dar feedback
// instantáneo en el formulario, sin esperar el round-trip HTTP. El backend vuelve a validar (nunca se confía
// en el cliente); ambos procesos no comparten código de runtime, pero sí las mismas reglas de negocio.
// Los mensajes son CLAVES de traducción (messages/*.json -> "validation"): el componente Input las traduce al idioma actual.
import { z } from "zod";

// Regla de contraseña reutilizada por registro y restablecimiento (DRY dentro del frontend)
const passwordRule = z
  .string()
  .min(8, "validation.passwordMin")
  .regex(/[A-Z]/, "validation.passwordUppercase")
  .regex(/[0-9]/, "validation.passwordNumber");

// loginSchema => usado por useZodForm (Formik + Zod) en LoginForm.tsx
export const loginSchema = z.object({
  email: z.string().trim().min(1, "validation.emailRequired").email("validation.emailInvalid"),
  password: z.string().min(1, "validation.passwordRequired"),
});

// otpSchema => segundo factor: exactamente 6 dígitos
export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "validation.otp"),
});

// registerSchema => usado en RegisterForm.tsx; incluye "confirmPassword" (solo existe en el frontend,
// el backend nunca recibe este campo — se descarta antes de hacer el POST)
export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "validation.firstNameRequired"),
    lastName: z.string().trim().min(1, "validation.lastNameRequired"),
    email: z.string().trim().min(1, "validation.emailRequired").email("validation.emailInvalid"),
    password: passwordRule,
    confirmPassword: z.string().min(1, "validation.confirmPassword"),
  })
  // ".refine()" => validación CRUZADA entre 2 campos (no se puede expresar con reglas de un solo campo)
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"], // Le dice a Formik en QUÉ campo mostrar el mensaje de error
  });

// forgotPasswordSchema => usado en ForgotPasswordForm.tsx
export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "validation.emailRequired").email("validation.emailInvalid"),
});

// updatePasswordSchema => usado en UpdatePasswordForm.tsx (confirmar el reset con el token del email)
export const updatePasswordSchema = z
  .object({
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, "validation.confirmPassword"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

// "z.infer" => deriva automáticamente los tipos TypeScript de cada schema (un solo lugar de verdad)
export type LoginFormValues = z.infer<typeof loginSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

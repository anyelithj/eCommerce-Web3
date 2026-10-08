import { z } from "zod";

const passwordRule = z
  .string()
  .min(8, "validation.passwordMin")
  .regex(/[A-Z]/, "validation.passwordUppercase")
  .regex(/[0-9]/, "validation.passwordNumber");

export const loginSchema = z.object({
  email: z.string().trim().min(1, "validation.emailRequired").email("validation.emailInvalid"),
  password: z.string().min(1, "validation.passwordRequired"),
});

export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "validation.otp"),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "validation.firstNameRequired"),
    lastName: z.string().trim().min(1, "validation.lastNameRequired"),
    email: z.string().trim().min(1, "validation.emailRequired").email("validation.emailInvalid"),
    password: passwordRule,
    confirmPassword: z.string().min(1, "validation.confirmPassword"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "validation.emailRequired").email("validation.emailInvalid"),
});

export const updatePasswordSchema = z
  .object({
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, "validation.confirmPassword"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

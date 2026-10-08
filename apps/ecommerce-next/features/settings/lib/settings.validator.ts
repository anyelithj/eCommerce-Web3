import { z } from "zod";

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "validation.firstNameRequired").max(80),
  lastName: z.string().trim().min(1, "validation.lastNameRequired").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^(\+57)?3\d{9}$/, "validation.colombianMobile")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "validation.currentPassword"),
    newPassword: z
      .string()
      .min(8, "validation.passwordMin")
      .regex(/[A-Z]/, "validation.passwordUppercase")
      .regex(/[0-9]/, "validation.passwordNumber"),
    confirmPassword: z.string().min(1, "validation.confirmPassword"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PasswordFormValues = Omit<z.infer<typeof passwordSchema>, "confirmPassword">;
export type PasswordFormInput = z.infer<typeof passwordSchema>;

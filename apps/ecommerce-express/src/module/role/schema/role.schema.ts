import { z } from "zod";

export const CreateRoleSchema = z.object({
  name: z
    .string()
    .regex(/^[A-Z_]+$/, { message: "El nombre del rol debe ser MAYÚSCULAS_CON_GUION_BAJO" }),
  description: z.string().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const UpdateRoleSchema = z.object({
  name: z
    .string()
    .regex(/^[A-Z_]+$/)
    .optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;

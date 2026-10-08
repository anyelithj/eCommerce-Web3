// role.schema.ts => validación runtime del módulo Role (RBAC)
import { z } from "zod";

// CreateRoleSchema => valida POST /api/v1/role
export const CreateRoleSchema = z.object({
  // Regex: solo mayúsculas y guion bajo (convención de nombres de rol tipo "ADMIN", "SUPER_ADMIN")
  name: z
    .string()
    .regex(/^[A-Z_]+$/, { message: "El nombre del rol debe ser MAYÚSCULAS_CON_GUION_BAJO" }),
  description: z.string().optional(),
  // "z.array(z.string()).optional()" => lista opcional de IDs de permisos a asignar en la misma creación
  permissionIds: z.array(z.string().uuid()).optional(),
});

// UpdateRoleSchema => valida PATCH /api/v1/role/:id (todo opcional: actualización parcial)
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

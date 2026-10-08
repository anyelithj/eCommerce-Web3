// role.dto.ts => contratos de entrada/salida del módulo Role
import type { CreateRoleInput, UpdateRoleInput } from "../schema/role.schema";

// CreateRoleDto/UpdateRoleDto => alias explícitos del input ya validado por Zod
export type CreateRoleDto = CreateRoleInput;
export type UpdateRoleDto = UpdateRoleInput;

// AssignPermissionDto => usado al vincular permisos existentes a un rol ya creado
export interface AssignPermissionDto {
  permissionIds: string[];
}

// RoleResponseDto => forma de salida HTTP: incluye los permisos ya "aplanados" a su forma legible
export interface RoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ id: string; action: string; resource: string }>;
  createdAt: Date;
}

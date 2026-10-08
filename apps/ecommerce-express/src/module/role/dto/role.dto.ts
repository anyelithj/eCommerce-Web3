import type { CreateRoleInput, UpdateRoleInput } from "../schema/role.schema";

export type CreateRoleDto = CreateRoleInput;
export type UpdateRoleDto = UpdateRoleInput;

export interface AssignPermissionDto {
  permissionIds: string[];
}

export interface RoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ id: string; action: string; resource: string }>;
  createdAt: Date;
}

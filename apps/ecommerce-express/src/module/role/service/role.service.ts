import { roleRepository, type RoleRepository } from "../repository/role.repository";
import {
  RoleNotFoundException,
  RoleAlreadyExistsException,
  RoleCannotBeDeletedException,
} from "../exception/role.exception";
import type { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from "../dto/role.dto";
import { authEvents } from "../../auth/service/auth.service";
import { invalidatePermissionsCache } from "../../../shared/middleware/rbac.middleware";

export class RoleService {
  private readonly repository: RoleRepository;

  constructor(repository: RoleRepository) {
    this.repository = repository;
  }

  public async listRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.repository.listRoles();
    return roles.map((role) => role.toResponseJSON());
  }

  public async getRoleById(id: string): Promise<RoleResponseDto> {
    const role = await this.repository.findById(id);
    if (!role) throw new RoleNotFoundException(id);
    return role.toResponseJSON();
  }

  public async createRole(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const existingRole = await this.repository.findByName(dto.name);
    if (existingRole) {
      throw new RoleAlreadyExistsException(dto.name);
    }

    const newRole = await this.repository.createRole(dto);
    await invalidatePermissionsCache();

    authEvents.emit("role.created", { roleId: newRole.id, roleName: newRole.name });

    return newRole.toResponseJSON();
  }

  public async updateRole(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const existingRole = await this.repository.findById(id);
    if (!existingRole) throw new RoleNotFoundException(id);

    if (existingRole.isProtectedRole() && dto.name && dto.name !== existingRole.name) {
      throw new RoleCannotBeDeletedException("el rol ADMIN no puede renombrarse");
    }

    const updatedRole = await this.repository.updateRole(id, dto);
    await invalidatePermissionsCache();

    authEvents.emit("role.updated", { roleId: id, changes: dto });

    return updatedRole.toResponseJSON();
  }

  public async deleteRoleById(id: string): Promise<void> {
    const role = await this.repository.findById(id);
    if (!role) throw new RoleNotFoundException(id);

    const usersAssignedCount = await this.repository.countUsersWithRole(id);

    if (!role.canBeDeleted(usersAssignedCount)) {
      const reason = role.isProtectedRole()
        ? "es un rol protegido del sistema"
        : `tiene ${usersAssignedCount} usuario(s) asignado(s)`;
      throw new RoleCannotBeDeletedException(reason);
    }

    await this.repository.deleteRoleById(id);
    await invalidatePermissionsCache();
    authEvents.emit("role.deleted", { roleId: id });
  }
}

export const roleService = new RoleService(roleRepository);

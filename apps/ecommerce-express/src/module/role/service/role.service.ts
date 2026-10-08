// role.service.ts => lógica de negocio del módulo Role (RBAC): asignación y validación de roles
import { roleRepository, type RoleRepository } from "../repository/role.repository";
import {
  RoleNotFoundException,
  RoleAlreadyExistsException,
  RoleCannotBeDeletedException,
} from "../exception/role.exception";
import type { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from "../dto/role.dto";
import { authEvents } from "../../auth/service/auth.service"; // Reutiliza el bus de eventos ya existente (DRY)
import { invalidatePermissionsCache } from "../../../shared/middleware/rbac.middleware";

export class RoleService {
  private readonly repository: RoleRepository;

  constructor(repository: RoleRepository) {
    this.repository = repository;
  }

  // listRoles => caso de uso "listar roles disponibles"
  public async listRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.repository.listRoles();
    return roles.map((role) => role.toResponseJSON());
  }

  // getRoleById => caso de uso "rol con permisos por ID"
  public async getRoleById(id: string): Promise<RoleResponseDto> {
    const role = await this.repository.findById(id);
    if (!role) throw new RoleNotFoundException(id);
    return role.toResponseJSON();
  }

  // createRole => caso de uso "crear rol con permisos definidos"
  public async createRole(dto: CreateRoleDto): Promise<RoleResponseDto> {
    // Regla de negocio: nombre de rol único (case-sensitive por convención MAYÚSCULAS)
    const existingRole = await this.repository.findByName(dto.name);
    if (existingRole) {
      throw new RoleAlreadyExistsException(dto.name);
    }

    const newRole = await this.repository.createRole(dto);
    await invalidatePermissionsCache(); // La cache RBAC (Redis) se recalcula con el nuevo rol

    // Emite evento reactivo para el módulo de Auditoría (auditoría cambios roles, ver matriz Excel)
    authEvents.emit("role.created", { roleId: newRole.id, roleName: newRole.name });

    return newRole.toResponseJSON();
  }

  // updateRole => caso de uso "modificar nombre y/o permisos — PATCH parcial"
  public async updateRole(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const existingRole = await this.repository.findById(id);
    if (!existingRole) throw new RoleNotFoundException(id);

    // Si se intenta renombrar el rol ADMIN, se bloquea (regla de integridad del sistema)
    if (existingRole.isProtectedRole() && dto.name && dto.name !== existingRole.name) {
      throw new RoleCannotBeDeletedException("el rol ADMIN no puede renombrarse");
    }

    const updatedRole = await this.repository.updateRole(id, dto);
    // Los permisos del rol pudieron cambiar: se invalida la cache para que requirePermission lo vea de inmediato
    await invalidatePermissionsCache();

    authEvents.emit("role.updated", { roleId: id, changes: dto });

    return updatedRole.toResponseJSON();
  }

  // deleteRoleById => caso de uso "eliminar rol validando que no esté en uso"
  public async deleteRoleById(id: string): Promise<void> {
    const role = await this.repository.findById(id);
    if (!role) throw new RoleNotFoundException(id);

    // Se consulta CUÁNTOS usuarios tienen este rol asignado ANTES de decidir si se puede borrar
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

// role.repository.ts => PATRÓN Repository sobre Prisma para el módulo Role
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config"; // Singleton compartido (antes: new PrismaClient() por módulo)
import { RoleEntity, type RolePersistenceShape } from "../model/role.model";

export class RoleRepository {
  private readonly prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  // listRoles => "listar roles disponibles" (endpoint GET /api/v1/role)
  public async listRoles(): Promise<RoleEntity[]> {
    const rawRoles = await this.prisma.role.findMany({
      // "include" anidado: Role -> RolePermission -> Permission (2 niveles de relación)
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: "asc" },
    });

    return rawRoles.map((rawRole) => this.mapToEntity(rawRole));
  }

  public async findById(id: string): Promise<RoleEntity | null> {
    const rawRole = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });

    if (!rawRole) return null;
    return this.mapToEntity(rawRole);
  }

  public async findByName(name: string): Promise<RoleEntity | null> {
    const rawRole = await this.prisma.role.findUnique({
      where: { name },
      include: { permissions: { include: { permission: true } } },
    });

    if (!rawRole) return null;
    return this.mapToEntity(rawRole);
  }

  // createRole => "crear rol con permisos definidos"
  public async createRole(data: {
    name: string;
    description?: string | undefined;
    permissionIds?: string[] | undefined;
  }): Promise<RoleEntity> {
    const rawRole = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description ?? null, // "?? null" => Prisma no acepta undefined explícito con exactOptionalPropertyTypes
        // "permissionIds?.map(...) ?? []" => si no vienen permisos, crea el rol sin ninguno (array vacío)
        permissions: {
          create: (data.permissionIds ?? []).map((permissionId) => ({ permissionId })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });

    return this.mapToEntity(rawRole);
  }

  // updateRole => "modificar nombre y/o permisos — PATCH parcial"
  public async updateRole(
    id: string,
    changes: {
      name?: string | undefined;
      description?: string | undefined;
      permissionIds?: string[] | undefined;
    }
  ): Promise<RoleEntity> {
    // "$transaction" => PATRÓN Unit of Work: si el reemplazo de permisos falla, se revierte TODO (atomicidad)
    const rawRole = await this.prisma.$transaction(async (tx) => {
      // Si vienen permissionIds nuevos, se reemplaza la relación completa (borrar + recrear)
      if (changes.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: changes.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }

      return tx.role.update({
        where: { id },
        // Spread condicional: solo se incluyen en el UPDATE los campos que llegaron (semántica PATCH)
        data: {
          ...(changes.name !== undefined ? { name: changes.name } : {}),
          ...(changes.description !== undefined ? { description: changes.description } : {}),
        },
        include: { permissions: { include: { permission: true } } },
      });
    });

    return this.mapToEntity(rawRole);
  }

  // countUsersWithRole => necesario para la regla de negocio "no eliminar rol en uso"
  public async countUsersWithRole(roleId: string): Promise<number> {
    return this.prisma.userRole.count({ where: { roleId } });
  }

  public async deleteRoleById(id: string): Promise<void> {
    await this.prisma.role.delete({ where: { id } });
  }

  private mapToEntity(rawRole: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    permissions: Array<{ permission: { id: string; action: string; resource: string } }>;
  }): RoleEntity {
    const shape: RolePersistenceShape = {
      id: rawRole.id,
      name: rawRole.name,
      description: rawRole.description,
      createdAt: rawRole.createdAt,
      // ".map()" aplana la relación anidada RolePermission->Permission a un array simple de Permission
      permissions: rawRole.permissions.map((rolePermission) => rolePermission.permission),
    };

    return new RoleEntity(shape);
  }
}

export const roleRepository = new RoleRepository(prisma);

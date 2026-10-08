import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config";
import { RoleEntity, type RolePersistenceShape } from "../model/role.model";

export class RoleRepository {
  private readonly prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  public async listRoles(): Promise<RoleEntity[]> {
    const rawRoles = await this.prisma.role.findMany({
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

  public async createRole(data: {
    name: string;
    description?: string | undefined;
    permissionIds?: string[] | undefined;
  }): Promise<RoleEntity> {
    const rawRole = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        permissions: {
          create: (data.permissionIds ?? []).map((permissionId) => ({ permissionId })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });

    return this.mapToEntity(rawRole);
  }

  public async updateRole(
    id: string,
    changes: {
      name?: string | undefined;
      description?: string | undefined;
      permissionIds?: string[] | undefined;
    }
  ): Promise<RoleEntity> {
    const rawRole = await this.prisma.$transaction(async (tx) => {
      if (changes.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: changes.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }

      return tx.role.update({
        where: { id },
        data: {
          ...(changes.name !== undefined ? { name: changes.name } : {}),
          ...(changes.description !== undefined ? { description: changes.description } : {}),
        },
        include: { permissions: { include: { permission: true } } },
      });
    });

    return this.mapToEntity(rawRole);
  }

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
      permissions: rawRole.permissions.map((rolePermission) => rolePermission.permission),
    };

    return new RoleEntity(shape);
  }
}

export const roleRepository = new RoleRepository(prisma);

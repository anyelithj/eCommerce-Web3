export interface RolePersistenceShape {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ id: string; action: string; resource: string }>;
  createdAt: Date;
}

export class RoleEntity {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string | null;
  private readonly permissions: Array<{ id: string; action: string; resource: string }>;
  public readonly createdAt: Date;

  constructor(data: RolePersistenceShape) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.permissions = data.permissions;
    this.createdAt = data.createdAt;
  }

  public isProtectedRole(): boolean {
    return ["ADMIN"].includes(this.name);
  }

  public canBeDeleted(usersAssignedCount: number): boolean {
    return !this.isProtectedRole() && usersAssignedCount === 0;
  }

  public hasPermission(action: string, resource: string): boolean {
    return this.permissions.some(
      (permission) => permission.action === action && permission.resource === resource
    );
  }

  public toResponseJSON(): {
    id: string;
    name: string;
    description: string | null;
    permissions: Array<{ id: string; action: string; resource: string }>;
    createdAt: Date;
  } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      permissions: this.permissions,
      createdAt: this.createdAt,
    };
  }
}

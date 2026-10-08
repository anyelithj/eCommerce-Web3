// role.exception.ts => jerarquía de errores propia del módulo Role (mismo patrón que auth.exception.ts)
export abstract class RoleException extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly code: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}

export class RoleNotFoundException extends RoleException {
  public readonly statusCode = 404;
  public readonly code = "ROLE_NOT_FOUND";
  constructor(id: string) {
    super(`Rol con id ${id} no encontrado`);
  }
}

export class RoleAlreadyExistsException extends RoleException {
  public readonly statusCode = 409;
  public readonly code = "ROLE_ALREADY_EXISTS";
  constructor(name: string) {
    super(`El rol ${name} ya existe`);
  }
}

// Se lanza al intentar eliminar el rol ADMIN o un rol que aún tiene usuarios asignados
export class RoleCannotBeDeletedException extends RoleException {
  public readonly statusCode = 409;
  public readonly code = "ROLE_CANNOT_BE_DELETED";
  constructor(reason: string) {
    super(`El rol no se puede eliminar: ${reason}`);
  }
}

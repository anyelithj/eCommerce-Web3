export abstract class AppException extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly code: string;
  public readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.details = details;
  }
}

export class BadRequestException extends AppException {
  public readonly statusCode = 400;
  constructor(
    message: string,
    public readonly code: string = "BAD_REQUEST",
    details?: unknown
  ) {
    super(message, details);
  }
}

export class UnauthorizedException extends AppException {
  public readonly statusCode = 401;
  public readonly code = "UNAUTHORIZED";
  constructor(message = "No autenticado") {
    super(message);
  }
}

export class ForbiddenException extends AppException {
  public readonly statusCode = 403;
  constructor(
    message = "No tienes permiso para esta acción",
    public readonly code: string = "FORBIDDEN"
  ) {
    super(message);
  }
}

export class NotFoundException extends AppException {
  public readonly statusCode = 404;
  public readonly code: string;
  constructor(resource: string, id?: string) {
    super(id ? `${resource} ${id} no encontrado` : `${resource} no encontrado`);
    this.code = `${resource.toUpperCase().replace(/\s+/g, "_")}_NOT_FOUND`;
  }
}

export class ConflictException extends AppException {
  public readonly statusCode = 409;
  constructor(
    message: string,
    public readonly code: string = "CONFLICT",
    details?: unknown
  ) {
    super(message, details);
  }
}

export class UnprocessableException extends AppException {
  public readonly statusCode = 422;
  constructor(
    message: string,
    public readonly code: string = "UNPROCESSABLE",
    details?: unknown
  ) {
    super(message, details);
  }
}

export class TooManyRequestsException extends AppException {
  public readonly statusCode = 429;
  public readonly code = "TOO_MANY_REQUESTS";
  constructor(message = "Demasiadas solicitudes, intenta más tarde") {
    super(message);
  }
}

export class BadGatewayException extends AppException {
  public readonly statusCode = 502;
  constructor(
    message: string,
    public readonly code: string = "UPSTREAM_ERROR"
  ) {
    super(message);
  }
}

export class ServiceUnavailableException extends AppException {
  public readonly statusCode = 503;
  public readonly code = "SERVICE_UNAVAILABLE";
  constructor(message: string) {
    super(message);
  }
}

// http-exception.filter.ts => jerarquía de excepciones HTTP COMPARTIDA por todos los módulos.
// Patrón: Exception Hierarchy + Template Method (la clase base fija la forma; las hijas fijan status y código).
// DRY: los módulos de las fases 2-4 extienden estas clases en vez de redefinir statusCode/code en cada archivo.
// OCP: el error.middleware las traduce por su forma (statusCode + code), sin conocer cada clase concreta.

// "abstract class" => no se puede instanciar directamente; solo sirve como base
export abstract class AppException extends Error {
  // "abstract readonly" => cada subclase DEBE declarar su status HTTP y su código estable
  public abstract readonly statusCode: number;
  public abstract readonly code: string;
  // "details" => información extra opcional para el cliente (ej. stock disponible)
  public readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message); // Llama al constructor de Error (fija .message y .stack)
    // Restaura la cadena de prototipos al compilar a CommonJS (sin esto "instanceof" falla con clases de Error)
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name; // "new.target" => la clase concreta que se instanció
    this.details = details;
  }
}

// 400 — datos de entrada válidos en forma pero inválidos para la regla de negocio
export class BadRequestException extends AppException {
  public readonly statusCode = 400;
  // "constructor(message, code = ...)" => parámetro con valor por defecto; permite códigos específicos del dominio
  constructor(
    message: string,
    public readonly code: string = "BAD_REQUEST", // "public readonly" en parámetro => declara y asigna la propiedad
    details?: unknown
  ) {
    super(message, details);
  }
}

// 401 — no autenticado
export class UnauthorizedException extends AppException {
  public readonly statusCode = 401;
  public readonly code = "UNAUTHORIZED";
  constructor(message = "No autenticado") {
    super(message);
  }
}

// 403 — autenticado pero sin permiso sobre el recurso
export class ForbiddenException extends AppException {
  public readonly statusCode = 403;
  constructor(
    message = "No tienes permiso para esta acción",
    public readonly code: string = "FORBIDDEN"
  ) {
    super(message);
  }
}

// 404 — recurso inexistente (o invisible para el usuario: no se revela su existencia)
export class NotFoundException extends AppException {
  public readonly statusCode = 404;
  public readonly code: string;
  // "resource" => nombre del recurso para un mensaje y un código consistentes ("PRODUCT_NOT_FOUND")
  constructor(resource: string, id?: string) {
    super(id ? `${resource} ${id} no encontrado` : `${resource} no encontrado`);
    this.code = `${resource.toUpperCase().replace(/\s+/g, "_")}_NOT_FOUND`;
  }
}

// 409 — conflicto con el estado actual (duplicado, transición inválida)
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

// 422 — la regla de negocio rechaza la operación (ej. stock insuficiente, cupón vencido)
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

// 429 — límite de peticiones superado (rate limit)
export class TooManyRequestsException extends AppException {
  public readonly statusCode = 429;
  public readonly code = "TOO_MANY_REQUESTS";
  constructor(message = "Demasiadas solicitudes, intenta más tarde") {
    super(message);
  }
}

// 502 — un proveedor externo (Stripe, DIAN, blockchain) respondió con error
export class BadGatewayException extends AppException {
  public readonly statusCode = 502;
  constructor(
    message: string,
    public readonly code: string = "UPSTREAM_ERROR"
  ) {
    super(message);
  }
}

// 503 — integración no configurada o no disponible temporalmente
export class ServiceUnavailableException extends AppException {
  public readonly statusCode = 503;
  public readonly code = "SERVICE_UNAVAILABLE";
  constructor(message: string) {
    super(message);
  }
}

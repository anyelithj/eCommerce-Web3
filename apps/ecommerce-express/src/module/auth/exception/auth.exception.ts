// auth.exception.ts => Clases de error ESPECÍFICAS del dominio Auth (POO: herencia).
// Patrón: "Exception Hierarchy" — cada clase representa UN caso de fallo concreto,
// así el middleware global de errores puede mapear cada una a un status HTTP distinto (OCP:
// se pueden agregar nuevas excepciones sin modificar el código que ya las maneja).
// Ahora heredan de AppException (shared/filter): la base común vive en un solo lugar (DRY).
import { AppException } from "../../../shared/filter/http-exception.filter";

// AuthException => clase base abstracta; todas las excepciones de este módulo heredan de ella
export abstract class AuthException extends AppException {}

// Se lanza cuando email/password no coinciden en login
export class InvalidCredentialsException extends AuthException {
  public readonly statusCode = 401; // 401 Unauthorized => credenciales inválidas o ausentes
  public readonly code = "INVALID_CREDENTIALS";

  constructor() {
    super("Email o contraseña incorrectos");
  }
}

// Se lanza al intentar registrar un email que ya existe
export class EmailAlreadyRegisteredException extends AuthException {
  public readonly statusCode = 409; // 409 Conflict => el recurso ya existe
  public readonly code = "EMAIL_ALREADY_REGISTERED";

  constructor(email: string) {
    // Template literal interpola la variable "email" directamente en el mensaje
    super(`El email ${email} ya está registrado`);
  }
}

// Se lanza cuando el usuario existe pero no ha verificado su cuenta y trata de iniciar sesión
export class AccountNotVerifiedException extends AuthException {
  public readonly statusCode = 403; // 403 Forbidden => identidad válida pero acción no permitida
  public readonly code = "ACCOUNT_NOT_VERIFIED";

  constructor() {
    super("Debes verificar tu cuenta antes de iniciar sesión");
  }
}

// Se lanza cuando la cuenta fue desactivada (GDPR o por un administrador)
export class AccountDisabledException extends AuthException {
  public readonly statusCode = 403;
  public readonly code = "ACCOUNT_DISABLED";

  constructor() {
    super("La cuenta está desactivada");
  }
}

// Se lanza cuando el refresh token no existe, expiró o fue revocado
export class InvalidSessionException extends AuthException {
  public readonly statusCode = 401;
  public readonly code = "INVALID_SESSION";

  constructor() {
    super("La sesión no es válida o ha expirado");
  }
}

// Se lanza cuando el token de verificación/recuperación de password es inválido o expiró
export class InvalidTokenException extends AuthException {
  public readonly statusCode = 400; // 400 Bad Request => el cliente envió un dato incorrecto
  public readonly code = "INVALID_TOKEN";

  constructor(context: string) {
    super(`Token de ${context} inválido o expirado`);
  }
}

// Se lanza cuando la firma Web3 (SIWE) no corresponde a la wallet indicada o el nonce no es válido
export class InvalidWeb3SignatureException extends AuthException {
  public readonly statusCode = 401;
  public readonly code = "INVALID_WEB3_SIGNATURE";

  constructor() {
    super("La firma de la wallet no es válida");
  }
}

// Se lanza cuando el proveedor OAuth rechaza el access token o no entrega un email utilizable
export class OAuthVerificationException extends AuthException {
  public readonly statusCode = 401;
  public readonly code = "OAUTH_VERIFICATION_FAILED";

  constructor(reason: string) {
    super(`No se pudo verificar la cuenta del proveedor: ${reason}`);
  }
}

// Se lanza cuando el código 2FA es incorrecto, expiró o superó el número de intentos
export class InvalidTwoFactorCodeException extends AuthException {
  public readonly statusCode = 401;
  public readonly code = "INVALID_TWO_FACTOR_CODE";

  constructor() {
    super("Código de verificación incorrecto o expirado");
  }
}

// Se lanza al vincular una wallet que ya pertenece a otra cuenta (walletAddress es UNIQUE)
export class WalletAlreadyLinkedException extends AuthException {
  public readonly statusCode = 409; // 409 Conflict => choca con el estado actual del recurso
  public readonly code = "WALLET_ALREADY_LINKED";

  constructor() {
    super("Esta wallet ya está vinculada a otra cuenta");
  }
}

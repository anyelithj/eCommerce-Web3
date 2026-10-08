import { AppException } from "../../../shared/filter/http-exception.filter";

export abstract class AuthException extends AppException {}

export class InvalidCredentialsException extends AuthException {
  public readonly statusCode = 401;
  public readonly code = "INVALID_CREDENTIALS";

  constructor() {
    super("Email o contraseña incorrectos");
  }
}

export class EmailAlreadyRegisteredException extends AuthException {
  public readonly statusCode = 409;
  public readonly code = "EMAIL_ALREADY_REGISTERED";

  constructor(email: string) {
    super(`El email ${email} ya está registrado`);
  }
}

export class AccountNotVerifiedException extends AuthException {
  public readonly statusCode = 403;
  public readonly code = "ACCOUNT_NOT_VERIFIED";

  constructor() {
    super("Debes verificar tu cuenta antes de iniciar sesión");
  }
}

export class AccountDisabledException extends AuthException {
  public readonly statusCode = 403;
  public readonly code = "ACCOUNT_DISABLED";

  constructor() {
    super("La cuenta está desactivada");
  }
}

export class InvalidSessionException extends AuthException {
  public readonly statusCode = 401;
  public readonly code = "INVALID_SESSION";

  constructor() {
    super("La sesión no es válida o ha expirado");
  }
}

export class InvalidTokenException extends AuthException {
  public readonly statusCode = 400;
  public readonly code = "INVALID_TOKEN";

  constructor(context: string) {
    super(`Token de ${context} inválido o expirado`);
  }
}

export class InvalidWeb3SignatureException extends AuthException {
  public readonly statusCode = 401;
  public readonly code = "INVALID_WEB3_SIGNATURE";

  constructor() {
    super("La firma de la wallet no es válida");
  }
}

export class OAuthVerificationException extends AuthException {
  public readonly statusCode = 401;
  public readonly code = "OAUTH_VERIFICATION_FAILED";

  constructor(reason: string) {
    super(`No se pudo verificar la cuenta del proveedor: ${reason}`);
  }
}

export class InvalidTwoFactorCodeException extends AuthException {
  public readonly statusCode = 401;
  public readonly code = "INVALID_TWO_FACTOR_CODE";

  constructor() {
    super("Código de verificación incorrecto o expirado");
  }
}

export class WalletAlreadyLinkedException extends AuthException {
  public readonly statusCode = 409;
  public readonly code = "WALLET_ALREADY_LINKED";

  constructor() {
    super("Esta wallet ya está vinculada a otra cuenta");
  }
}

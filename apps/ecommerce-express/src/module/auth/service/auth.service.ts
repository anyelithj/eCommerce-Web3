// auth.service.ts => capa de LÓGICA DE NEGOCIO: orquesta Repository + Util + reglas de dominio.
// El Controller NUNCA habla directamente con Prisma; siempre pasa por este Service (separación de capas).
import crypto from "node:crypto";
import { verifyMessage } from "ethers"; // ethers.js: verifica firmas criptográficas ECDSA (Web3)
import { authRepository, type AuthRepository } from "../repository/auth.repository";
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
  generateOtp,
} from "../util/token.util";
import {
  InvalidCredentialsException,
  EmailAlreadyRegisteredException,
  AccountNotVerifiedException,
  AccountDisabledException,
  InvalidSessionException,
  InvalidTokenException,
  InvalidWeb3SignatureException,
  WalletAlreadyLinkedException,
  InvalidTwoFactorCodeException,
} from "../exception/auth.exception";
import type {
  RegisterDto,
  LoginDto,
  LoginResultDto,
  RequestContextDto,
  TokenDto,
  Web3LoginDto,
} from "../dto/auth.dto";
import type { Web3LoginInput } from "../schema/auth.schema";
import type { AuthEvents, OAuthProviderName } from "../types/auth.types";
import type { UserEntity } from "../model/auth.model";
import { verifyOAuthAccessToken } from "../strategy/oauth.strategy";
import { sha256, safeEqual } from "../../../shared/util/crypto.util";
import { addMinutes } from "../../../shared/util/date.util";
import { TypedEventBus } from "../../../shared/util/event-bus.util";
import { ForbiddenException } from "../../../shared/filter/http-exception.filter";
import { jwtConfig } from "../../../config/jwt.config";
import { redis, RedisKeys } from "../../../config/redis.config";

// Vigencias de los tokens de un solo uso (constantes con nombre: sin "números mágicos")
const EMAIL_VERIFICATION_TTL_MINUTES = 24 * 60; // 24 horas
const PASSWORD_RESET_TTL_MINUTES = 60; // 1 hora
const TWO_FACTOR_TTL_MINUTES = 10;
const WEB3_NONCE_TTL_SECONDS = 300; // 5 minutos para firmar el mensaje en la wallet

// "authEvents" => bus de eventos TIPADO (patrón Observer). Otros módulos (Email, Notification, Audit) se
// SUSCRIBEN a estos eventos sin que AuthService los conozca directamente (bajo acoplamiento — DIP entre módulos)
export const authEvents = new TypedEventBus<AuthEvents>("auth");

// "class AuthService" => POO: agrupa comportamiento relacionado bajo un mismo estado (el repository inyectado)
export class AuthService {
  // Inyección de dependencias por constructor: permite testear con un repository "fake" en unit tests
  constructor(private readonly repository: AuthRepository) {}

  // registerUser => caso de uso "registro de usuario y credenciales" (endpoint POST /auth/register)
  public async registerUser(dto: RegisterDto): Promise<{ userId: string }> {
    // 1. Verificar que el email no esté ya registrado (regla de negocio: unicidad de cuenta)
    const existingUser = await this.repository.findByEmail(dto.email);
    if (existingUser) {
      // "throw" de una excepción tipada; el middleware global la traduce al status HTTP correcto
      throw new EmailAlreadyRegisteredException(dto.email);
    }

    // 2. Hashear la contraseña ANTES de persistirla (nunca se guarda texto plano)
    const passwordHash = await hashPassword(dto.password);

    // 3. Persistir el usuario (con rol CUSTOMER, cuenta de fidelidad y preferencias por defecto)
    const newUser = await this.repository.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      locale: dto.locale,
    });

    // 4. Emitir token de verificación y publicar el evento (el módulo Email envía el enlace de forma asíncrona)
    await this.sendVerificationEmail(newUser);
    return { userId: newUser.id };
  }

  // resendVerification => reenvía el enlace; respuesta silenciosa si el email no existe (anti user enumeration)
  public async resendVerification(email: string): Promise<void> {
    const user = await this.repository.findByEmail(email);
    if (!user || user.isVerified) return;
    await this.sendVerificationEmail(user);
  }

  // loginUser => caso de uso "sesión autenticada — genera token JWT" (endpoint POST /auth/login)
  // Devuelve tokens o, si la cuenta tiene 2FA, un desafío que se completa en verifyTwoFactor()
  public async loginUser(dto: LoginDto): Promise<LoginResultDto> {
    const user = await this.repository.findByEmail(dto.email);

    // Mensaje de error IDÉNTICO si el usuario no existe o si la password es incorrecta:
    // evita "user enumeration" (un atacante no puede deducir qué emails existen probando)
    const storedHash = user?.getPasswordHashForComparison();
    if (!user || !storedHash) throw new InvalidCredentialsException();

    const passwordMatches = await comparePassword(dto.password, storedHash);
    if (!passwordMatches) throw new InvalidCredentialsException();

    // Reglas de dominio encapsuladas en UserEntity
    this.assertCanAuthenticate(user);

    // Segundo factor: se envía un OTP de 6 dígitos al email y se devuelve el ID del desafío
    if (user.twoFactorEnabled) {
      const code = generateOtp();
      // El ID del desafío se genera ANTES de insertar: el hash "challengeId:code" es único por desafío
      // (dos usuarios con el mismo código de 6 dígitos no colisionan en la columna UNIQUE)
      const challengeId = crypto.randomUUID();
      await this.repository.createVerificationToken({
        id: challengeId,
        userId: user.id,
        purpose: "TWO_FACTOR",
        tokenHash: sha256(`${challengeId}:${code}`),
        expiresAt: addMinutes(new Date(), TWO_FACTOR_TTL_MINUTES),
      });
      authEvents.emit("user.two-factor-code", {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        locale: user.locale,
        code,
      });
      return { requiresTwoFactor: true, challengeId, expiresIn: TWO_FACTOR_TTL_MINUTES * 60 };
    }

    return this.issueTokenPair(user, dto);
  }

  // verifyTwoFactor => segundo paso del login con 2FA
  public async verifyTwoFactor(
    challengeId: string,
    code: string,
    context: RequestContextDto
  ): Promise<TokenDto> {
    const challenge = await this.repository.findVerificationTokenById(challengeId, "TWO_FACTOR");
    if (!challenge || !challenge.entity.isUsable()) throw new InvalidTwoFactorCodeException();

    // "safeEqual" => comparación en tiempo constante del hash guardado vs el del código recibido (sin fugas por timing)
    if (!safeEqual(challenge.tokenHash, sha256(`${challengeId}:${code}`))) {
      await this.repository.incrementTokenAttempts(challengeId); // Cuenta el intento fallido (máximo 5)
      throw new InvalidTwoFactorCodeException();
    }

    await this.repository.consumeVerificationToken(challengeId);

    const user = await this.repository.findById(challenge.entity.userId);
    if (!user) throw new InvalidTwoFactorCodeException();
    this.assertCanAuthenticate(user);
    return this.issueTokenPair(user, context);
  }

  // setTwoFactor => activar/desactivar 2FA (requiere reautenticación con contraseña)
  public async setTwoFactor(userId: string, enabled: boolean, password: string): Promise<void> {
    const user = await this.repository.findById(userId);
    const storedHash = user?.getPasswordHashForComparison();
    // Cuentas solo-OAuth no tienen contraseña: deben definir una antes (flujo de reset) para activar 2FA
    if (!user || !storedHash || !(await comparePassword(password, storedHash))) {
      throw new InvalidCredentialsException();
    }
    await this.repository.setTwoFactor(userId, enabled);
  }

  // loginWithOAuth => caso de uso "OAuth2 Google/GitHub/Discord — provider en body" (POST /auth/oauth)
  public async loginWithOAuth(
    provider: OAuthProviderName,
    accessToken: string,
    context: RequestContextDto
  ): Promise<TokenDto> {
    // 1. Verificar el token CON el proveedor (Strategy + Adapter en oauth.strategy.ts)
    const profile = await verifyOAuthAccessToken(provider, accessToken);

    // 2. ¿Ya existe la cuenta externa vinculada?
    let user = await this.repository.findByOAuthAccount(provider, profile.providerAccountId);

    if (!user) {
      // 3. ¿Existe un usuario con ese email? Solo se vincula si el proveedor VERIFICÓ el email
      //    (sin esta regla, alguien podría registrar en un proveedor el email de otra persona y tomar su cuenta)
      const byEmail = await this.repository.findByEmail(profile.email);
      if (byEmail && !profile.emailVerified)
        throw new ForbiddenException("Verifica tu email en el proveedor para vincular la cuenta");

      // 4. Si no existe, se crea (el email ya viene verificado por el proveedor)
      user =
        byEmail ??
        (await this.repository.createUser({
          email: profile.email,
          passwordHash: null, // Cuenta sin contraseña propia
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          isVerified: profile.emailVerified,
        }));
      await this.repository.linkOAuthAccount(user.id, provider, profile.providerAccountId);
    }

    this.assertCanAuthenticate(user);
    return this.issueTokenPair(user, context);
  }

  // createWeb3Nonce => paso 1 de Sign-In With Ethereum: nonce aleatorio de un solo uso guardado en Redis
  public async createWeb3Nonce(walletAddress: string): Promise<{ nonce: string; message: string }> {
    const nonce = crypto.randomBytes(16).toString("hex");
    await redis.set(RedisKeys.web3Nonce(walletAddress), nonce, "EX", WEB3_NONCE_TTL_SECONDS);
    // Mensaje legible que la wallet mostrará al usuario (incluye dominio y nonce, al estilo EIP-4361)
    const message = `eCommerce Web3 quiere que inicies sesión con tu cuenta:\n${walletAddress}\n\nNonce: ${nonce}`;
    return { nonce, message };
  }

  // verifyWalletSignature => pasos 1 y 2 de SIWE, compartidos por login y vinculación de wallet (DRY)
  private async verifyWalletSignature(dto: Web3LoginInput): Promise<void> {
    // 1. El mensaje firmado debe contener el nonce emitido (y aún vigente) para esta wallet: evita replay attacks
    const nonceKey = RedisKeys.web3Nonce(dto.walletAddress);
    const nonce = await redis.get(nonceKey);
    if (!nonce || !dto.message.includes(`Nonce: ${nonce}`))
      throw new InvalidWeb3SignatureException();
    await redis.del(nonceKey); // Un solo uso

    // 2. Verificar que la firma corresponda REALMENTE a la dirección indicada (criptografía ECDSA)
    // "verifyMessage(message, signature)" recupera la dirección que firmó el mensaje
    const recoveredAddress = verifyMessage(dto.message, dto.signature);
    if (recoveredAddress.toLowerCase() !== dto.walletAddress.toLowerCase()) {
      throw new InvalidWeb3SignatureException();
    }
  }

  // linkWallet => vincula una wallet (demostrando que se controla con una firma) al usuario autenticado.
  // Habilita el login Web3 y el minteo de insignias NFT de fidelidad a esa dirección.
  public async linkWallet(userId: string, dto: Web3LoginInput): Promise<{ walletAddress: string }> {
    await this.verifyWalletSignature(dto);
    const owner = await this.repository.findByWalletAddress(dto.walletAddress);
    if (owner && owner.id !== userId) throw new WalletAlreadyLinkedException(); // UNIQUE: una wallet = una cuenta
    const walletAddress = await this.repository.linkWallet(userId, dto.walletAddress);
    return { walletAddress };
  }

  // loginWithWeb3 => caso de uso "Web3 wallets" (Sign-In With Ethereum)
  public async loginWithWeb3(dto: Web3LoginDto): Promise<TokenDto> {
    await this.verifyWalletSignature(dto);

    // 3. Buscar el usuario vinculado a esa wallet
    const user = await this.repository.findByWalletAddress(dto.walletAddress);
    if (!user || !user.matchesWalletAddress(dto.walletAddress))
      throw new InvalidWeb3SignatureException();

    this.assertCanAuthenticate(user);
    return this.issueTokenPair(user, dto);
  }

  // refreshAccessToken => caso de uso "renovar access token" (endpoint PATCH /auth/sessions/:id)
  // Refresh Token Rotation: cada refresh invalida el token anterior y emite uno nuevo.
  public async refreshAccessToken(sessionId: string, refreshToken: string): Promise<TokenDto> {
    // 1. Verificar la FIRMA del refresh token (lanza si expiró o fue alterado)
    let decoded: { sub: string; sessionId: string };
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new InvalidSessionException();
    }
    if (decoded.sessionId !== sessionId) throw new InvalidSessionException();

    // 2. Verificar que la sesión siga activa en DB (permite revocar tokens antes de su expiración natural)
    const session = await this.repository.findSessionById(sessionId);
    if (!session || !session.isValid()) throw new InvalidSessionException();

    // 3. Detección de reutilización: un refresh token VIEJO (ya rotado) indica robo => se revoca la sesión
    if (!session.matchesRefreshTokenHash(sha256(refreshToken))) {
      await this.repository.revokeSession(sessionId);
      throw new InvalidSessionException();
    }

    // 4. Recuperar el usuario para regenerar el payload actualizado (roles pudieron cambiar desde el login)
    const user = await this.repository.findById(decoded.sub);
    if (!user || !user.isActive) throw new InvalidSessionException();

    // 5. Emitir el nuevo par y guardar el hash del nuevo refresh token (el anterior deja de servir)
    const newRefreshToken = signRefreshToken({ sub: user.id, sessionId });
    await this.repository.updateSessionToken(
      sessionId,
      sha256(newRefreshToken),
      new Date(Date.now() + jwtConfig.refreshTtlMs)
    );

    return this.buildTokenDto(user, sessionId, newRefreshToken);
  }

  // revokeSession => caso de uso "revocar token activo del header Authorization" (logout real)
  // Ownership: solo el dueño de la sesión (o un ADMIN) puede revocarla
  public async revokeSession(
    sessionId: string,
    requester: { id: string; roles: string[] }
  ): Promise<void> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) throw new InvalidSessionException();
    if (!session.belongsTo(requester.id) && !requester.roles.includes("ADMIN")) {
      throw new ForbiddenException("No puedes cerrar la sesión de otro usuario");
    }
    await this.repository.revokeSession(sessionId);
  }

  // requestPasswordReset => caso de uso "enviar enlace de recuperación de contraseña"
  public async requestPasswordReset(email: string): Promise<void> {
    const user = await this.repository.findByEmail(email);

    // Respuesta silenciosa aunque el usuario no exista: evita "user enumeration" vía este endpoint también
    if (!user || !user.isActive) return;

    const resetToken = generateSecureToken();
    await this.repository.createVerificationToken({
      userId: user.id,
      purpose: "PASSWORD_RESET",
      tokenHash: sha256(resetToken), // Solo el hash se guarda; el token en claro viaja por email
      expiresAt: addMinutes(new Date(), PASSWORD_RESET_TTL_MINUTES),
    });

    // Delega el envío real del correo al módulo Email (desacoplado vía evento, igual que en el registro)
    authEvents.emit("user.password-reset-requested", {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      locale: user.locale,
      resetToken,
    });
  }

  // resetPassword => caso de uso "confirmar nueva contraseña con el token del email"
  public async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.repository.findVerificationTokenByHash(
      sha256(token),
      "PASSWORD_RESET"
    );
    if (!record || !record.isUsable()) throw new InvalidTokenException("recuperación");

    const user = await this.repository.findById(record.userId);
    if (!user) throw new InvalidTokenException("recuperación");

    await this.repository.updatePasswordHash(user.id, await hashPassword(newPassword));
    await this.repository.consumeVerificationToken(record.id);
    // Seguridad: cambiar la contraseña cierra todas las sesiones abiertas (un atacante con sesión la pierde)
    await this.repository.revokeAllUserSessions(user.id);
    // El reset por email también prueba la propiedad del email: si no estaba verificada, ahora lo está
    if (!user.isVerified) await this.repository.markEmailAsVerified(user.id);

    authEvents.emit("user.password-changed", {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
    });
  }

  // verifyEmailToken => caso de uso "confirmar estado de verificación email" (PATCH /auth/user/:id/verify)
  public async verifyEmailToken(userId: string, token: string): Promise<void> {
    const record = await this.repository.findVerificationTokenByHash(
      sha256(token),
      "EMAIL_VERIFICATION"
    );
    // El token debe pertenecer al usuario de la URL: un token válido de A no verifica a B
    if (!record || !record.isUsable() || record.userId !== userId)
      throw new InvalidTokenException("verificación");

    await this.repository.markEmailAsVerified(userId);
    await this.repository.consumeVerificationToken(record.id);
  }

  // --- Métodos privados (detalles de implementación, no forman parte del contrato público) ---

  // assertCanAuthenticate => reglas de acceso comunes a TODOS los métodos de login (DRY)
  private assertCanAuthenticate(user: UserEntity): void {
    if (!user.isActive) throw new AccountDisabledException();
    if (!user.canAuthenticate()) throw new AccountNotVerifiedException();
  }

  private async sendVerificationEmail(user: UserEntity): Promise<void> {
    const verificationToken = generateSecureToken();
    await this.repository.createVerificationToken({
      userId: user.id,
      purpose: "EMAIL_VERIFICATION",
      tokenHash: sha256(verificationToken),
      expiresAt: addMinutes(new Date(), EMAIL_VERIFICATION_TTL_MINUTES),
    });
    // "emit" => el listener (módulo Email) hace el envío real; el flujo HTTP responde sin esperar al SMTP
    authEvents.emit("user.registered", {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      locale: user.locale,
      verificationToken,
    });
  }

  // issueTokenPair => reutilizado por login/2FA/OAuth/Web3: evita duplicar la emisión de tokens (DRY)
  private async issueTokenPair(user: UserEntity, context: RequestContextDto): Promise<TokenDto> {
    // Se crea PRIMERO la sesión para obtener su ID (necesario dentro del payload de ambos JWT).
    // El hash inicial es de un valor aleatorio descartable; se reemplaza enseguida por el hash del token real.
    const session = await this.repository.createSession({
      userId: user.id,
      refreshTokenHash: sha256(crypto.randomUUID()),
      expiresAt: new Date(Date.now() + jwtConfig.refreshTtlMs),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    const refreshToken = signRefreshToken({ sub: user.id, sessionId: session.id });
    // Antes: se guardaba un "placeholder" y se entregaba OTRO token, por lo que el refresh nunca funcionaba
    await this.repository.updateSessionToken(session.id, sha256(refreshToken), session.expiresAt);

    return this.buildTokenDto(user, session.id, refreshToken);
  }

  private buildTokenDto(user: UserEntity, sessionId: string, refreshToken: string): TokenDto {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      sessionId,
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: jwtConfig.accessTtlSeconds,
      sessionId,
      user: user.toPublicJSON(), // Antes firstName/lastName llegaban vacíos al frontend
    };
  }
}

// Instancia Singleton exportada, inyectando el repository Singleton ya creado
export const authService = new AuthService(authRepository);

import type { Request, Response } from "express";
import { authService } from "../service/auth.service";
import {
  RegisterSchema,
  LoginSchema,
  OAuthSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  RefreshTokenSchema,
  TwoFactorVerifySchema,
  TwoFactorToggleSchema,
  Web3NonceSchema,
  Web3LoginSchema,
} from "../schema/auth.schema";
import type { RequestContextDto } from "../dto/auth.dto";
import {
  asyncHandler,
  sendNoContent,
  sendSuccess,
} from "../../../shared/interceptor/transform.interceptor";
import { HttpStatus } from "../../../shared/constants/http.constants";
import { parseId } from "../../../shared/pipe/validation.pipe";
import { currentUser } from "../../../shared/decorator/auth.decorator";

// requestContext => metadata de la petición que Zod no valida (no viene del body) — función pura reutilizable
function requestContext(req: Request): RequestContextDto {
  return { userAgent: req.headers["user-agent"], ipAddress: req.ip };
}

// "class AuthController" => POO: agrupa los handlers relacionados a Auth bajo un mismo namespace
export class AuthController {
  // registerUser => handler de POST /api/v1/auth/register
  // Propiedad = función flecha envuelta: "this" no se pierde al pasarla al Router (ya no hace falta .bind)
  public readonly registerUser = asyncHandler(async (req: Request, res: Response) => {
    // "schema.parse(req.body)" => valida Y lanza ZodError automáticamente si algo no cumple las reglas
    const validatedInput = RegisterSchema.parse(req.body);
    // Se enriquece el DTO con metadata de la request que Zod no valida (no viene del body)
    const result = await authService.registerUser({ ...validatedInput, ...requestContext(req) });
    // 201 Created => se creó un nuevo recurso (el usuario)
    sendSuccess(res, { userId: result.userId }, HttpStatus.CREATED);
  });

  // loginUser => handler de POST /api/v1/auth/login (tokens o desafío 2FA)
  public readonly loginUser = asyncHandler(async (req: Request, res: Response) => {
    const validatedInput = LoginSchema.parse(req.body);
    const result = await authService.loginUser({ ...validatedInput, ...requestContext(req) });
    sendSuccess(res, result);
  });

  // verifyTwoFactor => handler de POST /api/v1/auth/2fa/verify
  public readonly verifyTwoFactor = asyncHandler(async (req: Request, res: Response) => {
    const { challengeId, code } = TwoFactorVerifySchema.parse(req.body);
    sendSuccess(res, await authService.verifyTwoFactor(challengeId, code, requestContext(req)));
  });

  // setTwoFactor => handler de PATCH /api/v1/auth/2fa (usuario autenticado)
  public readonly setTwoFactor = asyncHandler(async (req: Request, res: Response) => {
    const { enabled, password } = TwoFactorToggleSchema.parse(req.body);
    await authService.setTwoFactor(currentUser(req).id, enabled, password);
    sendSuccess(res, { twoFactorEnabled: enabled });
  });

  // loginWithOAuth => handler de POST /api/v1/auth/oauth ("initiateOAuthFlow" de la matriz)
  public readonly loginWithOAuth = asyncHandler(async (req: Request, res: Response) => {
    const { provider, accessToken } = OAuthSchema.parse(req.body);
    sendSuccess(res, await authService.loginWithOAuth(provider, accessToken, requestContext(req)));
  });

  // createWeb3Nonce => handler de POST /api/v1/auth/web3/nonce
  public readonly createWeb3Nonce = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = Web3NonceSchema.parse(req.body);
    sendSuccess(res, await authService.createWeb3Nonce(walletAddress));
  });

  // loginWithWeb3 => handler de POST /api/v1/auth/web3
  public readonly loginWithWeb3 = asyncHandler(async (req: Request, res: Response) => {
    const validatedInput = Web3LoginSchema.parse(req.body);
    sendSuccess(
      res,
      await authService.loginWithWeb3({ ...validatedInput, ...requestContext(req) })
    );
  });

  // linkWallet => handler de POST /api/v1/auth/web3/link (usuario autenticado)
  public readonly linkWallet = asyncHandler(async (req: Request, res: Response) => {
    const validatedInput = Web3LoginSchema.parse(req.body);
    sendSuccess(res, await authService.linkWallet(currentUser(req).id, validatedInput));
  });

  // refreshAccessToken => handler de PATCH /api/v1/auth/sessions/:sessionId
  public readonly refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = parseId(req, "sessionId"); // Valida que el parámetro sea un UUID
    const { refreshToken } = RefreshTokenSchema.parse(req.body);
    sendSuccess(res, await authService.refreshAccessToken(sessionId, refreshToken));
  });

  // revokeSession => handler de DELETE /api/v1/auth/sessions/:sessionId (logout)
  public readonly revokeSession = asyncHandler(async (req: Request, res: Response) => {
    await authService.revokeSession(parseId(req, "sessionId"), currentUser(req));
    // 204 No Content => operación exitosa sin cuerpo de respuesta (convención REST para DELETE)
    sendNoContent(res);
  });

  // requestPasswordReset => handler de POST /api/v1/auth/forgot-password
  public readonly requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(email);
    // Respuesta genérica SIEMPRE 200, exista o no el email (previene user enumeration en el propio HTTP status)
    sendSuccess(res, { message: "Si el email existe, recibirás un enlace de recuperación." });
  });

  // resetPassword => handler de POST /api/v1/auth/reset-password (antes solo validaba y no cambiaba nada)
  public readonly resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, newPassword);
    sendSuccess(res, { message: "Contraseña actualizada correctamente." });
  });

  // verifyEmailToken => handler de PATCH /api/v1/auth/user/:id/verify
  public readonly verifyEmailToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = VerifyEmailSchema.parse(req.body);
    await authService.verifyEmailToken(parseId(req), token);
    sendSuccess(res, { message: "Cuenta verificada correctamente." });
  });

  // resendVerification => handler de POST /api/v1/auth/verification/resend
  public readonly resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const { email } = ResendVerificationSchema.parse(req.body);
    await authService.resendVerification(email);
    sendSuccess(res, {
      message: "Si la cuenta existe y no está verificada, enviamos un nuevo enlace.",
    });
  });
}

// Instancia Singleton exportada para usar directamente en las rutas
export const authController = new AuthController();

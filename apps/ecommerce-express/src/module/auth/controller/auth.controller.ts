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

function requestContext(req: Request): RequestContextDto {
  return { userAgent: req.headers["user-agent"], ipAddress: req.ip };
}

export class AuthController {
  public readonly registerUser = asyncHandler(async (req: Request, res: Response) => {
    const validatedInput = RegisterSchema.parse(req.body);
    const result = await authService.registerUser({ ...validatedInput, ...requestContext(req) });
    sendSuccess(res, { userId: result.userId }, HttpStatus.CREATED);
  });

  public readonly loginUser = asyncHandler(async (req: Request, res: Response) => {
    const validatedInput = LoginSchema.parse(req.body);
    const result = await authService.loginUser({ ...validatedInput, ...requestContext(req) });
    sendSuccess(res, result);
  });

  public readonly verifyTwoFactor = asyncHandler(async (req: Request, res: Response) => {
    const { challengeId, code } = TwoFactorVerifySchema.parse(req.body);
    sendSuccess(res, await authService.verifyTwoFactor(challengeId, code, requestContext(req)));
  });

  public readonly setTwoFactor = asyncHandler(async (req: Request, res: Response) => {
    const { enabled, password } = TwoFactorToggleSchema.parse(req.body);
    await authService.setTwoFactor(currentUser(req).id, enabled, password);
    sendSuccess(res, { twoFactorEnabled: enabled });
  });

  public readonly loginWithOAuth = asyncHandler(async (req: Request, res: Response) => {
    const { provider, accessToken } = OAuthSchema.parse(req.body);
    sendSuccess(res, await authService.loginWithOAuth(provider, accessToken, requestContext(req)));
  });

  public readonly createWeb3Nonce = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress } = Web3NonceSchema.parse(req.body);
    sendSuccess(res, await authService.createWeb3Nonce(walletAddress));
  });

  public readonly loginWithWeb3 = asyncHandler(async (req: Request, res: Response) => {
    const validatedInput = Web3LoginSchema.parse(req.body);
    sendSuccess(
      res,
      await authService.loginWithWeb3({ ...validatedInput, ...requestContext(req) })
    );
  });

  public readonly linkWallet = asyncHandler(async (req: Request, res: Response) => {
    const validatedInput = Web3LoginSchema.parse(req.body);
    sendSuccess(res, await authService.linkWallet(currentUser(req).id, validatedInput));
  });

  public readonly refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = parseId(req, "sessionId");
    const { refreshToken } = RefreshTokenSchema.parse(req.body);
    sendSuccess(res, await authService.refreshAccessToken(sessionId, refreshToken));
  });

  public readonly revokeSession = asyncHandler(async (req: Request, res: Response) => {
    await authService.revokeSession(parseId(req, "sessionId"), currentUser(req));
    sendNoContent(res);
  });

  public readonly requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(email);
    sendSuccess(res, { message: "Si el email existe, recibirás un enlace de recuperación." });
  });

  public readonly resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, newPassword);
    sendSuccess(res, { message: "Contraseña actualizada correctamente." });
  });

  public readonly verifyEmailToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = VerifyEmailSchema.parse(req.body);
    await authService.verifyEmailToken(parseId(req), token);
    sendSuccess(res, { message: "Cuenta verificada correctamente." });
  });

  public readonly resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const { email } = ResendVerificationSchema.parse(req.body);
    await authService.resendVerification(email);
    sendSuccess(res, {
      message: "Si la cuenta existe y no está verificada, enviamos un nuevo enlace.",
    });
  });
}

export const authController = new AuthController();

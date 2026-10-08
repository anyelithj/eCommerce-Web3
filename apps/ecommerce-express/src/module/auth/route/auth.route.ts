import { Router } from "express";
import { authController } from "../controller/auth.controller";
import { jwtAuthGuard } from "../guard/auth.guard";
import { rateLimit } from "../../../shared/middleware/rate-limit.middleware";

export const authRouter = Router();

const loginLimit = rateLimit({ bucket: "auth-login", limit: 10, windowSeconds: 15 * 60 });
const sensitiveLimit = rateLimit({ bucket: "auth-sensitive", limit: 5, windowSeconds: 15 * 60 });

authRouter.post("/register", sensitiveLimit, authController.registerUser);

authRouter.post("/login", loginLimit, authController.loginUser);

authRouter.post("/2fa/verify", loginLimit, authController.verifyTwoFactor);

authRouter.post("/oauth", loginLimit, authController.loginWithOAuth);

authRouter.post("/web3/nonce", loginLimit, authController.createWeb3Nonce);
authRouter.post("/web3", loginLimit, authController.loginWithWeb3);

authRouter.post("/forgot-password", sensitiveLimit, authController.requestPasswordReset);

authRouter.post("/reset-password", sensitiveLimit, authController.resetPassword);

authRouter.patch("/user/:id/verify", sensitiveLimit, authController.verifyEmailToken);

authRouter.post("/verification/resend", sensitiveLimit, authController.resendVerification);

authRouter.patch("/sessions/:sessionId", loginLimit, authController.refreshAccessToken);

authRouter.delete("/sessions/:sessionId", jwtAuthGuard, authController.revokeSession);

authRouter.patch("/2fa", jwtAuthGuard, sensitiveLimit, authController.setTwoFactor);

authRouter.post("/web3/link", jwtAuthGuard, sensitiveLimit, authController.linkWallet);

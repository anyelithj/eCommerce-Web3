// stripe.config.ts (Stripe SDK) => cliente de Stripe, PSP exclusivo del proyecto (matriz: módulo Pagos).
import Stripe from "stripe"; // SDK oficial: tipado completo de PaymentIntents, Refunds y Webhooks
import { appConfig } from "./app.config";
import { ServiceUnavailableException } from "../shared/filter/http-exception.filter";

// "let" => referencia mutable SOLO para la inicialización perezosa (Lazy Singleton)
let stripeClient: Stripe | null = null;

// getStripe => devuelve el cliente o lanza 503 si no hay credenciales configuradas
// (la app arranca sin Stripe en desarrollo; solo fallan los endpoints de pago, con un error explícito)
export function getStripe(): Stripe {
  if (!appConfig.STRIPE_SECRET_KEY) {
    throw new ServiceUnavailableException("Stripe no está configurado (STRIPE_SECRET_KEY)");
  }
  // "??=" (asignación lógica nullish) => crea la instancia solo la primera vez
  stripeClient ??= new Stripe(appConfig.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2, // Reintentos automáticos con idempotencia ante errores de red transitorios
    appInfo: { name: "ecommerce-web3-express" },
  });
  return stripeClient;
}

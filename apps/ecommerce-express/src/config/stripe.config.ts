import Stripe from "stripe";
import { appConfig } from "./app.config";
import { ServiceUnavailableException } from "../shared/filter/http-exception.filter";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!appConfig.STRIPE_SECRET_KEY) {
    throw new ServiceUnavailableException("Stripe no está configurado (STRIPE_SECRET_KEY)");
  }
  stripeClient ??= new Stripe(appConfig.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    appInfo: { name: "ecommerce-web3-express" },
  });
  return stripeClient;
}

import type { LoyaltyTier, OrderStatus, RefundStatus, ShipmentStatus } from "@prisma/client";
import { formatMoney, type Locale } from "../util/i18n.util";

type NoParams = Record<string, never>;

export interface NotificationParams {
  passwordChanged: NoParams;
  orderPlaced: { orderNumber: string; totalCents: number; currency: string };
  orderStatus: { orderNumber: string; status: OrderStatus };
  orderCancelled: { orderNumber: string; reason: string };
  paymentFailed: { reason: string };
  shipmentUpdated: { orderNumber: string; status: ShipmentStatus; trackingNumber: string | null };
  refundUpdated: { amountCents: number; currency: string; status: RefundStatus };
  invoiceIssued: { number: string };
  tierUpgraded: { tier: LoyaltyTier };
  badgeMinted: { tier: LoyaltyTier; txHash: string };
  reviewModerated: { approved: boolean };
  reviewReplied: NoParams;
}
export type NotificationKey = keyof NotificationParams;
export const NOTIFICATION_KEYS = [
  "passwordChanged", "orderPlaced", "orderStatus", "orderCancelled", "paymentFailed", "shipmentUpdated",
  "refundUpdated", "invoiceIssued", "tierUpgraded", "badgeMinted", "reviewModerated", "reviewReplied",
] as const satisfies readonly NotificationKey[];

export interface LoyaltyReasonParams {
  PURCHASE: { orderNumber: string };
  REFUND_ADJUSTMENT: NoParams;
  EXPIRATION: NoParams;
}
export type LoyaltyReasonCode = keyof LoyaltyReasonParams;
export const LOYALTY_REASON_CODES = ["PURCHASE", "REFUND_ADJUSTMENT", "EXPIRATION"] as const satisfies readonly LoyaltyReasonCode[];
export type LoyaltyReason = string | { [K in LoyaltyReasonCode]: { code: K; params: LoyaltyReasonParams[K] } }[LoyaltyReasonCode];

export interface RenderedNotification {
  title: string;
  body: string;
}

interface Dictionary {
  notifications: { [K in NotificationKey]: (params: NotificationParams[K]) => RenderedNotification };
  loyaltyReasons: { [K in LoyaltyReasonCode]: (params: LoyaltyReasonParams[K]) => string };
  tiers: Record<LoyaltyTier, string>;
  email: {
    footer: string;
    linkFallback: string;
    viewDetail: string;
    verify: { subject: string; heading: (name: string) => string; body: string; cta: string; text: (name: string, url: string) => string };
    reset: { subject: string; heading: (name: string) => string; body: string; cta: string; text: (url: string) => string };
    passwordChanged: { subject: string; heading: (name: string) => string; body: string; text: string };
    twoFactor: { subject: (code: string) => string; heading: (name: string) => string; expires: string; text: (code: string) => string };
  };
}

const ORDER_ES: Record<OrderStatus, string> = { CONFIRMED: "fue confirmado", PREPARING: "se está preparando", PACKED: "está empacado y listo para despacho", SHIPPED: "fue enviado", DELIVERED: "fue entregado", CANCELLED: "fue cancelado" };
const SHIPMENT_ES: Record<ShipmentStatus, string> = { PENDING: "está pendiente de despacho", LABEL_CREATED: "tiene guía generada", IN_TRANSIT: "va en camino", OUT_FOR_DELIVERY: "está en reparto", DELIVERED: "fue entregado", CANCELLED: "fue cancelado", RETURNED: "fue devuelto" };
const REFUND_ES: Record<RefundStatus, string> = { REQUESTED: "fue recibida y está en revisión", APPROVED: "fue aprobada", REJECTED: "fue rechazada", PROCESSED: "fue procesada: el dinero va en camino a tu medio de pago", CANCELLED: "fue cancelada" };
const TIERS_ES: Record<LoyaltyTier, string> = { BRONZE: "Bronce", SILVER: "Plata", GOLD: "Oro", PLATINUM: "Platino" };

const es: Dictionary = {
  notifications: {
    passwordChanged: () => ({ title: "Tu contraseña fue cambiada", body: "Si no fuiste tú, restablece tu contraseña de inmediato." }),
    orderPlaced: (p) => ({ title: `Pedido ${p.orderNumber} confirmado`, body: `Recibimos tu pago de ${formatMoney(p.totalCents, p.currency, "es")}. Te avisaremos cuando salga.` }),
    orderStatus: (p) => ({ title: `Pedido ${p.orderNumber}`, body: `Tu pedido ${ORDER_ES[p.status]}.` }),
    orderCancelled: (p) => ({ title: `Pedido ${p.orderNumber} cancelado`, body: `Motivo: ${p.reason}. Si ya pagaste, el reembolso se procesa automáticamente.` }),
    paymentFailed: (p) => ({ title: "No pudimos procesar tu pago", body: `${p.reason}. Puedes intentarlo de nuevo con otro medio de pago.` }),
    shipmentUpdated: (p) => ({ title: `Envío del pedido ${p.orderNumber}`, body: `Tu envío ${SHIPMENT_ES[p.status]}${p.trackingNumber ? ` (guía ${p.trackingNumber})` : ""}.` }),
    refundUpdated: (p) => ({ title: "Actualización de tu devolución", body: `Tu solicitud por ${formatMoney(p.amountCents, p.currency, "es")} ${REFUND_ES[p.status]}.` }),
    invoiceIssued: (p) => ({ title: `Factura ${p.number} disponible`, body: "Tu factura electrónica fue emitida. Puedes descargarla desde el detalle del pedido." }),
    tierUpgraded: (p) => ({ title: `¡Subiste a nivel ${TIERS_ES[p.tier]}!`, body: "Desbloqueaste una insignia NFT coleccionable. Vincula tu wallet para recibirla." }),
    badgeMinted: (p) => ({ title: `Tu insignia ${TIERS_ES[p.tier]} ya está en tu wallet`, body: `Transacción ${p.txHash.slice(0, 10)}… confirmada en la blockchain.` }),
    reviewModerated: (p) => (p.approved ? { title: "Tu reseña fue publicada", body: "Gracias por ayudar a otros compradores." } : { title: "Tu reseña no fue publicada", body: "No cumple las normas de la comunidad." }),
    reviewReplied: () => ({ title: "El vendedor respondió tu reseña", body: "Revisa la respuesta en tu cuenta." }),
  },
  loyaltyReasons: {
    PURCHASE: (p) => `Compra ${p.orderNumber}`,
    REFUND_ADJUSTMENT: () => "Ajuste por devolución",
    EXPIRATION: () => "Vencimiento de puntos",
  },
  tiers: TIERS_ES,
  email: {
    footer: "eCommerce Web3 · Este es un mensaje automático, no respondas a este correo.",
    linkFallback: "Si el botón no funciona, copia este enlace:",
    viewDetail: "Ver detalle",
    verify: {
      subject: "Verifica tu cuenta",
      heading: (name) => `Hola ${name}, confirma tu email`,
      body: "Gracias por registrarte. Confirma tu dirección de correo para activar la cuenta. El enlace vence en 24 horas.",
      cta: "Verificar mi cuenta",
      text: (name, url) => `Hola ${name}, verifica tu cuenta en: ${url} (vence en 24 horas).`,
    },
    reset: {
      subject: "Restablece tu contraseña",
      heading: (name) => `Hola ${name}`,
      body: "Recibimos una solicitud para restablecer tu contraseña. El enlace vence en 1 hora. Si no fuiste tú, ignora este mensaje.",
      cta: "Crear nueva contraseña",
      text: (url) => `Restablece tu contraseña en: ${url} (vence en 1 hora). Si no fuiste tú, ignora este mensaje.`,
    },
    passwordChanged: {
      subject: "Tu contraseña fue cambiada",
      heading: (name) => `Hola ${name}`,
      body: "Tu contraseña se cambió correctamente y cerramos las demás sesiones. Si no fuiste tú, restablécela de inmediato.",
      text: "Tu contraseña fue cambiada. Si no fuiste tú, restablécela de inmediato.",
    },
    twoFactor: {
      subject: (code) => `Tu código de acceso: ${code}`,
      heading: (name) => `Hola ${name}, este es tu código`,
      expires: "Vence en 10 minutos. Nunca lo compartas.",
      text: (code) => `Tu código de acceso es ${code}. Vence en 10 minutos.`,
    },
  },
};

const ORDER_EN: Record<OrderStatus, string> = { CONFIRMED: "was confirmed", PREPARING: "is being prepared", PACKED: "is packed and ready to ship", SHIPPED: "has shipped", DELIVERED: "was delivered", CANCELLED: "was cancelled" };
const SHIPMENT_EN: Record<ShipmentStatus, string> = { PENDING: "is waiting to be dispatched", LABEL_CREATED: "has a shipping label", IN_TRANSIT: "is on its way", OUT_FOR_DELIVERY: "is out for delivery", DELIVERED: "was delivered", CANCELLED: "was cancelled", RETURNED: "was returned" };
const REFUND_EN: Record<RefundStatus, string> = { REQUESTED: "was received and is under review", APPROVED: "was approved", REJECTED: "was rejected", PROCESSED: "was processed: the money is on its way to your payment method", CANCELLED: "was cancelled" };
const TIERS_EN: Record<LoyaltyTier, string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", PLATINUM: "Platinum" };

const en: Dictionary = {
  notifications: {
    passwordChanged: () => ({ title: "Your password was changed", body: "If this wasn't you, reset your password right away." }),
    orderPlaced: (p) => ({ title: `Order ${p.orderNumber} confirmed`, body: `We received your payment of ${formatMoney(p.totalCents, p.currency, "en")}. We'll let you know when it ships.` }),
    orderStatus: (p) => ({ title: `Order ${p.orderNumber}`, body: `Your order ${ORDER_EN[p.status]}.` }),
    orderCancelled: (p) => ({ title: `Order ${p.orderNumber} cancelled`, body: `Reason: ${p.reason}. If you already paid, the refund is processed automatically.` }),
    paymentFailed: (p) => ({ title: "We couldn't process your payment", body: `${p.reason}. You can try again with another payment method.` }),
    shipmentUpdated: (p) => ({ title: `Shipment for order ${p.orderNumber}`, body: `Your shipment ${SHIPMENT_EN[p.status]}${p.trackingNumber ? ` (tracking ${p.trackingNumber})` : ""}.` }),
    refundUpdated: (p) => ({ title: "Update on your return", body: `Your request for ${formatMoney(p.amountCents, p.currency, "en")} ${REFUND_EN[p.status]}.` }),
    invoiceIssued: (p) => ({ title: `Invoice ${p.number} available`, body: "Your electronic invoice was issued. You can download it from the order details." }),
    tierUpgraded: (p) => ({ title: `You reached the ${TIERS_EN[p.tier]} tier!`, body: "You unlocked a collectible NFT badge. Link your wallet to receive it." }),
    badgeMinted: (p) => ({ title: `Your ${TIERS_EN[p.tier]} badge is in your wallet`, body: `Transaction ${p.txHash.slice(0, 10)}… confirmed on the blockchain.` }),
    reviewModerated: (p) => (p.approved ? { title: "Your review was published", body: "Thanks for helping other shoppers." } : { title: "Your review was not published", body: "It doesn't meet the community guidelines." }),
    reviewReplied: () => ({ title: "The seller replied to your review", body: "Check the reply in your account." }),
  },
  loyaltyReasons: {
    PURCHASE: (p) => `Purchase ${p.orderNumber}`,
    REFUND_ADJUSTMENT: () => "Return adjustment",
    EXPIRATION: () => "Points expiration",
  },
  tiers: TIERS_EN,
  email: {
    footer: "eCommerce Web3 · This is an automated message, please don't reply to this email.",
    linkFallback: "If the button doesn't work, copy this link:",
    viewDetail: "View details",
    verify: {
      subject: "Verify your account",
      heading: (name) => `Hi ${name}, confirm your email`,
      body: "Thanks for signing up. Confirm your email address to activate your account. The link expires in 24 hours.",
      cta: "Verify my account",
      text: (name, url) => `Hi ${name}, verify your account at: ${url} (expires in 24 hours).`,
    },
    reset: {
      subject: "Reset your password",
      heading: (name) => `Hi ${name}`,
      body: "We received a request to reset your password. The link expires in 1 hour. If this wasn't you, ignore this message.",
      cta: "Create a new password",
      text: (url) => `Reset your password at: ${url} (expires in 1 hour). If this wasn't you, ignore this message.`,
    },
    passwordChanged: {
      subject: "Your password was changed",
      heading: (name) => `Hi ${name}`,
      body: "Your password was changed successfully and we signed out your other sessions. If this wasn't you, reset it right away.",
      text: "Your password was changed. If this wasn't you, reset it right away.",
    },
    twoFactor: {
      subject: (code) => `Your access code: ${code}`,
      heading: (name) => `Hi ${name}, here is your code`,
      expires: "It expires in 10 minutes. Never share it.",
      text: (code) => `Your access code is ${code}. It expires in 10 minutes.`,
    },
  },
};

export const MESSAGES: Record<Locale, Dictionary> = { es, en };

export function renderNotification<K extends NotificationKey>(locale: Locale, key: K, params: NotificationParams[K]): RenderedNotification {
  return MESSAGES[locale].notifications[key](params);
}

export function renderStoredNotification(locale: Locale, key: string | null | undefined, params: unknown): RenderedNotification | null {
  if (!key || !(NOTIFICATION_KEYS as readonly string[]).includes(key)) return null;
  const render = MESSAGES[locale].notifications[key as NotificationKey] as (params: unknown) => RenderedNotification;
  return render(params ?? {});
}

export function renderLoyaltyReason(locale: Locale, code: string | null, params: unknown, fallback: string): string {
  if (!code || !(LOYALTY_REASON_CODES as readonly string[]).includes(code)) return fallback;
  const render = MESSAGES[locale].loyaltyReasons[code as LoyaltyReasonCode] as (params: unknown) => string;
  return render(params ?? {});
}

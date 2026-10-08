// route.ts (POST /api/webhooks/stripe) => NO se usa: el webhook de Stripe lo recibe Express en
// POST /webhook/payment/stripe (verifica la firma con el cuerpo crudo e idempotencia). Tener dos receptores del mismo
// evento duplicaría la lógica de pagos. Responde 410 Gone para que una configuración errónea en Stripe sea evidente.
import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Configura el webhook de Stripe hacia el backend: /webhook/payment/stripe",
      code: "WEBHOOK_MOVED",
    },
    { status: 410 }
  );
}

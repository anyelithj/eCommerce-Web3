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

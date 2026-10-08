// route.ts (POST /api/webhooks/inventory) => Fase 9 (inventario en tiempo real con Rust). Pendiente de implementar.
// Responde 501 Not Implemented: contrato explícito para quien intente integrarse antes de tiempo.
import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Webhook de inventario pendiente (Fase 9)",
      code: "NOT_IMPLEMENTED",
    },
    { status: 501 }
  );
}

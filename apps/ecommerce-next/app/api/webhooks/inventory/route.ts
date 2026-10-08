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

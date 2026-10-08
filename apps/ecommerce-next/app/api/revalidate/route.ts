// route.ts (POST /api/revalidate) => revalidación ISR bajo demanda (Route Handler de Next.js 15).
// Express la llama tras modificar el catálogo: las páginas cacheadas con esa etiqueta se regeneran en la
// siguiente visita, sin esperar el vencimiento de 60 s (datos frescos + páginas estáticas rápidas).
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

// Solo se aceptan etiquetas conocidas (lista blanca): nadie puede vaciar cachés arbitrarias
const BodySchema = z.object({
  tags: z
    .array(z.enum(["catalog", "products", "categories"]))
    .min(1)
    .max(10),
});

// isAuthorized => comparación en tiempo constante del secreto compartido (evita ataques de temporización)
function isAuthorized(provided: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request.headers.get("x-revalidate-secret"))) {
    return NextResponse.json(
      { success: false, message: "No autorizado", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  // "safeParse" => cuerpo inválido responde 400 en vez de lanzar
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Etiquetas inválidas", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  parsed.data.tags.forEach((tag) => revalidateTag(tag)); // Marca como obsoletos los fetch con esa etiqueta
  return NextResponse.json({ success: true, data: { revalidated: parsed.data.tags } });
}

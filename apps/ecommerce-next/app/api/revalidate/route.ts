import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  tags: z
    .array(z.enum(["catalog", "products", "categories"]))
    .min(1)
    .max(10),
});

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
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Etiquetas inválidas", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  parsed.data.tags.forEach((tag) => revalidateTag(tag));
  return NextResponse.json({ success: true, data: { revalidated: parsed.data.tags } });
}

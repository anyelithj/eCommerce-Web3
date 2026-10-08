// validation.pipe.ts => "pipes" de validación reutilizables para params y query (Zod).
// DRY: todos los controllers validan ":id" y ":slug" con el mismo schema en vez de repetir la regla.
import type { Request } from "express";
import { z } from "zod";

// IdParamSchema => ":id" debe ser un UUID (evita consultas con IDs basura y errores de cast en Postgres)
export const IdParamSchema = z.object({
  id: z.string().uuid({ message: "id debe ser un UUID válido" }),
});

// parseId => extrae y valida req.params.id; lanza ZodError (400) si no es válido
export function parseId(req: Request, param = "id"): string {
  // "z.string().uuid().parse" => valida y devuelve el valor ya tipado como string
  return z
    .string()
    .uuid({ message: `${param} debe ser un UUID válido` })
    .parse(req.params[param]);
}

// isUuid => distingue "/product/<uuid>" de "/product/<slug>" (rutas que aceptan ambos para URLs SEO)
export function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success; // "safeParse" => no lanza, devuelve { success }
}

// parseParam => parámetro de ruta no vacío (slugs, códigos)
export function parseParam(req: Request, param: string): string {
  return z.string().min(1).parse(req.params[param]);
}

// parseObjectId => ":id" de documentos MongoDB (24 caracteres hexadecimales)
export function parseObjectId(req: Request, param = "id"): string {
  return z
    .string()
    .regex(/^[a-f\d]{24}$/i, { message: `${param} debe ser un ObjectId válido` })
    .parse(req.params[param]);
}

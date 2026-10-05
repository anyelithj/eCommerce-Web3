import type { Request } from "express";
import { z } from "zod";

export const IdParamSchema = z.object({ id: z.string().uuid({ message: "id debe ser un UUID válido" }) });

export function parseId(req: Request, param = "id"): string {
  return z.string().uuid({ message: `${param} debe ser un UUID válido` }).parse(req.params[param]);
}

export function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

export function parseParam(req: Request, param: string): string {
  return z.string().min(1).parse(req.params[param]);
}

export function parseObjectId(req: Request, param = "id"): string {
  return z.string().regex(/^[a-f\d]{24}$/i, { message: `${param} debe ser un ObjectId válido` }).parse(req.params[param]);
}

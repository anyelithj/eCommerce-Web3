// product.schema.ts => validación Zod del módulo Product (entrada de la API = contrato ejecutable).
import { z } from "zod";
import { PaginationQuerySchema } from "../../../shared/util/pagination.util";
import { queryBoolean } from "../../../shared/pipe/transform.pipe";

// VariantSchema => unidad vendible (SKU + precio + stock). Montos en centavos (enteros)
export const VariantSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,40}$/, { message: "SKU: 3-40 caracteres A-Z, 0-9 o guion" }),
  name: z.string().trim().min(1).max(80),
  // "z.record(z.string())" => objeto clave->valor libre ({ color: "Rojo", size: "M" })
  attributes: z.record(z.string().max(40)).default({}),
  priceCents: z.number().int().min(0),
  compareAtPriceCents: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0),
  weightGrams: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

// UpdateVariantSchema => variante del PATCH con stock opcional (ver UpdateProductSchema)
export const UpdateVariantSchema = VariantSchema.extend({
  stock: z.number().int().min(0).optional(),
});

// ImageSchema => imagen ya subida a Cloudinary (POST /api/v1/media/upload devuelve url/publicId/width/height)
export const ImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  alt: z
    .string()
    .trim()
    .min(1, { message: "El texto alternativo es obligatorio (accesibilidad y SEO)" })
    .max(160),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  variantSku: z.string().optional(), // Asocia la imagen a una variante (ej. color rojo)
});

// Validación cruzada: SKUs únicos dentro del mismo payload
const uniqueSkus = (variants: Array<{ sku: string }> | undefined) =>
  !variants || new Set(variants.map((variant) => variant.sku)).size === variants.length;

// CreateProductSchema => POST /api/v1/product ("crear producto con datos y categorías")
export const CreateProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().trim().min(10).max(10_000),
  status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
  currency: z.string().length(3).toUpperCase().default("COP"),
  categoryId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  variants: z
    .array(VariantSchema)
    .min(1, { message: "Se requiere al menos una variante" })
    .max(100)
    .refine(uniqueSkus, "SKU repetido"),
  images: z.array(ImageSchema).max(20).default([]),
});

// UpdateProductSchema => PATCH parcial ("actualizar producto, stock, imágenes, precio")
// - variants: se hace UPSERT por SKU (crear nuevas / actualizar existentes)
// - removeVariantSkus: variantes a desactivar (no se borran: las órdenes históricas las referencian)
// - images: si llega, REEMPLAZA la galería completa (el orden del arreglo es la posición)
export const UpdateProductSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().trim().min(10).max(10_000).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  // En el PATCH el stock es opcional: el stock de variantes existentes se gestiona con movimientos del módulo
  // Inventory (Fase 7, fuente de verdad auditable); si se omite, la variante conserva su stock actual
  variants: z.array(UpdateVariantSchema).max(100).refine(uniqueSkus, "SKU repetido").optional(),
  removeVariantSkus: z.array(z.string()).optional(),
  images: z.array(ImageSchema).max(20).optional(),
});

// Ordenamientos soportados (lista cerrada => sin inyección de columnas arbitrarias en ORDER BY)
export const ProductSorts = ["newest", "price_asc", "price_desc", "rating", "name"] as const;

// ListProductsQuerySchema => GET /api/v1/product ("listar productos con filtros y paginación")
export const ListProductsQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  category: z.string().optional(), // ID o slug; incluye subcategorías
  brand: z.string().optional(), // ID o slug
  collection: z.string().optional(), // slug
  minPrice: z.coerce.number().int().min(0).optional(), // centavos
  maxPrice: z.coerce.number().int().min(0).optional(),
  inStock: queryBoolean,
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(), // Solo tiene efecto para staff
  sort: z.enum(ProductSorts).default("newest"),
});

// DeleteAllProductsSchema => "archivar lote de productos"
export const DeleteAllProductsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export type VariantInput = z.infer<typeof VariantSchema>;
export type UpdateVariantInput = z.infer<typeof UpdateVariantSchema>;
export type ImageInput = z.infer<typeof ImageSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ListProductsQuery = z.infer<typeof ListProductsQuerySchema>;

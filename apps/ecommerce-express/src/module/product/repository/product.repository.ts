// product.repository.ts => acceso a datos de productos (patrón Repository sobre Prisma).
// Toda escritura que toca producto + variantes + imágenes ocurre en UNA transacción (Unit of Work).
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../config/database.config";
import { availableStock, computePriceRange } from "../model/product.model";
import type { ProductDetailDto, ProductListItemDto } from "../dto/product.dto";
import type { ProductFilter } from "../types/product.types";
import type { ImageInput, UpdateVariantInput, VariantInput } from "../schema/product.schema";
import type { PageParams, Paginated } from "../../../shared/types/pagination.types";

// Select de la tarjeta de listado: solo lo que se muestra (proyección => menos datos transferidos)
const LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  currency: true,
  minPriceCents: true,
  maxPriceCents: true,
  ratingAvg: true,
  ratingCount: true,
  images: { take: 1, orderBy: { position: "asc" }, select: { url: true, alt: true } },
  variants: {
    where: { isActive: true },
    select: { priceCents: true, compareAtPriceCents: true, stock: true, reservedStock: true },
  },
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT, // Spread: el detalle es un superconjunto del listado (DRY)
  description: true,
  vendorId: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      url: true,
      publicId: true,
      alt: true,
      width: true,
      height: true,
      position: true,
      variantId: true,
    },
  },
  variants: {
    orderBy: { priceCents: "asc" },
    select: {
      id: true,
      sku: true,
      name: true,
      attributes: true,
      priceCents: true,
      compareAtPriceCents: true,
      stock: true,
      reservedStock: true,
      weightGrams: true,
      isActive: true,
    },
  },
  collections: {
    select: { collection: { select: { id: true, name: true, slug: true, isActive: true } } },
  },
} satisfies Prisma.ProductSelect;

type ListRow = Prisma.ProductGetPayload<{ select: typeof LIST_SELECT }>;
type DetailRow = Prisma.ProductGetPayload<{ select: typeof DETAIL_SELECT }>;

// ORDER BY por tipo de orden (Strategy declarativa: mapa en vez de if/else)
const ORDER_BY: Record<ProductFilter["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  price_asc: [{ minPriceCents: "asc" }, { createdAt: "desc" }],
  price_desc: [{ maxPriceCents: "desc" }, { createdAt: "desc" }],
  rating: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
  name: [{ name: "asc" }],
};

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // findMany => "listar productos con filtros y paginación"
  public async findMany(
    filter: ProductFilter,
    page: PageParams
  ): Promise<Paginated<ProductListItemDto>> {
    const where = this.buildWhere(filter);
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: LIST_SELECT,
        orderBy: ORDER_BY[filter.sort],
        skip: page.skip,
        take: page.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: rows.map(toListItem), total };
  }

  // findCardsByIds => tarjetas de productos en el MISMO orden de los IDs recibidos (ranking de la búsqueda)
  public async findCardsByIds(ids: string[]): Promise<ProductListItemDto[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      select: LIST_SELECT,
    });
    const byId = new Map(rows.map((row) => [row.id, toListItem(row)]));
    // "flatMap" => reordena según "ids" y descarta los que ya no estén activos
    return ids.flatMap((id) => {
      const card = byId.get(id);
      return card ? [card] : [];
    });
  }

  // findDetail => "producto con variantes e imágenes por ID" (o por slug, para URLs SEO)
  public async findDetail(idOrSlug: string, isUuid: boolean): Promise<ProductDetailDto | null> {
    const row = await this.prisma.product.findUnique({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      select: DETAIL_SELECT,
    });
    return row ? toDetail(row) : null;
  }

  public async findOwnership(id: string): Promise<{ vendorId: string | null } | null> {
    return this.prisma.product.findUnique({ where: { id }, select: { vendorId: true } });
  }

  public async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    return (
      (await this.prisma.product.count({
        where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      })) > 0
    );
  }

  // findSkusOwnedByOthers => SKUs del payload que ya pertenecen a OTRO producto (conflicto de inventario)
  public async findSkusOwnedByOthers(skus: string[], productId?: string): Promise<string[]> {
    const rows = await this.prisma.productVariant.findMany({
      where: { sku: { in: skus }, ...(productId ? { NOT: { productId } } : {}) },
      select: { sku: true },
    });
    return rows.map((row) => row.sku);
  }

  // create => producto + variantes + imágenes en una transacción
  public async create(
    data: Omit<
      Prisma.ProductUncheckedCreateInput,
      "variants" | "images" | "minPriceCents" | "maxPriceCents"
    >,
    variants: VariantInput[],
    images: ImageInput[]
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...data,
          ...computePriceRange(variants), // min/max desnormalizados desde las variantes
          variants: { create: variants.map(toVariantData) },
        },
        select: { id: true },
      });
      await this.replaceImages(tx, product.id, images);
      return product.id;
    });
  }

  // update => campos + UPSERT de variantes por SKU + desactivación + reemplazo de imágenes + recálculo de precios
  public async update(
    id: string,
    fields: Prisma.ProductUncheckedUpdateInput,
    variants: UpdateVariantInput[] | undefined,
    removeSkus: string[] | undefined,
    images: ImageInput[] | undefined
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (variants) {
        // "for...of" secuencial dentro de la transacción: cada upsert usa la misma conexión
        for (const variant of variants) {
          const data = toVariantData(variant);
          // Variante nueva sin stock => 0; existente sin stock => conserva el actual (lo gestiona Inventory)
          await tx.productVariant.upsert({
            where: { sku: variant.sku },
            update: data,
            create: { ...data, stock: variant.stock ?? 0, productId: id },
          });
        }
      }
      if (removeSkus?.length) {
        await tx.productVariant.updateMany({
          where: { productId: id, sku: { in: removeSkus } },
          data: { isActive: false },
        });
      }
      if (images) await this.replaceImages(tx, id, images);

      // Recalcula el rango de precios con el estado FINAL de las variantes
      const current = await tx.productVariant.findMany({
        where: { productId: id },
        select: { priceCents: true, isActive: true },
      });
      await tx.product.update({
        where: { id },
        data: { ...fields, ...computePriceRange(current) },
      });
    });
  }

  public async countActiveVariants(id: string): Promise<number> {
    return this.prisma.productVariant.count({ where: { productId: id, isActive: true } });
  }

  // archive => "archivar producto del catálogo" (soft delete; vendorId restringe a los productos propios)
  public async archive(ids: string[], vendorId?: string): Promise<number> {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids }, status: { not: "ARCHIVED" }, ...(vendorId ? { vendorId } : {}) },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
    return result.count;
  }

  // updateRating => recalcula el promedio desde las reseñas APROBADAS (lo invoca el módulo Review)
  public async updateRating(productId: string): Promise<void> {
    const aggregate = await this.prisma.review.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        ratingAvg: Number((aggregate._avg.rating ?? 0).toFixed(2)),
        ratingCount: aggregate._count._all,
      },
    });
  }

  // replaceImages => borra la galería y la recrea en el orden recibido (la posición = índice)
  private async replaceImages(
    tx: Prisma.TransactionClient,
    productId: string,
    images: ImageInput[]
  ): Promise<void> {
    await tx.productImage.deleteMany({ where: { productId } });
    if (images.length === 0) return;
    const skus = images
      .map((image) => image.variantSku)
      .filter((sku): sku is string => Boolean(sku));
    // Resuelve SKU -> variantId para las imágenes asociadas a una variante
    const variantIdBySku = new Map(
      (
        await tx.productVariant.findMany({
          where: { productId, sku: { in: skus } },
          select: { id: true, sku: true },
        })
      ).map((variant) => [variant.sku, variant.id])
    );
    await tx.productImage.createMany({
      data: images.map((image, position) => ({
        productId,
        url: image.url,
        publicId: image.publicId,
        alt: image.alt,
        width: image.width ?? null,
        height: image.height ?? null,
        position,
        variantId: image.variantSku ? (variantIdBySku.get(image.variantSku) ?? null) : null,
      })),
    });
  }

  // buildWhere => traduce el filtro de dominio a un WHERE de Prisma (cada filtro ausente no agrega condición)
  private buildWhere(filter: ProductFilter): Prisma.ProductWhereInput {
    return {
      status: { in: filter.statuses },
      ...(filter.vendorId ? { vendorId: filter.vendorId } : {}),
      ...(filter.categoryIds ? { categoryId: { in: filter.categoryIds } } : {}),
      ...(filter.brandId ? { brandId: filter.brandId } : {}),
      ...(filter.collectionSlug
        ? { collections: { some: { collection: { slug: filter.collectionSlug } } } }
        : {}),
      ...(filter.q ? { name: { contains: filter.q, mode: "insensitive" } } : {}),
      AND: priceRangeWhere(filter), // Rango de precio (helper aparte: SRP + menor complejidad ciclomática)
      ...(filter.inStock ? { variants: { some: { isActive: true, stock: { gt: 0 } } } } : {}),
    };
  }
}

// priceRangeWhere => condiciones de precio sobre los valores desnormalizados (usa el índice de minPriceCents).
// Un producto entra si su rango [min, max] se solapa con el rango pedido.
function priceRangeWhere(
  filter: Pick<ProductFilter, "minPrice" | "maxPrice">
): Prisma.ProductWhereInput[] {
  const conditions: Prisma.ProductWhereInput[] = [];
  if (filter.minPrice !== undefined) conditions.push({ maxPriceCents: { gte: filter.minPrice } });
  if (filter.maxPrice !== undefined) conditions.push({ minPriceCents: { lte: filter.maxPrice } });
  return conditions; // Arreglo vacío => "AND: []" no restringe nada
}

// --- Mapeos fila -> DTO (funciones puras) ---

function toVariantData(variant: VariantInput | UpdateVariantInput) {
  return {
    sku: variant.sku,
    name: variant.name,
    attributes: variant.attributes as Prisma.InputJsonValue, // Json de Prisma
    priceCents: variant.priceCents,
    compareAtPriceCents: variant.compareAtPriceCents ?? null,
    // Spread condicional: sin stock en el PATCH no se toca la columna (las reservas siguen coherentes)
    ...(variant.stock !== undefined ? { stock: variant.stock } : {}),
    weightGrams: variant.weightGrams,
    isActive: variant.isActive,
  };
}

function toListItem(row: ListRow): ProductListItemDto {
  // Variante más barata => su precio "antes" alimenta el badge de descuento
  const cheapest = [...row.variants].sort((a, b) => a.priceCents - b.priceCents)[0];
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    currency: row.currency,
    minPriceCents: row.minPriceCents,
    maxPriceCents: row.maxPriceCents,
    compareAtPriceCents: cheapest?.compareAtPriceCents ?? null,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    imageUrl: row.images[0]?.url ?? null,
    imageAlt: row.images[0]?.alt ?? null,
    inStock: row.variants.some((variant) => availableStock(variant) > 0),
    brand: row.brand,
    category: row.category,
  };
}

function toDetail(row: DetailRow): ProductDetailDto {
  const {
    imageUrl: _imageUrl,
    imageAlt: _imageAlt,
    ...base
  } = toListItem({ ...row, images: row.images.slice(0, 1) });
  return {
    ...base,
    description: row.description,
    vendorId: row.vendorId,
    variants: row.variants.map(({ stock, reservedStock, attributes, ...variant }) => ({
      ...variant,
      // "as Record<string,string>" => el Json se valida al escribir (VariantSchema), aquí solo se tipa
      attributes: (attributes ?? {}) as Record<string, string>,
      available: availableStock({ stock, reservedStock }),
    })),
    images: row.images,
    collections: row.collections
      .filter(({ collection }) => collection.isActive)
      .map(({ collection: { isActive: _active, ...collection } }) => collection),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const productRepository = new ProductRepository(prisma);

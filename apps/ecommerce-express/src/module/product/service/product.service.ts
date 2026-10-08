// product.service.ts => casos de uso del catálogo de productos (Fase 2.1).
// Orquesta: resolución de filtros (categorías/marcas), visibilidad por rol, ownership del vendedor, cache.
import type { Prisma } from "@prisma/client";
import { productRepository, type ProductRepository } from "../repository/product.repository";
import { canManageProduct, isStaffViewer } from "../model/product.model";
import {
  DuplicateSkuException,
  ProductNotFoundException,
  ProductOwnershipException,
  ProductWithoutVariantsException,
} from "../exception/product.exception";
import type { ProductDetailDto, ProductListItemDto } from "../dto/product.dto";
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "../schema/product.schema";
import type { ProductFilter, ProductViewer } from "../types/product.types";
import { prisma } from "../../../config/database.config";
import { NotFoundException } from "../../../shared/filter/http-exception.filter";
import { slugify, uniqueSlug } from "../../../shared/util/slugify.util";
import { buildPaginationMeta, toPageParams } from "../../../shared/util/pagination.util";
import type { PaginationMeta } from "../../../shared/types/pagination.types";
import { cached, invalidateCatalog } from "../../../shared/interceptor/cache.interceptor";
import { isUuid } from "../../../shared/pipe/validation.pipe";
import { RedisKeys } from "../../../config/redis.config";
import { Roles } from "../../../shared/constants/roles.constants";

const PUBLIC_CACHE_TTL = 60; // 60 s: coherente con la revalidación ISR de 60 s del storefront (sprint 2.2)

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  // listProducts => "listar productos con filtros y paginación"
  public async listProducts(
    query: ListProductsQuery,
    viewer?: ProductViewer
  ): Promise<{ items: ProductListItemDto[]; meta: PaginationMeta }> {
    const page = toPageParams(query);
    const filter = await this.resolveFilter(query, viewer);
    const load = async () => {
      const { items, total } = await this.repository.findMany(filter, page);
      return { items, meta: buildPaginationMeta(page, total) };
    };
    // Solo las consultas públicas se cachean (las del staff dependen del usuario y deben verse al instante)
    return isStaffViewer(viewer)
      ? load()
      : cached(
          RedisKeys.catalog("product", `list:${JSON.stringify(query)}`),
          PUBLIC_CACHE_TTL,
          load
        );
  }

  // getProductById => "producto con variantes e imágenes por ID" (o slug)
  public async getProductById(idOrSlug: string, viewer?: ProductViewer): Promise<ProductDetailDto> {
    const load = () => this.repository.findDetail(idOrSlug, isUuid(idOrSlug));
    const product = isStaffViewer(viewer)
      ? await load()
      : await cached(RedisKeys.catalog("product", `detail:${idOrSlug}`), PUBLIC_CACHE_TTL, load);

    // El público solo ve productos ACTIVE; el staff ve lo que puede gestionar
    const visible =
      product &&
      (product.status === "ACTIVE" ||
        (viewer !== undefined && canManageProduct(viewer, product.vendorId)));
    if (!product || !visible) throw new ProductNotFoundException(idOrSlug);

    // Las variantes inactivas solo interesan al staff (el público no puede comprarlas)
    return isStaffViewer(viewer)
      ? product
      : { ...product, variants: product.variants.filter((variant) => variant.isActive) };
  }

  // createProduct => "crear producto con datos y categorías"
  public async createProduct(
    input: CreateProductInput,
    viewer: ProductViewer
  ): Promise<ProductDetailDto> {
    await this.assertSkusAvailable(input.variants.map((variant) => variant.sku));
    const baseSlug = input.slug ?? slugify(input.name);
    const id = await this.repository.create(
      {
        name: input.name,
        slug: (await this.repository.slugTaken(baseSlug)) ? uniqueSlug(baseSlug) : baseSlug,
        description: input.description,
        status: input.status,
        currency: input.currency,
        categoryId: input.categoryId ?? null,
        brandId: input.brandId ?? null,
        vendorId: viewer.id, // El creador es el vendedor dueño (ownership)
      },
      input.variants,
      input.images
    );
    await this.invalidateCache();
    return this.getProductById(id, viewer);
  }

  // updateProduct => "actualizar producto, stock, imágenes, precio — PATCH parcial"
  public async updateProduct(
    id: string,
    input: UpdateProductInput,
    viewer: ProductViewer
  ): Promise<ProductDetailDto> {
    await this.assertCanManage(id, viewer);
    if (input.variants)
      await this.assertSkusAvailable(
        input.variants.map((variant) => variant.sku),
        id
      );

    const { variants, removeVariantSkus, images, slug, ...fields } = input;
    // "Record<string, unknown>" => objeto dinámico de cambios; se tipa como input de Prisma al enviarlo
    const changes: Record<string, unknown> = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined)
    );
    if (slug)
      changes["slug"] = (await this.repository.slugTaken(slug, id)) ? uniqueSlug(slug) : slug;
    if (input.status === "ARCHIVED") changes["archivedAt"] = new Date();

    await this.repository.update(
      id,
      changes as Prisma.ProductUncheckedUpdateInput,
      variants,
      removeVariantSkus,
      images
    );

    // Regla: un producto publicado debe tener al menos una variante activa (se valida con el estado final)
    const detail = await this.repository.findDetail(id, true);
    if (detail?.status === "ACTIVE" && (await this.repository.countActiveVariants(id)) === 0) {
      await this.repository.update(id, { status: "DRAFT" }, undefined, undefined, undefined); // Compensación
      throw new ProductWithoutVariantsException();
    }
    await this.invalidateCache();
    return this.getProductById(id, viewer);
  }

  // deleteProductById => "archivar producto del catálogo"
  public async deleteProductById(id: string, viewer: ProductViewer): Promise<void> {
    await this.assertCanManage(id, viewer);
    await this.repository.archive([id]);
    await this.invalidateCache();
  }

  // deleteAllProducts => "archivar lote de productos" (un VENDOR solo archiva los suyos)
  public async deleteAllProducts(
    ids: string[],
    viewer: ProductViewer
  ): Promise<{ archived: number }> {
    const vendorScope = viewer.roles.includes(Roles.ADMIN) ? undefined : viewer.id;
    const archived = await this.repository.archive(ids, vendorScope);
    await this.invalidateCache();
    return { archived };
  }

  // updateRating => expuesto para el módulo Review (el agregado se mantiene en un solo lugar)
  public async refreshRating(productId: string): Promise<void> {
    await this.repository.updateRating(productId);
    await this.invalidateCache();
  }

  // categoryBranchIds => categoría (id o slug) + todas sus descendientes (recorrido BFS por niveles)
  private async categoryBranchIds(idOrSlug: string): Promise<string[]> {
    const root = await prisma.category.findFirst({
      where: { deletedAt: null, ...(isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }) },
      select: { id: true },
    });
    if (!root) throw new NotFoundException("Category", idOrSlug);
    const ids = [root.id];
    for (let level = [root.id]; level.length > 0;) {
      const children = await prisma.category.findMany({
        where: { parentId: { in: level }, deletedAt: null },
        select: { id: true },
      });
      level = children.map((child) => child.id).filter((id) => !ids.includes(id));
      ids.push(...level);
    }
    return ids;
  }

  // brandId => marca (id o slug) -> id
  private async brandId(idOrSlug: string): Promise<string> {
    const brand = await prisma.brand.findFirst({
      where: { deletedAt: null, ...(isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }) },
      select: { id: true },
    });
    if (!brand) throw new NotFoundException("Brand", idOrSlug);
    return brand.id;
  }

  // resolveFilter => slugs -> IDs, categoría -> rama completa, visibilidad por rol (el repository recibe IDs)
  private async resolveFilter(
    query: ListProductsQuery,
    viewer?: ProductViewer
  ): Promise<ProductFilter> {
    const staff = isStaffViewer(viewer);
    const isAdmin = viewer?.roles.includes(Roles.ADMIN) ?? false;
    return {
      q: query.q,
      categoryIds: query.category ? await this.categoryBranchIds(query.category) : undefined,
      brandId: query.brand ? await this.brandId(query.brand) : undefined,
      collectionSlug: query.collection,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      inStock: query.inStock,
      // Público: solo ACTIVE. Staff: el estado pedido (o todos). VENDOR: además restringido a lo suyo si no es ACTIVE
      statuses: staff
        ? query.status
          ? [query.status]
          : ["DRAFT", "ACTIVE", "ARCHIVED"]
        : ["ACTIVE"],
      vendorId: staff && !isAdmin && query.status !== "ACTIVE" ? viewer.id : undefined,
      sort: query.sort,
    };
  }

  private async assertCanManage(id: string, viewer: ProductViewer): Promise<void> {
    const ownership = await this.repository.findOwnership(id);
    if (!ownership) throw new ProductNotFoundException(id);
    if (!canManageProduct(viewer, ownership.vendorId)) throw new ProductOwnershipException();
  }

  private async assertSkusAvailable(skus: string[], productId?: string): Promise<void> {
    const conflicts = await this.repository.findSkusOwnedByOthers(skus, productId);
    if (conflicts.length > 0) throw new DuplicateSkuException(conflicts);
  }

  private async invalidateCache(): Promise<void> {
    // Los conteos de productos por marca/categoría/colección también cambian
    await invalidateCatalog("product", "brand", "category", "collection");
  }
}

export const productService = new ProductService(productRepository);

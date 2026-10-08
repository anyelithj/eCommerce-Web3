"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { FieldArray, FormikProvider } from "formik";
import { useAdminGet } from "../api/dashboard.api";
import { AdminResource, toOptions, useAdminCommand } from "./AdminResource";
import { SelectField, TextAreaField } from "./AdminFields";
import { StatusBadge } from "./OrdersAdmin";
import {
  productSchema,
  type ProductFormValues,
  type ProductPayload,
} from "../lib/dashboard.validator";
import type {
  CategoryNode,
  ProductCard,
  ProductDetail,
  Brand,
} from "@/entities/product/model/product.types";
import { useZodForm } from "@/shared/hook/useZodForm";
import { useFormat } from "@/shared/hook/useFormat";
import { Link, useRouter } from "@/shared/lib/i18n/navigation";
import { routes } from "@/shared/constants/routes";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { Skeleton } from "@/shared/ui/Skeleton";

const STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export function ProductsAdmin() {
  const t = useTranslations("admin.products");
  const format = useFormat();
  const statusOptions = toOptions(STATUSES, (value) => t(`statuses.${value}`));
  return (
    <AdminResource<ProductCard>
      resource="products"
      path="/product"
      title={t("title")}
      search="q"
      rowLabel={(row) => row.name}
      filters={[{ name: "status", label: t("status"), options: statusOptions }]}
      toolbar={
        <Button asChild>
          <Link href={routes.adminProductNew}>{t("new")}</Link>
        </Button>
      }
      columns={[
        {
          key: "name",
          header: t("name"),
          cell: (row) => (
            <span className="flex items-center gap-2">
              {row.imageUrl && (
                <Image
                  src={row.imageUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 rounded object-cover"
                />
              )}
              <span className="font-medium">{row.name}</span>
            </span>
          ),
        },
        {
          key: "status",
          header: t("status"),
          cell: (row) => (
            <StatusBadge
              status={
                row.status === "ACTIVE"
                  ? "DELIVERED"
                  : row.status === "ARCHIVED"
                    ? "CANCELLED"
                    : "PENDING"
              }
              label={t(`statuses.${row.status}`)}
            />
          ),
        },
        { key: "category", header: t("category"), cell: (row) => row.category?.name ?? "—" },
        {
          key: "price",
          header: t("price"),
          cell: (row) => format.money(row.minPriceCents, row.currency),
          className: "text-right",
        },
        {
          key: "stock",
          header: t("stock"),
          cell: (row) => (row.inStock ? t("inStock") : t("outOfStock")),
        },
      ]}
      actions={(row) => (
        <Button size="sm" variant="ghost" asChild>
          <Link href={routes.adminProductEdit(row.id)}>
            {t("edit")}
            <span className="sr-only"> {row.name}</span>
          </Link>
        </Button>
      )}
      remove
    />
  );
}

export function ProductForm({ productId }: { productId?: string }) {
  const product = useAdminGet<ProductDetail>(
    "products",
    productId ? `/product/${productId}` : null
  );
  if (productId && !product.data) return <Skeleton className="h-96 w-full" />;
  return <ProductFormBody product={product.data} />;
}

const toFormValues = (product?: ProductDetail): ProductFormValues => ({
  name: product?.name ?? "",
  description: product?.description ?? "",
  status: (product?.status as ProductFormValues["status"] | undefined) ?? "DRAFT",
  categoryId: product?.category?.id ?? "",
  brandId: product?.brand?.id ?? "",
  variants: product?.variants.map((variant) => ({
    sku: variant.sku,
    name: variant.name,
    price: variant.priceCents / 100,
    stock: variant.available,
  })) ?? [{ sku: "", name: "", price: 0, stock: 0 }],
  images:
    product?.images.map((image) => ({
      url: image.url,
      publicId: image.publicId,
      alt: image.alt,
      ...(image.width ? { width: image.width } : {}),
      ...(image.height ? { height: image.height } : {}),
    })) ?? [],
});

const flatten = (nodes: CategoryNode[], depth = 0): Array<{ value: string; label: string }> =>
  nodes.flatMap((node) => [
    { value: node.id, label: `${"— ".repeat(depth)}${node.name}` },
    ...flatten(node.children, depth + 1),
  ]);

function ProductFormBody({ product }: { product?: ProductDetail | undefined }) {
  const t = useTranslations("admin.products");
  const router = useRouter();
  const command = useAdminCommand(["products", "inventory"]);
  const categories = useAdminGet<CategoryNode[]>("categories", "/category");
  const brands = useAdminGet<Brand[]>("brands", "/brand");
  const originalSkus = new Set(product?.variants.map((variant) => variant.sku) ?? []);

  const toBody = (values: ProductPayload) => ({
    name: values.name,
    description: values.description,
    status: !product && values.status === "ARCHIVED" ? "DRAFT" : values.status,
    categoryId: values.categoryId ?? null,
    brandId: values.brandId ?? null,
    variants: values.variants.map((variant) => ({
      sku: variant.sku,
      name: variant.name,
      priceCents: variant.price,
      ...(originalSkus.has(variant.sku) ? {} : { stock: variant.stock }),
    })),
    ...(product
      ? {
          removeVariantSkus: [...originalSkus].filter(
            (sku) => !values.variants.some((variant) => variant.sku === sku)
          ),
        }
      : {}),
    images: values.images,
  });

  const form = useZodForm({
    schema: productSchema,
    initialValues: toFormValues(product),
    onSubmit: async (values) => {
      const ok = await command.run(
        product
          ? { path: `/product/${product.id}`, method: "PATCH", body: toBody(values) }
          : { path: "/product", method: "POST", body: toBody(values) }
      );
      if (ok) router.push(routes.adminProducts);
    },
  });

  return (
    <FormikProvider value={form}>
      <form noValidate onSubmit={form.handleSubmit} className="flex max-w-3xl flex-col gap-6">
        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="sr-only">{t("general")}</legend>
          <div className="sm:col-span-2">
            <Input label={t("name")} error={form.error("name")} {...form.getFieldProps("name")} />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              label={t("description")}
              rows={6}
              error={form.error("description")}
              {...form.getFieldProps("description")}
            />
          </div>
          <SelectField
            label={t("status")}
            options={toOptions(STATUSES, (value) => t(`statuses.${value}`))}
            {...form.getFieldProps("status")}
          />
          <SelectField
            label={t("category")}
            options={[{ value: "", label: "—" }, ...flatten(categories.data ?? [])]}
            {...form.getFieldProps("categoryId")}
          />
          <SelectField
            label={t("brand")}
            options={[
              { value: "", label: "—" },
              ...(brands.data ?? []).map((brand) => ({ value: brand.id, label: brand.name })),
            ]}
            {...form.getFieldProps("brandId")}
          />
        </fieldset>

        <FieldArray name="variants">
          {(helpers) => (
            <section aria-labelledby="variants-title" className="flex flex-col gap-3">
              <h2 id="variants-title" className="text-base font-semibold">
                {t("variants")}
              </h2>
              {form.values.variants.map((variant, index) => (
                <fieldset
                  key={index}
                  className="grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_120px_100px_auto] sm:items-end"
                >
                  <legend className="sr-only">{t("variantN", { n: index + 1 })}</legend>
                  <Input
                    label={t("sku")}
                    error={form.error(`variants.${index}.sku`)}
                    {...form.getFieldProps(`variants.${index}.sku`)}
                  />
                  <Input
                    label={t("variantName")}
                    error={form.error(`variants.${index}.name`)}
                    {...form.getFieldProps(`variants.${index}.name`)}
                  />
                  <Input
                    label={t("price")}
                    type="number"
                    min={0}
                    step="0.01"
                    error={form.error(`variants.${index}.price`)}
                    {...form.getFieldProps(`variants.${index}.price`)}
                  />
                  <Input
                    label={t("stock")}
                    type="number"
                    min={0}
                    disabled={originalSkus.has(variant.sku)}
                    hint={originalSkus.has(variant.sku) ? t("stockHint") : undefined}
                    error={form.error(`variants.${index}.stock`)}
                    {...form.getFieldProps(`variants.${index}.stock`)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={form.values.variants.length === 1}
                    onClick={() => helpers.remove(index)}
                  >
                    {t("removeVariant")}
                  </Button>
                </fieldset>
              ))}
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => helpers.push({ sku: "", name: "", price: 0, stock: 0 })}
              >
                {t("addVariant")}
              </Button>
            </section>
          )}
        </FieldArray>

        <FieldArray name="images">
          {(helpers) => (
            <section aria-labelledby="images-title" className="flex flex-col gap-3">
              <h2 id="images-title" className="text-base font-semibold">
                {t("images")}
              </h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {form.values.images.map((image, index) => (
                  <li key={image.publicId} className="flex gap-3 rounded-lg border p-2">
                    <Image
                      src={image.url}
                      alt=""
                      width={80}
                      height={80}
                      className="size-20 rounded object-cover"
                    />
                    <div className="flex flex-1 flex-col gap-2">
                      <Input
                        label={t("alt")}
                        error={form.error(`images.${index}.alt`)}
                        {...form.getFieldProps(`images.${index}.alt`)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-end"
                        onClick={() => helpers.remove(index)}
                      >
                        {t("removeImage")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </FieldArray>

        <div className="flex gap-2">
          <Button type="submit" loading={form.isSubmitting}>
            {product ? t("save") : t("create")}
          </Button>
          <Button variant="secondary" asChild>
            <Link href={routes.adminProducts}>{t("cancel")}</Link>
          </Button>
        </div>
      </form>
    </FormikProvider>
  );
}

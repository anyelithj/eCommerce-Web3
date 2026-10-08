// page.tsx (/dashboard/products/[id]/edit) => edición de un producto existente.
// "params" es una Promesa en Next.js 15: se espera (await) para leer el segmento dinámico [id].
import { getTranslations } from "next-intl/server";
import { ProductForm } from "@/features/admin-dashboard/ui/ProductsAdmin";
import { AdminHeading, adminMetadata } from "../../../AdminSection";
import { initPage } from "@/shared/lib/i18n/server";
import type { PageProps } from "@/shared/types/next.types";

export const generateMetadata = adminMetadata("productEdit");

export default async function ProductEditPage({ params }: PageProps<{ id: string }>) {
  await initPage(params);
  const { id } = await params;
  const t = await getTranslations("admin");
  return (
    <>
      <AdminHeading description={t("descriptions.productEdit")}>
        {t("nav.productEdit")}
      </AdminHeading>
      <ProductForm productId={id} />
    </>
  );
}

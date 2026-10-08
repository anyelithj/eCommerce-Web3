// page.tsx (/dashboard/products/new) => alta de producto (variantes, categoría, marca e imágenes).
// Server Component mínimo: metadatos + encabezado (adminPage) y el formulario (Client Component).
import { ProductForm } from "@/features/admin-dashboard/ui/ProductsAdmin";
import { adminMetadata, adminPage } from "../../AdminSection";

export const generateMetadata = adminMetadata("productNew");
export default adminPage("productNew", ProductForm);

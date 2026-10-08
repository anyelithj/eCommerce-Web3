// page.tsx (/dashboard/products) => Catálogo: listado y estado de productos.
// Server Component mínimo: metadatos + encabezado (adminPage) y la sección interactiva del panel (RBAC: layout (admin)).
import { ProductsAdmin } from "@/features/admin-dashboard/ui/ProductsAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("products");
export default adminPage("products", ProductsAdmin);

// page.tsx (/dashboard/inventory) => Inventario por variante y proveedores.
// Server Component mínimo: metadatos + encabezado (adminPage) y la sección interactiva del panel (RBAC: layout (admin)).
import { InventoryAdmin } from "@/features/admin-dashboard/ui/InventoryAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("inventory");
export default adminPage("inventory", InventoryAdmin);

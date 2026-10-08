// page.tsx (/dashboard/orders) => Pedidos, envíos, facturas y devoluciones.
// Server Component mínimo: metadatos + encabezado (adminPage) y la sección interactiva del panel (RBAC: layout (admin)).
import { OrdersAdmin } from "@/features/admin-dashboard/ui/OrdersAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("orders");
export default adminPage("orders", OrdersAdmin);

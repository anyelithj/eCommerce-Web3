// page.tsx (/dashboard/customers) => CRM: clientes, segmentos, LTV y vista 360°.
// Server Component mínimo: metadatos + encabezado (adminPage) y la sección interactiva del panel (RBAC: layout (admin)).
import { CustomersAdmin } from "@/features/admin-dashboard/ui/CustomersAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("customers");
export default adminPage("customers", CustomersAdmin);

// page.tsx (/dashboard/marketing) => Campañas, correos, plantillas y cupones.
// Server Component mínimo: metadatos + encabezado (adminPage) y la sección interactiva del panel (RBAC: layout (admin)).
import { MarketingAdmin } from "@/features/admin-dashboard/ui/MarketingAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("marketing");
export default adminPage("marketing", MarketingAdmin);

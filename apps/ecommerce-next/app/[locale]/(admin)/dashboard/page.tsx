// page.tsx (/dashboard) => Portada del panel: KPIs, operación y widgets personalizables.
// Server Component mínimo: metadatos + encabezado (adminPage) y la sección interactiva del panel (RBAC: layout (admin)).
import { DashboardOverview } from "@/features/admin-dashboard/ui/DashboardOverview";
import { adminMetadata, adminPage } from "./AdminSection";

export const generateMetadata = adminMetadata("overview");
export default adminPage("overview", DashboardOverview);

// page.tsx (/dashboard/analytics) => Analítica: series, embudo, reportes por dimensión y relaciones entre productos.
// Server Component mínimo: metadatos + encabezado (adminPage) y la sección interactiva del panel (RBAC: layout (admin)).
import { AnalyticsPanel } from "@/features/admin-dashboard/ui/AnalyticsPanel";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("analytics");
export default adminPage("analytics", AnalyticsPanel);

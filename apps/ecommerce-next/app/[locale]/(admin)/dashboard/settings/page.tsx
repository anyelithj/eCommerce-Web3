// page.tsx (/dashboard/settings) => Roles, permisos, webhooks, automatización n8n, auditoría y MCP.
// Server Component mínimo: metadatos + encabezado (adminPage) y la sección interactiva del panel (RBAC: layout (admin)).
import { SettingsAdmin } from "@/features/admin-dashboard/ui/SettingsAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("settings");
export default adminPage("settings", SettingsAdmin);

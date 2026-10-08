import { SettingsAdmin } from "@/features/admin-dashboard/ui/SettingsAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("settings");
export default adminPage("settings", SettingsAdmin);

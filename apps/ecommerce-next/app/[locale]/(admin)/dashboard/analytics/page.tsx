import { AnalyticsPanel } from "@/features/admin-dashboard/ui/AnalyticsPanel";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("analytics");
export default adminPage("analytics", AnalyticsPanel);

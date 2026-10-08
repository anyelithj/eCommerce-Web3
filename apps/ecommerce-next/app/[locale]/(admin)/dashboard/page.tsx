import { DashboardOverview } from "@/features/admin-dashboard/ui/DashboardOverview";
import { adminMetadata, adminPage } from "./AdminSection";

export const generateMetadata = adminMetadata("overview");
export default adminPage("overview", DashboardOverview);

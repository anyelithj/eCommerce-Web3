import { MarketingAdmin } from "@/features/admin-dashboard/ui/MarketingAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("marketing");
export default adminPage("marketing", MarketingAdmin);

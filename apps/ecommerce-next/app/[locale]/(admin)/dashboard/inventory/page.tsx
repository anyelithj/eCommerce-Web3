import { InventoryAdmin } from "@/features/admin-dashboard/ui/InventoryAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("inventory");
export default adminPage("inventory", InventoryAdmin);

import { OrdersAdmin } from "@/features/admin-dashboard/ui/OrdersAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("orders");
export default adminPage("orders", OrdersAdmin);

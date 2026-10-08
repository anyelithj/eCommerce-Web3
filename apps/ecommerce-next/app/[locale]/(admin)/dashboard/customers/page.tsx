import { CustomersAdmin } from "@/features/admin-dashboard/ui/CustomersAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("customers");
export default adminPage("customers", CustomersAdmin);

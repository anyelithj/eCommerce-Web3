import { ProductsAdmin } from "@/features/admin-dashboard/ui/ProductsAdmin";
import { adminMetadata, adminPage } from "../AdminSection";

export const generateMetadata = adminMetadata("products");
export default adminPage("products", ProductsAdmin);

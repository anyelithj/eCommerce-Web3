import { ProductForm } from "@/features/admin-dashboard/ui/ProductsAdmin";
import { adminMetadata, adminPage } from "../../AdminSection";

export const generateMetadata = adminMetadata("productNew");
export default adminPage("productNew", ProductForm);

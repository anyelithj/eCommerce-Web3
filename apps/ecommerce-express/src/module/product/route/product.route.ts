import { Router } from "express";
import { productController } from "../controller/product.controller";
import { jwtAuthGuard } from "../../auth/guard/auth.guard";
import { optionalAuth } from "../../../shared/middleware/jwt.middleware";
import { requirePermission } from "../../../shared/middleware/rbac.middleware";

export const productRouter = Router();

productRouter.get("/", optionalAuth, productController.listProducts);
productRouter.get("/:id", optionalAuth, productController.getProductById);
productRouter.post("/", jwtAuthGuard, requirePermission("CREATE", "product"), productController.createProduct);
productRouter.patch("/:id", jwtAuthGuard, requirePermission("UPDATE", "product"), productController.updateProduct);
productRouter.delete("/", jwtAuthGuard, requirePermission("DELETE", "product"), productController.deleteAllProducts);
productRouter.delete("/:id", jwtAuthGuard, requirePermission("DELETE", "product"), productController.deleteProductById);

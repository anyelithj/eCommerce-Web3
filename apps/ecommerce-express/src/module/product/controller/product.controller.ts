import type { Request, Response } from "express";
import { productService } from "../service/product.service";
import {
  CreateProductSchema,
  DeleteAllProductsSchema,
  ListProductsQuerySchema,
  UpdateProductSchema,
} from "../schema/product.schema";
import {
  asyncHandler,
  sendNoContent,
  sendSuccess,
} from "../../../shared/interceptor/transform.interceptor";
import { parseId, parseParam } from "../../../shared/pipe/validation.pipe";
import { currentUser } from "../../../shared/decorator/auth.decorator";
import { HttpStatus } from "../../../shared/constants/http.constants";

export class ProductController {
  public readonly listProducts = asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await productService.listProducts(
      ListProductsQuerySchema.parse(req.query),
      req.user
    );
    if (!req.user)
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    sendSuccess(res, items, HttpStatus.OK, meta);
  });

  public readonly getProductById = asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getProductById(parseParam(req, "id"), req.user);
    if (!req.user)
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    sendSuccess(res, product);
  });

  public readonly createProduct = asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.createProduct(
      CreateProductSchema.parse(req.body),
      currentUser(req)
    );
    sendSuccess(res, product, HttpStatus.CREATED);
  });

  public readonly updateProduct = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await productService.updateProduct(
        parseId(req),
        UpdateProductSchema.parse(req.body),
        currentUser(req)
      )
    );
  });

  public readonly deleteProductById = asyncHandler(async (req: Request, res: Response) => {
    await productService.deleteProductById(parseId(req), currentUser(req));
    sendNoContent(res);
  });

  public readonly deleteAllProducts = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = DeleteAllProductsSchema.parse(req.body);
    sendSuccess(res, await productService.deleteAllProducts(ids, currentUser(req)));
  });
}

export const productController = new ProductController();

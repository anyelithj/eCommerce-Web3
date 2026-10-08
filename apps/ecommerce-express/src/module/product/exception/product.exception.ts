// product.exception.ts => errores de dominio del módulo Product.
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "../../../shared/filter/http-exception.filter";

export class ProductNotFoundException extends NotFoundException {
  constructor(idOrSlug: string) {
    super("Product", idOrSlug);
  }
}

// El SKU es la llave del inventario: no puede repetirse entre productos
export class DuplicateSkuException extends ConflictException {
  constructor(skus: string[]) {
    super(`SKU ya utilizado por otro producto: ${skus.join(", ")}`, "DUPLICATE_SKU", { skus });
  }
}

// Un VENDOR solo gestiona sus propios productos (ownership)
export class ProductOwnershipException extends ForbiddenException {
  constructor() {
    super("Solo puedes gestionar tus propios productos", "PRODUCT_NOT_OWNED");
  }
}

// Un producto publicado necesita al menos una variante activa (no se puede vender "nada")
export class ProductWithoutVariantsException extends ConflictException {
  constructor() {
    super("Un producto ACTIVO necesita al menos una variante activa", "PRODUCT_WITHOUT_VARIANTS");
  }
}

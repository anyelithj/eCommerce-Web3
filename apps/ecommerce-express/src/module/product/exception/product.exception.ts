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

export class DuplicateSkuException extends ConflictException {
  constructor(skus: string[]) {
    super(`SKU ya utilizado por otro producto: ${skus.join(", ")}`, "DUPLICATE_SKU", { skus });
  }
}

export class ProductOwnershipException extends ForbiddenException {
  constructor() {
    super("Solo puedes gestionar tus propios productos", "PRODUCT_NOT_OWNED");
  }
}

export class ProductWithoutVariantsException extends ConflictException {
  constructor() {
    super("Un producto ACTIVO necesita al menos una variante activa", "PRODUCT_WITHOUT_VARIANTS");
  }
}

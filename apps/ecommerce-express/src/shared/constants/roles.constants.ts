// roles.constants.ts => catálogo RBAC (roles + permisos) — fuente única para guards, rbac.middleware y seed (DRY).

// Roles base del sistema (sprint 1.2: "Seeds roles base (admin, vendor, customer)")
export const Roles = {
  ADMIN: "ADMIN",
  VENDOR: "VENDOR",
  CUSTOMER: "CUSTOMER",
} as const;

// "typeof Roles[keyof typeof Roles]" => "ADMIN" | "VENDOR" | "CUSTOMER"
export type RoleName = (typeof Roles)[keyof typeof Roles];

// Acciones CRUD (taxonomía de la matriz de trazabilidad)
export const Actions = ["CREATE", "READ", "UPDATE", "DELETE"] as const;
export type Action = (typeof Actions)[number]; // "[number]" => tipo de los elementos de la tupla

// Recursos protegidos por permisos granulares (uno por módulo de negocio)
export const Resources = [
  "user",
  "role",
  "permission",
  "product",
  "category",
  "brand",
  "collection",
  "order",
  "payment",
  "shipping",
  "invoice",
  "refund",
  "coupon",
  "loyalty",
  "review",
  "notification",
] as const;
export type Resource = (typeof Resources)[number];

// Matriz rol -> permisos (patrón Policy declarativo). ADMIN recibe todos los permisos en el seed.
// "Record<K, V>" => objeto con claves K y valores V
export const RolePolicies: Record<
  Exclude<RoleName, "ADMIN">,
  ReadonlyArray<`${Action}:${Resource}`>
> = {
  // VENDOR gestiona su catálogo y el despacho de sus pedidos
  VENDOR: [
    "CREATE:product",
    "READ:product",
    "UPDATE:product",
    "DELETE:product",
    "READ:category",
    "READ:brand",
    "READ:collection",
    "READ:order",
    "UPDATE:order",
    "READ:shipping",
    "UPDATE:shipping",
    "CREATE:shipping",
    "UPDATE:review", // Responder reseñas de sus productos
  ],
  // CUSTOMER opera sobre SUS propios recursos (el ownership se valida en cada service)
  CUSTOMER: [],
};

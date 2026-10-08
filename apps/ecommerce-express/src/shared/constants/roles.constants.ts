export const Roles = {
  ADMIN: "ADMIN",
  VENDOR: "VENDOR",
  CUSTOMER: "CUSTOMER",
} as const;

export type RoleName = (typeof Roles)[keyof typeof Roles];

export const Actions = ["CREATE", "READ", "UPDATE", "DELETE"] as const;
export type Action = (typeof Actions)[number];

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

export const RolePolicies: Record<
  Exclude<RoleName, "ADMIN">,
  ReadonlyArray<`${Action}:${Resource}`>
> = {
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
    "UPDATE:review",
  ],
  CUSTOMER: [],
};

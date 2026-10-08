import type { useZodForm } from "@/shared/hook/useZodForm";
import type { FieldDef } from "../ui/AdminResource";
import type { MutationRequest, Query } from "../api/dashboard.api";
import {
  brandSchema,
  campaignSchema,
  categorySchema,
  collectionSchema,
  couponSchema,
  creditNoteSchema,
  customerSchema,
  customerUpdateSchema,
  invoiceSchema,
  movementSchema,
  ORDER_STATUSES,
  orderStatusSchema,
  PERMISSION_ACTIONS,
  permissionSchema,
  permissionUpdateSchema,
  REFUND_STATUSES,
  refundReviewSchema,
  REVIEW_STATUSES,
  reviewModerationSchema,
  reviewReplySchema,
  roleSchema,
  rollbackSchema,
  sendEmailSchema,
  SHIPMENT_STATUSES,
  shipmentUpdateSchema,
  stockAdjustSchema,
  supplierSchema,
  templateSchema,
  TRIGGER_TYPES,
  userSchema,
  webhookSchema,
  workflowSchema,
} from "./dashboard.validator";

export type Role = "ADMIN" | "VENDOR";
export type Row = Record<string, unknown>;
type Schema = Parameters<typeof useZodForm>[0]["schema"];
export type GroupKey = "catalog" | "sales" | "customers" | "operations" | "marketing" | "system";
export type CellType =
  | "title"
  | "text"
  | "code"
  | "money"
  | "date"
  | "datetime"
  | "badge"
  | "bool"
  | "count"
  | "list"
  | "percent"
  | "image"
  | "rating"
  | "long";

export interface ColumnDef {
  key: string;
  type?: CellType;
  label?: string;
  value?: (row: Row) => unknown;
  currencyKey?: string;
}

export interface OptionsFrom {
  api: string;
  value: string;
  label: (row: Row) => string;
  transform?: (data: unknown) => Row[];
}
export type ResourceField = FieldDef & { optionsFrom?: OptionsFrom; valuesKey?: string };

export interface FormDef {
  schema: Schema;
  fields: ResourceField[];
  initial: (row?: Row) => Record<string, unknown>;
  requests: (values: Record<string, unknown>, row?: Row) => MutationRequest[];
  roles?: Role[];
}

export interface ActionDef {
  key: string;
  roles?: Role[];
  when?: (row: Row) => boolean;
  tone?: "primary" | "secondary" | "danger";
  request?: (row: Row) => MutationRequest;
  form?: Omit<FormDef, "requests"> & {
    requests: (values: Record<string, unknown>, row: Row) => MutationRequest[];
  };
  download?: (row: Row) => { path: string; filename: string };
}

export interface ResourceDef {
  key: string;
  group: GroupKey;
  icon: string;
  roles: Role[];
  api: string;
  idKey?: string;
  titleKey: string;
  detailApi?: ((id: string) => string) | null;
  listQuery?: Query;
  transformList?: (data: unknown) => Row[];
  search?: string;
  filters?: Array<{ name: string; values: readonly string[] }>;
  columns: ColumnDef[];
  detail?: ColumnDef[];
  sections?: Array<{ key: string; columns: ColumnDef[] }>;
  create?: FormDef;
  edit?: FormDef & { when?: (row: Row) => boolean };
  remove?: { roles?: Role[]; when?: (row: Row) => boolean; label?: string };
  actions?: ActionDef[];
  customForm?: boolean;
}

export const get = (row: Row, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (value, key) => (value && typeof value === "object" ? (value as Row)[key] : undefined),
      row
    );
const str = (value: unknown) => (value === null || value === undefined ? "" : String(value));
const dateInput = (value: unknown) => (typeof value === "string" ? value.slice(0, 10) : "");
const idOf = (row: Row | undefined, key = "id") => encodeURIComponent(str(row?.[key]));
const ALL: Role[] = ["ADMIN", "VENDOR"];
const ADMIN: Role[] = ["ADMIN"];
const post = (path: string, body: unknown): MutationRequest => ({ path, method: "POST", body });
const patch = (path: string, body: unknown): MutationRequest => ({ path, method: "PATCH", body });
const flattenTree = (nodes: unknown, depth = 0): Row[] =>
  (Array.isArray(nodes) ? (nodes as Row[]) : []).flatMap((node) => [
    { ...node, depth, name: `${"— ".repeat(depth)}${str(node["name"])}` },
    ...flattenTree(node["children"], depth + 1),
  ]);

export const RESOURCES: ResourceDef[] = [
  {
    key: "products",
    group: "catalog",
    icon: "tag",
    roles: ALL,
    api: "/product",
    titleKey: "name",
    search: "q",
    filters: [{ name: "status", values: ["DRAFT", "ACTIVE", "ARCHIVED"] }],
    columns: [
      { key: "imageUrl", type: "image" },
      { key: "name", type: "title" },
      { key: "status", type: "badge" },
      { key: "category.name", label: "category" },
      { key: "minPriceCents", type: "money", label: "price" },
      { key: "inStock", type: "bool" },
    ],
    detail: [
      { key: "name", type: "title" },
      { key: "slug", type: "code" },
      { key: "status", type: "badge" },
      { key: "category.name", label: "category" },
      { key: "brand.name", label: "brand" },
      { key: "ratingAvg", type: "rating" },
      { key: "description", type: "long" },
      { key: "createdAt", type: "datetime" },
      { key: "updatedAt", type: "datetime" },
    ],
    sections: [
      {
        key: "variants",
        columns: [
          { key: "sku", type: "code" },
          { key: "name" },
          { key: "priceCents", type: "money", label: "price" },
          { key: "available" },
          { key: "isActive", type: "bool" },
        ],
      },
    ],
    customForm: true,
    remove: {},
  },
  {
    key: "categories",
    group: "catalog",
    icon: "folder",
    roles: ADMIN,
    api: "/category",
    titleKey: "name",
    transformList: (data) => flattenTree(data),
    columns: [
      { key: "name", type: "title" },
      { key: "slug", type: "code" },
      { key: "productCount", label: "products" },
    ],
    detail: [
      { key: "name", type: "title" },
      { key: "slug", type: "code" },
      { key: "description", type: "long" },
      { key: "productCount", label: "products" },
    ],
    sections: [
      {
        key: "children",
        columns: [
          { key: "name" },
          { key: "slug", type: "code" },
          { key: "productCount", label: "products" },
        ],
      },
    ],
    create: {
      schema: categorySchema,
      fields: [
        { name: "name", label: "name" },
        { name: "description", label: "description", type: "textarea" },
        { name: "imageUrl", label: "imageUrl", type: "url" },
        {
          name: "parentId",
          label: "parent",
          type: "select",
          optionsFrom: {
            api: "/category",
            value: "id",
            label: (row) => str(row["name"]),
            transform: (data) => flattenTree(data),
          },
        },
        { name: "isActive", label: "isActive", type: "checkbox" },
      ],
      initial: () => ({ name: "", description: "", imageUrl: "", parentId: "", isActive: true }),
      requests: (values) => [post("/category", values)],
    },
    edit: {
      schema: categorySchema,
      fields: [
        { name: "name", label: "name" },
        { name: "description", label: "description", type: "textarea" },
        { name: "imageUrl", label: "imageUrl", type: "url" },
        {
          name: "parentId",
          label: "parent",
          type: "select",
          optionsFrom: {
            api: "/category",
            value: "id",
            label: (row) => str(row["name"]),
            transform: (data) => flattenTree(data),
          },
        },
        { name: "isActive", label: "isActive", type: "checkbox" },
      ],
      initial: (row) => ({
        name: str(row?.["name"]).replace(/^(— )+/, ""),
        description: str(row?.["description"]),
        imageUrl: str(row?.["imageUrl"]),
        parentId: str(row?.["parentId"]),
        isActive: row?.["isActive"] !== false,
      }),
      requests: (values, row) => [patch(`/category/${idOf(row)}`, values)],
    },
    remove: {},
  },
  {
    key: "brands",
    group: "catalog",
    icon: "badge",
    roles: ADMIN,
    api: "/brand",
    titleKey: "name",
    search: "q",
    columns: [
      { key: "logoUrl", type: "image" },
      { key: "name", type: "title" },
      { key: "slug", type: "code" },
      { key: "productCount", label: "products" },
      { key: "website" },
    ],
    detail: [
      { key: "name", type: "title" },
      { key: "slug", type: "code" },
      { key: "website" },
      { key: "description", type: "long" },
      { key: "productCount", label: "products" },
    ],
    create: {
      schema: brandSchema,
      fields: [
        { name: "name", label: "name" },
        { name: "description", label: "description", type: "textarea" },
        { name: "website", label: "website", type: "url" },
        { name: "logoUrl", label: "logoUrl", type: "url" },
        { name: "isActive", label: "isActive", type: "checkbox" },
      ],
      initial: () => ({ name: "", description: "", website: "", logoUrl: "", isActive: true }),
      requests: (values) => [post("/brand", values)],
    },
    edit: {
      schema: brandSchema,
      fields: [
        { name: "name", label: "name" },
        { name: "description", label: "description", type: "textarea" },
        { name: "website", label: "website", type: "url" },
        { name: "logoUrl", label: "logoUrl", type: "url" },
        { name: "isActive", label: "isActive", type: "checkbox" },
      ],
      initial: (row) => ({
        name: str(row?.["name"]),
        description: str(row?.["description"]),
        website: str(row?.["website"]),
        logoUrl: str(row?.["logoUrl"]),
        isActive: row?.["isActive"] !== false,
      }),
      requests: (values, row) => [patch(`/brand/${idOf(row)}`, values)],
    },
    remove: {},
  },
  {
    key: "collections",
    group: "catalog",
    icon: "layers",
    roles: ADMIN,
    api: "/collection",
    titleKey: "name",
    columns: [
      { key: "imageUrl", type: "image" },
      { key: "name", type: "title" },
      { key: "productCount", label: "products" },
      { key: "isActive", type: "bool" },
      { key: "endsAt", type: "date" },
    ],
    detail: [
      { key: "name", type: "title" },
      { key: "slug", type: "code" },
      { key: "description", type: "long" },
      { key: "isActive", type: "bool" },
      { key: "startsAt", type: "date" },
      { key: "endsAt", type: "date" },
    ],
    sections: [
      {
        key: "products",
        columns: [{ key: "name" }, { key: "minPriceCents", type: "money", label: "price" }],
      },
    ],
    create: {
      schema: collectionSchema,
      fields: [
        { name: "name", label: "name" },
        { name: "description", label: "description", type: "textarea" },
        { name: "imageUrl", label: "imageUrl", type: "url" },
        { name: "startsAt", label: "startsAt", type: "date" },
        { name: "endsAt", label: "endsAt", type: "date" },
        { name: "isActive", label: "isActive", type: "checkbox" },
      ],
      initial: () => ({
        name: "",
        description: "",
        imageUrl: "",
        startsAt: "",
        endsAt: "",
        isActive: true,
      }),
      requests: (values) => [post("/collection", values)],
    },
    edit: {
      schema: collectionSchema,
      fields: [
        { name: "name", label: "name" },
        { name: "description", label: "description", type: "textarea" },
        { name: "imageUrl", label: "imageUrl", type: "url" },
        { name: "startsAt", label: "startsAt", type: "date" },
        { name: "endsAt", label: "endsAt", type: "date" },
        { name: "isActive", label: "isActive", type: "checkbox" },
      ],
      initial: (row) => ({
        name: str(row?.["name"]),
        description: str(row?.["description"]),
        imageUrl: str(row?.["imageUrl"]),
        startsAt: dateInput(row?.["startsAt"]),
        endsAt: dateInput(row?.["endsAt"]),
        isActive: row?.["isActive"] !== false,
      }),
      requests: (values, row) => [patch(`/collection/${idOf(row)}`, values)],
    },
    remove: {},
  },
  {
    key: "reviews",
    group: "catalog",
    icon: "star",
    roles: ALL,
    api: "/review",
    titleKey: "title",
    filters: [{ name: "status", values: REVIEW_STATUSES }],
    columns: [
      { key: "productName", label: "product" },
      { key: "author.name", label: "author" },
      { key: "rating", type: "rating" },
      { key: "status", type: "badge" },
      { key: "isVerifiedPurchase", type: "bool" },
      { key: "createdAt", type: "date" },
    ],
    detail: [
      { key: "title", type: "title" },
      { key: "productName", label: "product" },
      { key: "author.name", label: "author" },
      { key: "rating", type: "rating" },
      { key: "status", type: "badge" },
      { key: "body", type: "long" },
      { key: "vendorReply", type: "long" },
      { key: "createdAt", type: "datetime" },
    ],
    actions: [
      {
        key: "moderate",
        roles: ADMIN,
        form: {
          schema: reviewModerationSchema,
          fields: [
            {
              name: "status",
              label: "status",
              type: "select",
              valuesKey: "status",
              options: REVIEW_STATUSES.map((value) => ({ value, label: value })),
            },
            { name: "moderationNote", label: "note", type: "textarea" },
          ],
          initial: (row) => ({ status: str(row?.["status"]), moderationNote: "" }),
          requests: (values, row) => [patch(`/review/${idOf(row)}`, values)],
        },
      },
      {
        key: "reply",
        roles: ALL,
        form: {
          schema: reviewReplySchema,
          fields: [{ name: "vendorReply", label: "vendorReply", type: "textarea" }],
          initial: (row) => ({ vendorReply: str(row?.["vendorReply"]) }),
          requests: (values, row) => [patch(`/review/${idOf(row)}`, values)],
        },
      },
    ],
    remove: { roles: ADMIN },
  },
  {
    key: "orders",
    group: "sales",
    icon: "cart",
    roles: ALL,
    api: "/order",
    titleKey: "orderNumber",
    filters: [{ name: "status", values: ORDER_STATUSES }],
    columns: [
      { key: "orderNumber", type: "title" },
      { key: "status", type: "badge" },
      { key: "itemCount", label: "items" },
      { key: "totalCents", type: "money", label: "total" },
      { key: "placedAt", type: "datetime" },
    ],
    detail: [
      { key: "orderNumber", type: "title" },
      { key: "status", type: "badge" },
      { key: "placedAt", type: "datetime" },
      { key: "subtotalCents", type: "money", label: "subtotal" },
      { key: "discountCents", type: "money", label: "discount" },
      { key: "shippingCents", type: "money", label: "shipping" },
      { key: "taxCents", type: "money", label: "tax" },
      { key: "totalCents", type: "money", label: "total" },
      {
        key: "shippingAddress",
        label: "address",
        value: (row) => {
          const address = (row["shippingAddress"] ?? {}) as Row;
          return [address["recipientName"], address["line1"], address["city"], address["state"]]
            .filter(Boolean)
            .join(", ");
        },
      },
      { key: "invoice.number", label: "invoice" },
    ],
    sections: [
      {
        key: "items",
        columns: [
          { key: "productName", label: "product" },
          { key: "variantName", label: "variant" },
          { key: "sku", type: "code" },
          { key: "quantity" },
          { key: "unitPriceCents", type: "money", label: "price" },
          { key: "totalCents", type: "money", label: "total" },
        ],
      },
      {
        key: "statusHistory",
        columns: [
          { key: "to", type: "badge", label: "status" },
          { key: "note" },
          { key: "at", type: "datetime", label: "date" },
        ],
      },
      {
        key: "payments",
        columns: [
          { key: "status", type: "badge" },
          { key: "amountCents", type: "money", label: "total" },
          { key: "createdAt", type: "datetime" },
        ],
      },
    ],
    actions: [
      {
        key: "changeStatus",
        roles: ALL,
        when: (row) => !["DELIVERED", "CANCELLED"].includes(str(row["status"])),
        form: {
          schema: orderStatusSchema,
          fields: [
            {
              name: "status",
              label: "status",
              type: "select",
              valuesKey: "status",
              options: ORDER_STATUSES.map((value) => ({ value, label: value })),
            },
            { name: "note", label: "note", type: "textarea" },
          ],
          initial: (row) => ({ status: str(row?.["status"]), note: "" }),
          requests: (values, row) => [patch(`/order/${idOf(row)}/status`, values)],
        },
      },
    ],
  },
  {
    key: "shipments",
    group: "sales",
    icon: "truck",
    roles: ALL,
    api: "/shipping",
    titleKey: "orderNumber",
    filters: [{ name: "status", values: SHIPMENT_STATUSES }],
    columns: [
      { key: "orderNumber", type: "title" },
      { key: "status", type: "badge" },
      { key: "carrier" },
      { key: "trackingNumber", type: "code" },
      { key: "estimatedDelivery", type: "date" },
    ],
    detail: [
      { key: "orderNumber", type: "title" },
      { key: "status", type: "badge" },
      { key: "carrier" },
      { key: "service" },
      { key: "trackingNumber", type: "code" },
      { key: "costCents", type: "money", label: "cost" },
      { key: "estimatedDelivery", type: "date" },
      { key: "shippedAt", type: "datetime" },
      { key: "deliveredAt", type: "datetime" },
    ],
    sections: [
      {
        key: "events",
        columns: [
          { key: "status", type: "badge" },
          { key: "description" },
          { key: "location" },
          { key: "occurredAt", type: "datetime", label: "date" },
        ],
      },
    ],
    actions: [
      {
        key: "updateShipment",
        roles: ALL,
        form: {
          schema: shipmentUpdateSchema,
          fields: [
            {
              name: "status",
              label: "status",
              type: "select",
              valuesKey: "status",
              options: SHIPMENT_STATUSES.map((value) => ({ value, label: value })),
            },
            { name: "description", label: "description" },
            { name: "location", label: "location" },
          ],
          initial: (row) => ({ status: str(row?.["status"]), description: "", location: "" }),
          requests: (values, row) => [patch(`/shipping/${idOf(row)}`, values)],
        },
      },
      {
        key: "createLabel",
        roles: ALL,
        when: (row) => !row["trackingNumber"],
        request: (row) => post("/shipping/label", { shipmentId: row["id"] }),
      },
      {
        key: "downloadLabel",
        roles: ALL,
        when: (row) => Boolean(row["trackingNumber"]),
        download: (row) => ({
          path: `/shipping/${idOf(row)}/label`,
          filename: `guia-${str(row["orderNumber"])}.pdf`,
        }),
      },
    ],
  },
  {
    key: "invoices",
    group: "sales",
    icon: "receipt",
    roles: ADMIN,
    api: "/invoice",
    titleKey: "number",
    columns: [
      { key: "number", type: "title" },
      { key: "status", type: "badge" },
      { key: "totalCents", type: "money", label: "total" },
      { key: "issuedAt", type: "date" },
    ],
    create: {
      schema: invoiceSchema,
      fields: [{ name: "orderId", label: "orderId" }],
      initial: () => ({ orderId: "" }),
      requests: (values) => [post("/invoice", values)],
    },
    actions: [
      {
        key: "downloadPdf",
        roles: ADMIN,
        download: (row) => ({
          path: `/invoice/${idOf(row)}/pdf`,
          filename: `${str(row["number"])}.pdf`,
        }),
      },
      {
        key: "creditNote",
        roles: ADMIN,
        form: {
          schema: creditNoteSchema,
          fields: [
            { name: "amount", label: "amount", type: "number" },
            { name: "reason", label: "reason", type: "textarea" },
          ],
          initial: () => ({ amount: 0, reason: "" }),
          requests: (values, row) => [
            post(`/invoice/${idOf(row)}/credit-note`, {
              amountCents: values["amount"],
              reason: values["reason"],
            }),
          ],
        },
      },
    ],
  },
  {
    key: "refunds",
    group: "sales",
    icon: "undo",
    roles: ADMIN,
    api: "/refund",
    titleKey: "orderNumber",
    filters: [{ name: "status", values: REFUND_STATUSES }],
    columns: [
      { key: "orderNumber", type: "title" },
      { key: "reason", type: "badge" },
      { key: "amountCents", type: "money", label: "total" },
      { key: "status", type: "badge" },
      { key: "createdAt", type: "date" },
    ],
    detail: [
      { key: "orderNumber", type: "title" },
      { key: "status", type: "badge" },
      { key: "reason", type: "badge" },
      { key: "amountCents", type: "money", label: "total" },
      { key: "description", type: "long" },
      { key: "evidenceUrls", type: "list" },
      { key: "reviewNote", type: "long", label: "note" },
      { key: "createdAt", type: "datetime" },
    ],
    actions: [
      {
        key: "reviewRefund",
        roles: ADMIN,
        when: (row) => row["status"] === "REQUESTED",
        form: {
          schema: refundReviewSchema,
          fields: [
            {
              name: "approve",
              label: "decision",
              type: "select",
              options: [
                { value: "true", label: "approve" },
                { value: "false", label: "reject" },
              ],
              valuesKey: "decision",
            },
            { name: "note", label: "note", type: "textarea" },
          ],
          initial: () => ({ approve: "true", note: "" }),
          requests: (values, row) => [patch(`/refund/${idOf(row)}/approve`, values)],
        },
      },
    ],
  },
  {
    key: "coupons",
    group: "sales",
    icon: "ticket",
    roles: ADMIN,
    api: "/coupon",
    titleKey: "code",
    filters: [{ name: "active", values: ["true", "false"] }],
    columns: [
      { key: "code", type: "title" },
      { key: "type", type: "badge" },
      { key: "value" },
      { key: "usedCount", label: "used" },
      { key: "usageLimit" },
      { key: "endsAt", type: "date" },
      { key: "isActive", type: "bool" },
    ],
    create: {
      schema: couponSchema,
      fields: couponFields(true),
      initial: () => ({ code: "", type: "PERCENTAGE", value: 10, usageLimit: "", endsAt: "" }),
      requests: (values) => [post("/coupon", couponBody(values))],
    },
    edit: {
      schema: couponSchema,
      fields: couponFields(false),
      initial: (row) => ({
        code: str(row?.["code"]),
        type: str(row?.["type"]),
        value:
          row?.["type"] === "FIXED_AMOUNT"
            ? Number(row?.["value"]) / 100
            : Number(row?.["value"] ?? 0),
        usageLimit: row?.["usageLimit"] ?? "",
        endsAt: dateInput(row?.["endsAt"]),
      }),
      requests: (values, row) => {
        const { code: _code, ...body } = couponBody(values);
        return [patch(`/coupon/${idOf(row)}`, body)];
      },
    },
    remove: {},
  },
  {
    key: "users",
    group: "customers",
    icon: "users",
    roles: ADMIN,
    api: "/user",
    titleKey: "email",
    search: "q",
    filters: [{ name: "role", values: ["ADMIN", "VENDOR", "CUSTOMER"] }],
    columns: [
      {
        key: "fullName",
        type: "title",
        value: (row) => `${str(row["firstName"])} ${str(row["lastName"])}`,
      },
      { key: "email" },
      { key: "roles", type: "list" },
      { key: "isActive", type: "bool" },
      { key: "isVerified", type: "bool" },
    ],
    detail: [
      {
        key: "fullName",
        type: "title",
        value: (row) => `${str(row["firstName"])} ${str(row["lastName"])}`,
      },
      { key: "email" },
      { key: "phone" },
      { key: "roles", type: "list" },
      { key: "isActive", type: "bool" },
      { key: "isVerified", type: "bool" },
      { key: "twoFactorEnabled", type: "bool" },
      { key: "walletAddress", type: "code" },
      { key: "locale", type: "code" },
      { key: "createdAt", type: "datetime" },
    ],
    sections: [
      {
        key: "addresses",
        columns: [
          { key: "label" },
          { key: "line1", label: "address" },
          { key: "city" },
          { key: "country", type: "code" },
          { key: "isDefault", type: "bool" },
        ],
      },
    ],
    edit: {
      schema: userSchema,
      fields: [
        { name: "firstName", label: "firstName" },
        { name: "lastName", label: "lastName" },
        { name: "phone", label: "phone" },
        {
          name: "roles",
          label: "roles",
          type: "checkboxes",
          optionsFrom: { api: "/role", value: "name", label: (row) => str(row["name"]) },
        },
      ],
      initial: (row) => ({
        firstName: str(row?.["firstName"]),
        lastName: str(row?.["lastName"]),
        phone: str(row?.["phone"]),
        roles: (row?.["roles"] as string[] | undefined) ?? [],
      }),
      requests: (values, row) => [
        patch(`/user/${idOf(row)}`, {
          firstName: values["firstName"],
          lastName: values["lastName"],
          phone: values["phone"],
        }),
        patch(`/user/${idOf(row)}/roles`, { roles: values["roles"] }),
      ],
    },
    remove: { label: "deactivate", when: (row) => row["isActive"] !== false },
  },
  {
    key: "customers",
    group: "customers",
    icon: "id",
    roles: ADMIN,
    api: "/crm/customer",
    titleKey: "email",
    search: "q",
    filters: [{ name: "segment", values: ["VIP", "REGULAR", "NEW", "INACTIVE"] }],
    columns: [
      {
        key: "fullName",
        type: "title",
        value: (row) => `${str(row["firstName"])} ${str(row["lastName"])}`,
      },
      { key: "email" },
      { key: "segment", type: "badge" },
      { key: "orders" },
      { key: "ltvCents", type: "money", label: "ltv" },
      { key: "score.value", label: "score" },
      { key: "tags", type: "list" },
    ],
    detail: [
      {
        key: "fullName",
        type: "title",
        value: (row) => `${str(row["firstName"])} ${str(row["lastName"])}`,
      },
      { key: "email" },
      { key: "phone" },
      { key: "segment", type: "badge" },
      { key: "ltvCents", type: "money", label: "ltv" },
      { key: "avgOrderCents", type: "money", label: "avgOrder" },
      { key: "score.value", label: "score" },
      { key: "loyalty.tier", label: "loyalty" },
      { key: "nextPurchaseAt", type: "date", label: "nextPurchase" },
      { key: "tags", type: "list" },
    ],
    sections: [
      {
        key: "recentOrders",
        columns: [
          { key: "orderNumber" },
          { key: "status", type: "badge" },
          { key: "totalCents", type: "money", label: "total" },
          { key: "placedAt", type: "date" },
        ],
      },
      {
        key: "notes",
        columns: [
          { key: "text", label: "note" },
          { key: "at", type: "datetime", label: "date" },
        ],
      },
    ],
    create: {
      schema: customerSchema,
      fields: [
        { name: "email", label: "email", type: "email" },
        { name: "firstName", label: "firstName" },
        { name: "lastName", label: "lastName" },
        { name: "phone", label: "phone" },
        { name: "tags", label: "tags", hint: "tagsHint" },
        { name: "note", label: "note", type: "textarea" },
      ],
      initial: () => ({ email: "", firstName: "", lastName: "", phone: "", tags: "", note: "" }),
      requests: (values) => [post("/crm/customer", values)],
    },
    edit: {
      schema: customerUpdateSchema,
      fields: [
        { name: "tags", label: "tags", hint: "tagsHint" },
        { name: "score", label: "score", type: "number" },
        { name: "note", label: "note", type: "textarea" },
      ],
      initial: (row) => ({
        tags: ((row?.["tags"] as string[] | undefined) ?? []).join(", "),
        score:
          (row?.["score"] as Row | undefined)?.["source"] === "MANUAL"
            ? (row?.["score"] as Row)["value"]
            : "",
        note: "",
      }),
      requests: (values, row) => [patch(`/crm/customer/${idOf(row)}`, values)],
    },
    remove: { label: "archive", when: (row) => !row["archived"] },
  },
  {
    key: "inventory",
    group: "operations",
    icon: "box",
    roles: ADMIN,
    api: "/inventory",
    idKey: "variantId",
    titleKey: "sku",
    search: "q",
    filters: [{ name: "lowStock", values: ["true"] }],
    columns: [
      { key: "productName", type: "title", label: "product" },
      { key: "variantName", label: "variant" },
      { key: "sku", type: "code" },
      { key: "stock" },
      { key: "reserved" },
      { key: "available" },
      { key: "low", type: "bool" },
    ],
    detail: [
      { key: "productName", type: "title", label: "product" },
      { key: "variantName", label: "variant" },
      { key: "sku", type: "code" },
      { key: "stock" },
      { key: "reserved" },
      { key: "available" },
      { key: "forecast.avgDailySales", label: "avgDaily" },
      { key: "forecast.daysOfCover", label: "daysOfCover" },
      { key: "forecast.reorderQuantity", label: "reorder" },
    ],
    sections: [
      {
        key: "movements",
        columns: [
          { key: "createdAt", type: "datetime", label: "date" },
          { key: "type", type: "badge" },
          { key: "delta", label: "quantity" },
          { key: "stockAfter", label: "stock" },
          { key: "reason" },
        ],
      },
    ],
    edit: {
      schema: stockAdjustSchema,
      fields: [
        { name: "stock", label: "newStock", type: "number", hint: "adjustHint" },
        { name: "reason", label: "reason" },
      ],
      initial: (row) => ({ stock: Number(row?.["stock"] ?? 0), reason: "" }),
      requests: (values, row) => [patch(`/inventory/${idOf(row, "variantId")}`, values)],
    },
    actions: [
      {
        key: "movement",
        roles: ADMIN,
        form: {
          schema: movementSchema,
          fields: [
            {
              name: "type",
              label: "type",
              type: "select",
              valuesKey: "type",
              options: ["IN", "OUT", "RETURN", "DAMAGE"].map((value) => ({ value, label: value })),
            },
            { name: "quantity", label: "quantity", type: "number" },
            { name: "reason", label: "reason" },
            { name: "reference", label: "reference" },
          ],
          initial: () => ({ type: "IN", quantity: 1, reason: "", reference: "" }),
          requests: (values, row) => [
            post("/inventory/movement", { ...values, variantId: row["variantId"] }),
          ],
        },
      },
    ],
  },
  {
    key: "suppliers",
    group: "operations",
    icon: "factory",
    roles: ADMIN,
    api: "/supplier",
    titleKey: "name",
    search: "q",
    filters: [{ name: "active", values: ["true", "false"] }],
    columns: [
      { key: "name", type: "title" },
      { key: "taxId", type: "code" },
      { key: "email" },
      { key: "leadTimeDays" },
      { key: "contractEndsAt", type: "date" },
      { key: "isActive", type: "bool" },
    ],
    detail: [
      { key: "name", type: "title" },
      { key: "taxId", type: "code" },
      { key: "email" },
      { key: "phone" },
      { key: "contactName" },
      { key: "paymentTermsDays" },
      { key: "leadTimeDays" },
      { key: "rating", type: "rating" },
      { key: "contractEndsAt", type: "date" },
      { key: "isActive", type: "bool" },
    ],
    create: {
      schema: supplierSchema,
      fields: supplierFields(),
      initial: () => ({
        name: "",
        taxId: "",
        email: "",
        phone: "",
        contactName: "",
        paymentTermsDays: 30,
        leadTimeDays: 7,
        rating: "",
        contractEndsAt: "",
      }),
      requests: (values) => [post("/supplier", values)],
    },
    edit: {
      schema: supplierSchema,
      fields: supplierFields(),
      initial: (row) => ({
        name: str(row?.["name"]),
        taxId: str(row?.["taxId"]),
        email: str(row?.["email"]),
        phone: str(row?.["phone"]),
        contactName: str(row?.["contactName"]),
        paymentTermsDays: Number(row?.["paymentTermsDays"] ?? 30),
        leadTimeDays: Number(row?.["leadTimeDays"] ?? 7),
        rating: row?.["rating"] ?? "",
        contractEndsAt: dateInput(row?.["contractEndsAt"]),
      }),
      requests: (values, row) => [patch(`/supplier/${idOf(row)}`, values)],
    },
    remove: {},
  },
  {
    key: "campaigns",
    group: "marketing",
    icon: "megaphone",
    roles: ADMIN,
    api: "/marketing/campaign",
    titleKey: "name",
    filters: [
      { name: "status", values: ["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED", "ARCHIVED"] },
      { name: "channel", values: ["EMAIL", "PUSH", "WHATSAPP"] },
    ],
    columns: [
      { key: "name", type: "title" },
      { key: "channel", type: "badge" },
      { key: "audience", type: "badge" },
      { key: "status", type: "badge" },
      { key: "metrics.sent", label: "sent" },
      { key: "metrics.openRate", type: "percent", label: "openRate" },
      { key: "scheduledAt", type: "datetime" },
    ],
    detail: [
      { key: "name", type: "title" },
      { key: "channel", type: "badge" },
      { key: "audience", type: "badge" },
      { key: "status", type: "badge" },
      { key: "subject" },
      { key: "content", type: "long" },
      { key: "metrics.targeted", label: "targeted" },
      { key: "metrics.sent", label: "sent" },
      { key: "metrics.failed", label: "failed" },
      { key: "metrics.openRate", type: "percent", label: "openRate" },
      { key: "scheduledAt", type: "datetime" },
      { key: "sentAt", type: "datetime" },
      { key: "error", type: "long" },
    ],
    create: {
      schema: campaignSchema,
      fields: campaignFields(),
      initial: () => ({
        name: "",
        channel: "EMAIL",
        audience: "ALL",
        subject: "",
        content: "",
        scheduledAt: "",
      }),
      requests: (values) => [post("/marketing/campaign", isoSchedule(values))],
    },
    edit: {
      schema: campaignSchema,
      fields: campaignFields(),
      when: (row) => ["DRAFT", "SCHEDULED"].includes(str(row["status"])),
      initial: (row) => ({
        name: str(row?.["name"]),
        channel: str(row?.["channel"]),
        audience: str(row?.["audience"]),
        subject: str(row?.["subject"]),
        content: str(row?.["content"]),
        scheduledAt: str(row?.["scheduledAt"]).slice(0, 16),
      }),
      requests: (values, row) => [patch(`/marketing/campaign/${idOf(row)}`, isoSchedule(values))],
    },
    actions: [
      {
        key: "sendNow",
        roles: ADMIN,
        tone: "primary",
        when: (row) => ["DRAFT", "SCHEDULED"].includes(str(row["status"])),
        request: (row) => patch(`/marketing/campaign/${idOf(row)}`, { sendNow: true }),
      },
    ],
    remove: { label: "archive" },
  },
  {
    key: "emails",
    group: "marketing",
    icon: "mail",
    roles: ADMIN,
    api: "/email",
    titleKey: "subject",
    search: "to",
    filters: [{ name: "status", values: ["QUEUED", "SENT", "FAILED"] }],
    columns: [
      { key: "to", type: "title" },
      { key: "subject" },
      { key: "status", type: "badge" },
      { key: "openCount", label: "opens" },
      { key: "createdAt", type: "datetime" },
    ],
    create: {
      schema: sendEmailSchema,
      fields: [
        { name: "to", label: "to", type: "email" },
        {
          name: "templateId",
          label: "template",
          type: "select",
          optionsFrom: { api: "/email/template", value: "id", label: (row) => str(row["name"]) },
        },
        { name: "variables", label: "variables", hint: "variablesHint" },
      ],
      initial: () => ({ to: "", templateId: "", variables: "" }),
      requests: (values) => [post("/email/send", values)],
    },
  },
  {
    key: "templates",
    group: "marketing",
    icon: "template",
    roles: ADMIN,
    api: "/email/template",
    titleKey: "name",
    detailApi: null,
    columns: [
      { key: "name", type: "title" },
      { key: "subject" },
      { key: "variables", type: "list" },
      { key: "locale", type: "code" },
    ],
    detail: [
      { key: "name", type: "title" },
      { key: "subject" },
      { key: "variables", type: "list" },
      { key: "locale", type: "code" },
      { key: "html", type: "long" },
    ],
    create: {
      schema: templateSchema,
      fields: templateFields(),
      initial: () => ({ name: "", subject: "", html: "" }),
      requests: (values) => [post("/email/template", values)],
    },
    edit: {
      schema: templateSchema,
      fields: templateFields(),
      initial: (row) => ({
        name: str(row?.["name"]),
        subject: str(row?.["subject"]),
        html: str(row?.["html"]),
      }),
      requests: (values, row) => [patch(`/email/template/${idOf(row)}`, values)],
    },
    remove: {},
  },
  {
    key: "roles",
    group: "system",
    icon: "shield",
    roles: ADMIN,
    api: "/role",
    titleKey: "name",
    columns: [
      { key: "name", type: "title" },
      { key: "description" },
      { key: "permissions", type: "count" },
    ],
    detail: [
      { key: "name", type: "title" },
      { key: "description", type: "long" },
      { key: "createdAt", type: "datetime" },
    ],
    sections: [
      {
        key: "permissions",
        columns: [
          { key: "action", type: "badge" },
          { key: "resource", type: "code" },
        ],
      },
    ],
    create: {
      schema: roleSchema,
      fields: roleFields(),
      initial: () => ({ name: "", description: "", permissionIds: [] }),
      requests: (values) => [post("/role", values)],
    },
    edit: {
      schema: roleSchema,
      fields: roleFields(),
      initial: (row) => ({
        name: str(row?.["name"]),
        description: str(row?.["description"]),
        permissionIds: ((row?.["permissions"] as Row[] | undefined) ?? []).map((item) =>
          str(item["id"])
        ),
      }),
      requests: (values, row) => [patch(`/role/${idOf(row)}`, values)],
    },
    remove: { when: (row) => !["ADMIN", "VENDOR", "CUSTOMER"].includes(str(row["name"])) },
  },
  {
    key: "permissions",
    group: "system",
    icon: "key",
    roles: ADMIN,
    api: "/permission",
    titleKey: "resource",
    columns: [
      { key: "action", type: "badge" },
      { key: "resource", type: "title" },
      { key: "description" },
    ],
    create: {
      schema: permissionSchema,
      fields: [
        {
          name: "action",
          label: "action",
          type: "select",
          valuesKey: "action",
          options: PERMISSION_ACTIONS.map((value) => ({ value, label: value })),
        },
        { name: "resource", label: "resource", hint: "resourceHint" },
        { name: "description", label: "description" },
      ],
      initial: () => ({ action: "READ", resource: "", description: "" }),
      requests: (values) => [post("/permission", values)],
    },
    edit: {
      schema: permissionUpdateSchema,
      fields: [{ name: "description", label: "description" }],
      initial: (row) => ({ description: str(row?.["description"]) }),
      requests: (values, row) => [patch(`/permission/${idOf(row)}`, values)],
    },
    remove: {},
  },
  {
    key: "webhooks",
    group: "system",
    icon: "plug",
    roles: ADMIN,
    api: "/webhook",
    titleKey: "name",
    detailApi: null,
    columns: [
      { key: "name", type: "title" },
      { key: "url", type: "code" },
      { key: "events", type: "count" },
      { key: "metrics.successRate", type: "percent", label: "successRate" },
      { key: "active", type: "bool", label: "isActive" },
    ],
    detail: [
      { key: "name", type: "title" },
      { key: "url", type: "code" },
      { key: "events", type: "list" },
      { key: "maxAttempts" },
      { key: "metrics.deliveries", label: "deliveries" },
      { key: "metrics.successRate", type: "percent", label: "successRate" },
      { key: "active", type: "bool", label: "isActive" },
    ],
    create: {
      schema: webhookSchema,
      fields: webhookFields(),
      initial: () => ({ name: "", url: "", events: [], maxAttempts: 5, active: true }),
      requests: (values) => [post("/webhook", values)],
    },
    edit: {
      schema: webhookSchema,
      fields: webhookFields(),
      initial: (row) => ({
        name: str(row?.["name"]),
        url: str(row?.["url"]),
        events: (row?.["events"] as string[] | undefined) ?? [],
        maxAttempts: Number(row?.["maxAttempts"] ?? 5),
        active: row?.["active"] !== false,
      }),
      requests: (values, row) => [patch(`/webhook/${idOf(row)}`, values)],
    },
    actions: [
      {
        key: "testWebhook",
        roles: ADMIN,
        request: (row) =>
          post("/webhook/execution", { webhookId: row["id"], payload: { ping: true } }),
      },
    ],
    remove: {},
  },
  {
    key: "workflows",
    group: "system",
    icon: "flow",
    roles: ADMIN,
    api: "/automation",
    titleKey: "name",
    columns: [
      { key: "name", type: "title" },
      { key: "triggerType", type: "badge" },
      { key: "event", type: "code" },
      { key: "metrics.runs", label: "runs" },
      { key: "metrics.successRate", type: "percent", label: "successRate" },
      { key: "active", type: "bool", label: "isActive" },
    ],
    detail: [
      { key: "name", type: "title" },
      { key: "description", type: "long" },
      { key: "triggerType", type: "badge" },
      { key: "event", type: "code" },
      { key: "webhookPath", type: "code" },
      { key: "metrics.runs", label: "runs" },
      { key: "metrics.successRate", type: "percent", label: "successRate" },
      { key: "lastRunAt", type: "datetime" },
      { key: "active", type: "bool", label: "isActive" },
    ],
    create: {
      schema: workflowSchema,
      fields: workflowFields(),
      initial: () => ({
        name: "",
        description: "",
        triggerType: "EVENT",
        event: "order.placed",
        webhookPath: "",
        active: true,
      }),
      requests: (values) => [post("/automation", values)],
    },
    edit: {
      schema: workflowSchema,
      fields: workflowFields(),
      initial: (row) => ({
        name: str(row?.["name"]),
        description: str(row?.["description"]),
        triggerType: str(row?.["triggerType"]),
        event: str(row?.["event"]),
        webhookPath: str(row?.["webhookPath"]),
        active: row?.["active"] !== false,
      }),
      requests: (values, row) => [patch(`/automation/${idOf(row)}`, values)],
    },
    actions: [
      {
        key: "runWorkflow",
        roles: ADMIN,
        tone: "primary",
        when: (row) => row["active"] !== false,
        request: (row) => post(`/automation/${idOf(row)}/run`, { payload: {} }),
      },
    ],
    remove: {},
  },
  {
    key: "audit",
    group: "system",
    icon: "list",
    roles: ADMIN,
    api: "/audit/log",
    titleKey: "action",
    detailApi: null,
    search: "action",
    filters: [
      { name: "severity", values: ["INFO", "WARNING", "CRITICAL"] },
      { name: "reviewed", values: ["false", "true"] },
    ],
    columns: [
      { key: "createdAt", type: "datetime" },
      { key: "severity", type: "badge" },
      { key: "module" },
      { key: "action", type: "title" },
      { key: "status" },
      { key: "reviewed", type: "bool" },
    ],
    detail: [
      { key: "action", type: "title" },
      { key: "severity", type: "badge" },
      { key: "module" },
      { key: "status" },
      { key: "actorId", type: "code" },
      { key: "ip", type: "code" },
      { key: "reviewed", type: "bool" },
      { key: "createdAt", type: "datetime" },
    ],
    actions: [
      {
        key: "markReviewed",
        roles: ADMIN,
        when: (row) => !row["reviewed"],
        request: (row) => patch(`/audit/log/${idOf(row)}`, { reviewed: true }),
      },
    ],
  },
  {
    key: "mcp",
    group: "system",
    icon: "saga",
    roles: ADMIN,
    api: "/mcp",
    titleKey: "type",
    filters: [
      {
        name: "status",
        values: [
          "PENDING",
          "RUNNING",
          "COMPLETED",
          "COMPENSATING",
          "COMPENSATED",
          "FAILED",
          "CANCELLED",
        ],
      },
    ],
    columns: [
      { key: "type", type: "title" },
      { key: "status", type: "badge" },
      { key: "steps", type: "count" },
      { key: "createdAt", type: "datetime" },
    ],
    detail: [
      { key: "type", type: "title" },
      { key: "status", type: "badge" },
      { key: "createdAt", type: "datetime" },
    ],
    sections: [
      {
        key: "steps",
        columns: [
          { key: "name", type: "code" },
          { key: "status", type: "badge" },
          { key: "error" },
        ],
      },
      {
        key: "log",
        columns: [
          { key: "at", type: "datetime", label: "date" },
          { key: "message", label: "description" },
        ],
      },
    ],
    actions: [
      {
        key: "rollback",
        roles: ADMIN,
        tone: "danger",
        when: (row) => ["COMPLETED", "FAILED"].includes(str(row["status"])),
        form: {
          schema: rollbackSchema,
          fields: [{ name: "reason", label: "reason" }],
          initial: () => ({ reason: "" }),
          requests: (values, row) => [post(`/mcp/${idOf(row)}/rollback`, values)],
        },
      },
    ],
  },
];

function couponFields(withCode: boolean): ResourceField[] {
  return [
    ...(withCode ? [{ name: "code", label: "code" }] : []),
    {
      name: "type",
      label: "type",
      type: "select",
      valuesKey: "type",
      options: ["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"].map((value) => ({
        value,
        label: value,
      })),
    },
    { name: "value", label: "value", type: "number", hint: "couponValueHint" },
    { name: "usageLimit", label: "usageLimit", type: "number" },
    { name: "endsAt", label: "endsAt", type: "date" },
  ];
}
function couponBody(values: Record<string, unknown>): Record<string, unknown> {
  return {
    ...values,
    value: values["type"] === "FIXED_AMOUNT" ? Number(values["value"]) * 100 : values["value"],
    endsAt: values["endsAt"]
      ? new Date(`${str(values["endsAt"])}T23:59:59`).toISOString()
      : undefined,
  };
}
function supplierFields(): ResourceField[] {
  return [
    { name: "name", label: "name" },
    { name: "taxId", label: "taxId" },
    { name: "email", label: "email", type: "email" },
    { name: "phone", label: "phone" },
    { name: "contactName", label: "contactName" },
    { name: "paymentTermsDays", label: "paymentTermsDays", type: "number" },
    { name: "leadTimeDays", label: "leadTimeDays", type: "number" },
    { name: "rating", label: "rating", type: "number" },
    { name: "contractEndsAt", label: "contractEndsAt", type: "date" },
  ];
}
function campaignFields(): ResourceField[] {
  return [
    { name: "name", label: "name" },
    {
      name: "channel",
      label: "channel",
      type: "select",
      valuesKey: "channel",
      options: ["EMAIL", "PUSH", "WHATSAPP"].map((value) => ({ value, label: value })),
    },
    {
      name: "audience",
      label: "audience",
      type: "select",
      valuesKey: "audience",
      options: ["ALL", "VIP", "REGULAR", "NEW", "INACTIVE"].map((value) => ({
        value,
        label: value,
      })),
    },
    { name: "subject", label: "subject" },
    { name: "content", label: "content", type: "textarea" },
    { name: "scheduledAt", label: "scheduledAt", type: "datetime-local", hint: "scheduleHint" },
  ];
}
const isoSchedule = (values: Record<string, unknown>) => ({
  ...values,
  scheduledAt: values["scheduledAt"]
    ? new Date(str(values["scheduledAt"])).toISOString()
    : undefined,
});
function templateFields(): ResourceField[] {
  return [
    { name: "name", label: "name" },
    { name: "subject", label: "subject" },
    { name: "html", label: "html", type: "textarea", hint: "htmlHint" },
  ];
}
function roleFields(): ResourceField[] {
  return [
    { name: "name", label: "name", hint: "roleHint" },
    { name: "description", label: "description" },
    {
      name: "permissionIds",
      label: "permissions",
      type: "checkboxes",
      optionsFrom: {
        api: "/permission",
        value: "id",
        label: (row) => `${str(row["action"])} · ${str(row["resource"])}`,
      },
    },
  ];
}
const EVENTS = [
  "order.placed",
  "order.status-changed",
  "order.cancelled",
  "payment.failed",
  "shipment.updated",
  "refund.updated",
  "invoice.issued",
  "loyalty.tier-upgraded",
  "review.moderated",
];
function webhookFields(): ResourceField[] {
  return [
    { name: "name", label: "name" },
    { name: "url", label: "url", type: "url" },
    {
      name: "events",
      label: "events",
      type: "checkboxes",
      options: [...EVENTS, "inventory.low", "cms.updated"].map((value) => ({
        value,
        label: value,
      })),
    },
    { name: "maxAttempts", label: "maxAttempts", type: "number" },
    { name: "active", label: "isActive", type: "checkbox" },
  ];
}
function workflowFields(): ResourceField[] {
  return [
    { name: "name", label: "name" },
    { name: "description", label: "description" },
    {
      name: "triggerType",
      label: "triggerType",
      type: "select",
      valuesKey: "triggerType",
      options: TRIGGER_TYPES.map((value) => ({ value, label: value })),
    },
    {
      name: "event",
      label: "event",
      type: "select",
      options: [{ value: "", label: "—" }, ...EVENTS.map((value) => ({ value, label: value }))],
    },
    { name: "webhookPath", label: "webhookPath", hint: "webhookPathHint" },
    { name: "active", label: "isActive", type: "checkbox" },
  ];
}

const BY_KEY = new Map(RESOURCES.map((resource) => [resource.key, resource]));
export const findResource = (key: string) => BY_KEY.get(key);
export const canUse = (roles: readonly string[], allowed: readonly Role[] | undefined) =>
  !allowed || allowed.some((role) => roles.includes(role));
export const GROUPS: GroupKey[] = [
  "catalog",
  "sales",
  "customers",
  "operations",
  "marketing",
  "system",
];

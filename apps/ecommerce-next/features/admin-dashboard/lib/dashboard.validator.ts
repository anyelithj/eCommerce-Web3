import { z } from "zod";

const text = (min = 1, max = 200) =>
  z
    .string()
    .trim()
    .min(min, min >= 3 ? "validation.min3" : "validation.required")
    .max(max);
const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);
const money = z.coerce
  .number({ invalid_type_error: "validation.required" })
  .min(0, "validation.positive")
  .transform((value) => Math.round(value * 100));
const integer = (min = 0) =>
  z.coerce
    .number({ invalid_type_error: "validation.required" })
    .int()
    .min(min, "validation.positive");

export const ORDER_STATUSES = [
  "CONFIRMED",
  "PREPARING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export const SHIPMENT_STATUSES = [
  "PENDING",
  "LABEL_CREATED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;
export const REFUND_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PROCESSED",
  "CANCELLED",
] as const;
export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
});
export const shipmentUpdateSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES),
  description: optionalText(300),
  location: optionalText(120),
});
export const refundReviewSchema = z.object({
  approve: z.enum(["true", "false"]).transform((value) => value === "true"),
  note: optionalText(500),
});
export const invoiceSchema = z.object({ orderId: z.string().trim().uuid("validation.uuid") });
export const creditNoteSchema = z.object({ amount: money, reason: text(5, 300) });

export const stockAdjustSchema = z.object({ stock: integer(0), reason: text(3) });
export const movementSchema = z.object({
  type: z.enum(["IN", "OUT", "RETURN", "DAMAGE"]),
  quantity: integer(1),
  reason: text(3),
  reference: optionalText(100),
});

export const supplierSchema = z.object({
  name: text(2, 150),
  taxId: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z.-]{5,20}$/, "validation.taxId"),
  email: z.string().trim().email("validation.emailInvalid"),
  phone: optionalText(20),
  contactName: optionalText(120),
  paymentTermsDays: integer(0),
  leadTimeDays: integer(0),
  rating: z
    .union([
      z.literal(""),
      z.coerce.number().min(0, "validation.rating").max(5, "validation.rating"),
    ])
    .transform((value) => (value === "" ? undefined : value)),
  contractEndsAt: optionalText(10),
});

export const customerSchema = z.object({
  email: z.string().trim().email("validation.emailInvalid"),
  firstName: text(1, 80),
  lastName: text(1, 80),
  phone: optionalText(20),
  tags: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  note: optionalText(1000),
});
export const customerUpdateSchema = z.object({
  tags: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  score: z
    .union([
      z.literal(""),
      z.coerce.number().int().min(0, "validation.score").max(100, "validation.score"),
    ])
    .transform((value) => (value === "" ? null : value)),
  note: optionalText(1000),
});

export const campaignSchema = z.object({
  name: text(3, 120),
  channel: z.enum(["EMAIL", "PUSH", "WHATSAPP"]),
  audience: z.enum(["ALL", "VIP", "REGULAR", "NEW", "INACTIVE"]),
  subject: text(1, 200),
  content: text(1, 100_000),
  scheduledAt: optionalText(30),
});
export const templateSchema = z.object({
  name: text(3, 120),
  subject: text(1, 200),
  html: text(1, 100_000),
});
export const sendEmailSchema = z.object({
  to: z.string().trim().email("validation.emailInvalid"),
  templateId: z.string().min(1, "validation.required"),
  variables: z
    .string()
    .default("")
    .transform((value) =>
      Object.fromEntries(
        value
          .split(",")
          .map((pair) => pair.split("=").map((part) => part.trim()))
          .filter(([key, item]) => key && item !== undefined)
      )
    ),
});
export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "validation.couponCode"),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
  value: integer(0),
  usageLimit: z
    .union([z.literal(""), z.coerce.number().int().min(1)])
    .transform((value) => (value === "" ? null : value)),
  endsAt: optionalText(10),
});

export const productImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  alt: text(1, 160),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const variantSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,40}$/, "validation.sku"),
  name: text(1, 80),
  price: money,
  stock: integer(0),
});
export const productSchema = z.object({
  name: text(2, 160),
  description: z.string().trim().min(10, "validation.description").max(10_000),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  categoryId: optionalText(40),
  brandId: optionalText(40),
  variants: z.array(variantSchema).min(1, "validation.required"),
  images: z.array(productImageSchema).max(20),
});

export const webhookSchema = z.object({
  name: text(3, 120),
  url: z.string().trim().url("validation.url"),
  events: z.array(z.string()).min(1, "validation.required"),
  maxAttempts: integer(1),
  active: z.boolean(),
});
export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[A-Z_]+$/, "validation.roleName"),
  description: optionalText(200),
  permissionIds: z.array(z.string()).default([]),
});
export const PERMISSION_ACTIONS = ["CREATE", "READ", "UPDATE", "DELETE"] as const;
export const permissionSchema = z.object({
  action: z.enum(PERMISSION_ACTIONS),
  resource: z
    .string()
    .trim()
    .regex(/^[a-z_]+$/, "validation.resource"),
  description: optionalText(200),
});
export const permissionUpdateSchema = z.object({ description: text(1, 200) });
export const TRIGGER_TYPES = ["EVENT", "MANUAL", "SCHEDULE", "WEBHOOK"] as const;
export const workflowSchema = z
  .object({
    name: text(3, 120),
    description: optionalText(500),
    triggerType: z.enum(TRIGGER_TYPES),
    event: optionalText(60),
    webhookPath: z
      .string()
      .trim()
      .regex(/^[\w-]+(\/[\w-]+)*$/, "validation.webhookPath")
      .max(120),
    active: z.boolean(),
  })
  .refine((value) => value.triggerType !== "EVENT" || value.event !== undefined, {
    message: "validation.required",
    path: ["event"],
  });
export const rollbackSchema = z.object({ reason: text(3, 200) });

const optionalUrl = z
  .string()
  .trim()
  .url("validation.url")
  .optional()
  .or(z.literal("").transform(() => undefined));
const optionalDate = z
  .string()
  .optional()
  .transform((value) => (value ? new Date(value).toISOString() : undefined));
export const categorySchema = z.object({
  name: text(2, 80),
  description: optionalText(1000),
  imageUrl: optionalUrl,
  parentId: optionalText(40).transform((value) => value ?? null),
  isActive: z.boolean(),
});
export const brandSchema = z.object({
  name: text(2, 80),
  description: optionalText(1000),
  website: optionalUrl,
  logoUrl: optionalUrl,
  isActive: z.boolean(),
});
export const collectionSchema = z.object({
  name: text(2, 120),
  description: optionalText(2000),
  imageUrl: optionalUrl,
  startsAt: optionalDate,
  endsAt: optionalDate,
  isActive: z.boolean(),
});
export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const reviewModerationSchema = z.object({
  status: z.enum(REVIEW_STATUSES),
  moderationNote: optionalText(300),
});
export const reviewReplySchema = z.object({ vendorReply: text(3, 1500) });

export const userSchema = z.object({
  firstName: text(1, 80),
  lastName: text(1, 80),
  phone: z
    .string()
    .trim()
    .regex(/^((\+57)?3\d{9})?$/, "validation.colombianMobile")
    .transform((value) => value || null),
  roles: z.array(z.string()).min(1, "validation.required"),
});

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductPayload = z.output<typeof productSchema>;

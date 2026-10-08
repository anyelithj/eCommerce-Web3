// checkout.validator.ts => validación de la nueva dirección de envío (mismas reglas que el AddressSchema del backend).
// Mensajes = claves de traducción (messages/*.json -> "validation.address").
import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  recipientName: z.string().trim().min(1, "validation.address.recipient"),
  phone: z.string().trim().min(7, "validation.address.phone"),
  line1: z.string().trim().min(3, "validation.address.line1"),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "validation.address.city"),
  state: z.string().trim().min(1, "validation.address.state"),
  postalCode: z.string().trim().min(3, "validation.address.postalCode"),
  country: z.string().length(2).default("CO"),
  isDefault: z.boolean().default(false),
});

export type AddressFormValues = z.infer<typeof addressSchema>;

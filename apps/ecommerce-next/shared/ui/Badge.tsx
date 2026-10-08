// Badge.tsx (shadcn/ui + cva) => etiqueta de estado (pedido, pago, descuento). Colores con contraste AA.
import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-slate-700",
        success: "bg-green-100 text-green-800",
        warning: "bg-amber-100 text-amber-800",
        danger: "bg-red-100 text-red-800",
        info: "bg-blue-100 text-blue-800",
        brand: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

// "NonNullable" => "tone" es opcional pero nunca null (tipado estricto con exactOptionalPropertyTypes)
type Tone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}

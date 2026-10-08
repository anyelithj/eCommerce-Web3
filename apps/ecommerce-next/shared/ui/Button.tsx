// Button.tsx (shadcn/ui + Radix Slot + class-variance-authority) => botón base del design system.
// cva => variantes declarativas y tipadas (agregar una variante = una entrada nueva: OCP).
// "asChild" (Radix Slot) => aplica los estilos a otro elemento, ej. <Button asChild><Link href="..."/></Button>,
// sin anidar <a> dentro de <button> (HTML inválido y problema de accesibilidad).
// "useFormStatus" (React 19) => un botón submit dentro de un <form action={serverAction}> muestra "cargando" solo,
// sin estado extra en la página (Server Actions de /recommendations).
"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

export const buttonVariants = cva(
  // Base: foco visible solo con teclado (WCAG 2.4.7) y área táctil mínima en "md"/"lg" (WCAG 2.5.5)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-12 px-6 text-base" },
      fullWidth: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

// "VariantProps" => los tipos de variant/size salen del propio cva (una sola fuente de verdad)
export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, "fullWidth"> {
  asChild?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

// "forwardRef" => el padre puede obtener la ref del elemento nativo (foco programático, formularios)
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    fullWidth = false,
    asChild = false,
    loading = false,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref
) {
  const { pending } = useFormStatus(); // Fuera de un <form> siempre es false
  const busy = loading || (type === "submit" && pending);
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className);
  if (asChild) {
    // Con Slot el hijo es el elemento real (un único hijo): no se inyecta el spinner
    return (
      <Slot ref={ref} className={classes} {...rest}>
        {children}
      </Slot>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy} // Evita doble envío mientras carga
      aria-busy={busy || undefined} // Lectores de pantalla anuncian que la acción está en progreso
      className={classes}
      {...rest}
    >
      {busy && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});

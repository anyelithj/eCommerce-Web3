// Input.tsx (shadcn/ui Input + Radix Label) => campo de formulario accesible: label asociado, ayuda y error anunciados.
// Compatible con Formik ({...form.getFieldProps("campo")}): recibe name/value/onChange/onBlur como un <input> nativo.
"use client"; // Radix Label es un Client Component

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { useTranslations } from "next-intl";
import { cn } from "../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...rest },
  ref
) {
  const t = useTranslations();
  // Los schemas Zod usan CLAVES de traducción como mensaje ("validation.required"): aquí se traducen al idioma
  // actual. Un texto que no es clave (ej. error del backend) se muestra tal cual.
  const errorText = error && t.has(error) ? t(error) : error;
  // "useId" => ID único y estable entre servidor y cliente (sin desajustes de hidratación)
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  // aria-describedby => el lector de pantalla lee la ayuda y el error al enfocar el campo (WCAG 1.3.1 / 3.3.1)
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <LabelPrimitive.Root
        htmlFor={inputId}
        className="text-sm font-medium leading-none text-foreground"
      >
        {label}
      </LabelPrimitive.Root>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "flex h-11 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-destructive" : "border-input",
          className
        )}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {errorText}
        </p>
      )}
    </div>
  );
});

// useZodForm.ts => formularios con Formik (estado: valores, "touched", envío) + Zod (reglas y tipos). Un solo hook
// para todas las features (DRY): cada formulario solo declara su schema, valores iniciales y qué hacer al enviar.
// Patrón Adapter: "zodValidate" traduce los errores de Zod al formato de Formik; Formik no sabe que existe Zod.
"use client"; // Hook con estado de React => solo en Client Components

import {
  getIn,
  setIn,
  useFormik,
  type FormikErrors,
  type FormikHelpers,
  type FormikValues,
} from "formik";
import type { z } from "zod";

// "S extends z.ZodType<...>" => genérico acotado: cualquier schema cuyo INPUT sea un objeto (lo que Formik maneja)
type FormSchema = z.ZodType<unknown, z.ZodTypeDef, FormikValues>;

// zodValidate => función "validate" de Formik a partir de un schema. Formik espera un objeto de errores con la MISMA
// forma que los valores ({ address: { city: "..." } }); "setIn" arma esa forma a partir del "path" de cada error de Zod
export function zodValidate<S extends FormSchema>(schema: S) {
  return (values: z.input<S>): FormikErrors<z.input<S>> => {
    const result = schema.safeParse(values);
    if (result.success) return {};
    // "reduce" => acumula los errores; se conserva el PRIMER mensaje de cada campo (el más relevante)
    return result.error.issues.reduce<FormikErrors<z.input<S>>>((errors, issue) => {
      const path = issue.path.join(".");
      return getIn(errors, path) ? errors : setIn(errors, path, issue.message);
    }, {});
  };
}

interface UseZodFormOptions<S extends FormSchema> {
  schema: S;
  initialValues: z.input<S>; // Formik necesita TODOS los campos: al enviar marca como "touched" los que conoce
  // "z.output" => onSubmit recibe los valores YA transformados por Zod (trim, toUpperCase, "" -> undefined)
  onSubmit: (values: z.output<S>, helpers: FormikHelpers<z.input<S>>) => unknown;
}

export function useZodForm<S extends FormSchema>({
  schema,
  initialValues,
  onSubmit,
}: UseZodFormOptions<S>) {
  const form = useFormik<z.input<S>>({
    initialValues,
    validate: zodValidate(schema),
    // "async" => Formik pone isSubmitting en false al resolverse la promesa (sin llamar a setSubmitting a mano)
    onSubmit: async (values, helpers) => {
      await onSubmit(schema.parse(values) as z.output<S>, helpers);
    },
  });

  // error => mensaje del campo SOLO si el usuario ya lo visitó (blur) o intentó enviar: no se regaña antes de escribir.
  // Devuelve una CLAVE de traducción (los schemas usan claves): Input la traduce; los demás usan t(...)
  const error = (name: string): string | undefined => {
    const message: unknown = getIn(form.errors, name);
    return getIn(form.touched, name) && typeof message === "string" ? message : undefined;
  };

  // "..." (spread) => expone toda la API de Formik (getFieldProps, values, dirty, resetForm...) más el helper "error"
  return { ...form, error };
}

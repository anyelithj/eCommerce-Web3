"use client";

import {
  getIn,
  setIn,
  useFormik,
  type FormikErrors,
  type FormikHelpers,
  type FormikValues,
} from "formik";
import type { z } from "zod";

type FormSchema = z.ZodType<unknown, z.ZodTypeDef, FormikValues>;

export function zodValidate<S extends FormSchema>(schema: S) {
  return (values: z.input<S>): FormikErrors<z.input<S>> => {
    const result = schema.safeParse(values);
    if (result.success) return {};
    return result.error.issues.reduce<FormikErrors<z.input<S>>>((errors, issue) => {
      const path = issue.path.join(".");
      return getIn(errors, path) ? errors : setIn(errors, path, issue.message);
    }, {});
  };
}

interface UseZodFormOptions<S extends FormSchema> {
  schema: S;
  initialValues: z.input<S>;
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
    onSubmit: async (values, helpers) => {
      await onSubmit(schema.parse(values) as z.output<S>, helpers);
    },
  });

  const error = (name: string): string | undefined => {
    const message: unknown = getIn(form.errors, name);
    return getIn(form.touched, name) && typeof message === "string" ? message : undefined;
  };

  return { ...form, error };
}

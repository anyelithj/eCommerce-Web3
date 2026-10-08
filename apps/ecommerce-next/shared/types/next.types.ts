// next.types.ts => props tipadas de páginas del App Router de Next.js 15.
// Desde Next 15, "params" y "searchParams" son PROMESAS (renderizado asíncrono de Server Components).

// "<P>" => genérico con la forma de los segmentos dinámicos ([id], [slug]...). Todas las páginas viven bajo
// app/[locale]/, así que "params" siempre incluye además el idioma ("es" | "en").
export interface PageProps<P extends Record<string, string> = Record<string, never>> {
  params: Promise<P & { locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// firstParam => normaliza un query param que puede llegar repetido (?a=1&a=2) a un solo string
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

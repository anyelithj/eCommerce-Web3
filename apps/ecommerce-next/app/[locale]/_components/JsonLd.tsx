// JsonLd.tsx => inserta datos estructurados Schema.org (JSON-LD) para SEO: Google muestra precio, stock,
// estrellas y breadcrumbs en los resultados (rich results). "<" se escapa para impedir cerrar el <script> (anti-XSS).
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

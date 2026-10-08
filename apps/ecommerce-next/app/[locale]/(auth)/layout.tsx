// layout.tsx dentro de "(auth)" => "Route Group": las carpetas entre paréntesis NO agregan segmento a la URL
// (/login sigue siendo /login; /en/login en inglés), pero SÍ permiten un layout exclusivo para estas páginas.
import type { ReactNode } from "react";
import { config } from "@/shared/constants/config";

// Server Component por defecto: no usa hooks ni interactividad (se renderiza en el servidor: mejor performance/SEO)
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // "min-h-screen" + flex centrado => el formulario queda centrado en cualquier pantalla (responsive por defecto)
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-muted px-4 py-10"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-xl bg-background p-6 shadow-sm sm:p-8">
        <a href={config.cmsUrl} className="text-2xl font-semibold text-foreground">
          {config.siteName}
        </a>
        {children}
      </div>
    </main>
  );
}

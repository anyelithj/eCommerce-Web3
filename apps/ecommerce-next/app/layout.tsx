// app/layout.tsx => layout raíz mínimo. El documento HTML real (<html lang>) lo arma app/[locale]/layout.tsx,
// porque el atributo "lang" depende del idioma de la URL. Este archivo solo existe porque Next exige un layout
// raíz para las rutas fuera de [locale] (api, sitemap, robots) y para el 404 global (app/not-found.tsx).
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}

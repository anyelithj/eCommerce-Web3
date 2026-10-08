// app/not-found.tsx => 404 para URLs que ni siquiera coinciden con un idioma (fuera de [locale]).
// Al no pasar por app/[locale]/layout.tsx debe renderizar su propio <html>; se muestra bilingüe.
// Aquí se usa "next/link" directo (única excepción): no hay idioma resuelto al que ajustar la URL.
import Link from "next/link";
import "./globals.css";

export default function GlobalNotFound() {
  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-background px-4 text-center font-sans">
        <main className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold">Página no encontrada · Page not found</h1>
          <Link href="/" className="underline">
            Ir a la tienda · Go to the store
          </Link>
        </main>
      </body>
    </html>
  );
}

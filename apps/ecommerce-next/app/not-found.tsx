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

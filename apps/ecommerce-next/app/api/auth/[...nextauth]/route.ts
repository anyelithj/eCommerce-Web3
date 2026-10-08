// route.ts => "Catch-all Route Handler": [...nextauth] captura TODAS las rutas bajo /api/auth/*
// (ej. /api/auth/signin, /api/auth/callback/google, /api/auth/session) con un solo archivo.
// Reutiliza la instancia única de next-auth creada en auth-config.ts (DRY: antes se instanciaba aquí y en el middleware).
import { handlers } from "@/shared/lib/auth-config";

// Next.js App Router exige exportar explícitamente las funciones por verbo HTTP soportado
export const { GET, POST } = handlers;

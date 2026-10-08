// database.config.ts (Prisma + Mongoose) => conexiones ÚNICAS a PostgreSQL y MongoDB.
// Patrón Singleton: UNA instancia de PrismaClient para toda la app. Antes cada repository hacía
// "new PrismaClient()", lo que abría un pool de conexiones por módulo y podía agotar max_connections de Postgres.
import { PrismaClient } from "@prisma/client"; // Cliente ORM tipado generado desde prisma/schema.prisma
import mongoose from "mongoose"; // ODM de MongoDB (esquemas + validación para documentos)
import { appConfig, isProduction } from "./app.config";

// "globalThis" => objeto global de JS; en desarrollo ts-node-dev recarga módulos y crearía clientes nuevos
// en cada reinicio en caliente: guardarlo en globalThis reutiliza la misma instancia (patrón recomendado por Prisma)
// "as unknown as" => aserción de tipo en dos pasos: amplía el tipo global con la propiedad propia de forma explícita
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// "??" (nullish coalescing) => reutiliza la instancia existente o crea una nueva (inicialización perezosa)
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    // "log" => en desarrollo muestra advertencias y errores de Prisma; en producción solo errores
    log: isProduction ? ["error"] : ["warn", "error"],
  });

// Solo fuera de producción se guarda en globalThis (en producción no hay recarga en caliente)
if (!isProduction) globalForPrisma.prisma = prisma;

// connectMongo => abre la conexión a MongoDB (notificaciones in-app e historial de búsqueda)
// "async" + "Promise<void>" => se espera en el bootstrap (server.ts) antes de aceptar tráfico
export async function connectMongo(): Promise<void> {
  // "strictQuery" => ignora filtros por campos que no existen en el schema (evita consultas accidentalmente abiertas)
  mongoose.set("strictQuery", true);
  await mongoose.connect(appConfig.MONGO_URL);
}

// disconnectDatabases => cierre ordenado (graceful shutdown) al recibir SIGTERM de Docker/Kubernetes
export async function disconnectDatabases(): Promise<void> {
  // "Promise.all" => cierra ambas conexiones en paralelo
  await Promise.all([prisma.$disconnect(), mongoose.disconnect()]);
}

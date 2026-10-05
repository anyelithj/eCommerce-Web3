import { PrismaClient } from "@prisma/client";
import mongoose from "mongoose";
import { appConfig, isProduction } from "./app.config";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["warn", "error"],
  });

if (!isProduction) globalForPrisma.prisma = prisma;

export async function connectMongo(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(appConfig.MONGO_URL);
}

export async function disconnectDatabases(): Promise<void> {
  await Promise.all([prisma.$disconnect(), mongoose.disconnect()]);
}

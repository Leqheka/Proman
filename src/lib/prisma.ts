import { PrismaClient } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";
const url = process.env.DATABASE_URL || "";
if (isProd && url.startsWith("file:")) {
  throw new Error("DATABASE_URL must not be a SQLite file in production.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["info", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
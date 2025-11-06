import { PrismaClient } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";
const url = process.env.DATABASE_URL || "";
if (isProd && url.startsWith("file:")) {
  throw new Error("DATABASE_URL must not be a SQLite file in production.");
}

// Ensure Neon connections have SSL and stable pooling settings
let effectiveUrl = url;
try {
  const u = new URL(url);
  const isNeon = u.hostname.includes("neon.tech");
  if (isNeon) {
    const p = u.searchParams;
    if (!p.has("sslmode")) p.set("sslmode", "require");
    if (!p.has("pgbouncer")) p.set("pgbouncer", "true");
    if (!p.has("connection_limit")) p.set("connection_limit", "1");
    u.search = p.toString();
    effectiveUrl = u.toString();
  }
} catch {
  // ignore URL parsing issues; Prisma will use the raw env URL
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["info", "warn", "error"] : ["error"],
    datasources: effectiveUrl ? { db: { url: effectiveUrl } } : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
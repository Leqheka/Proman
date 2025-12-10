import { prisma } from "@/lib/prisma";

export async function bumpAndCheck(name: string, key: string, max: number, windowSeconds: number) {
  const now = new Date();
  const since = new Date(Date.now() - windowSeconds * 1000);
  await prisma.loginAttempt.create({ data: { name, key } });
  const count = await prisma.loginAttempt.count({ where: { name, key, createdAt: { gte: since } } });
  return count <= max;
}


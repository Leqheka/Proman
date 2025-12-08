import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

function hash(password, salt) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(password, s, 64).toString("hex");
  return `${s}:${h}`;
}

async function run() {
  const prisma = new PrismaClient();
  const DEFAULT_PW = process.env.DEFAULT_MEMBER_PASSWORD || "Proman@123";
  const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@local";
  const ADMIN_PW = process.env.ADMIN_PASSWORD || "PromanAdmin@123";
  try {
    const users = await prisma.user.findMany();
    for (const u of users) {
      const ph = hash(DEFAULT_PW);
      await prisma.user.update({ where: { id: u.id }, data: { passwordHash: ph } });
    }
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { username: ADMIN_USER, passwordHash: hash(ADMIN_PW), isAdmin: true },
      create: { email: ADMIN_EMAIL, username: ADMIN_USER, passwordHash: hash(ADMIN_PW), isAdmin: true },
    });
    console.log("Initialized member passwords and admin account.");
  } catch (e) {
    console.error("Init auth failed", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();


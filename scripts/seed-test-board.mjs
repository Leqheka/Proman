// Seed a test board with an owner; prints board ID
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  try {
    const email = "perf.test.owner@example.com";
    const owner = await prisma.user.upsert({
      where: { email },
      update: { name: "Perf Owner" },
      create: { email, name: "Perf Owner" },
    });

    const board = await prisma.board.create({
      data: { title: "Perf Test Board", ownerId: owner.id },
    });

    console.log("Board ID:", board.id);
  } catch (e) {
    console.error("Seed failed", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
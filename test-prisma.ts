import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const boards = await prisma.board.findMany({ 
      where: { 
        title: { not: "Admin", mode: "insensitive" } 
      } 
    });
    console.log("BOARDS:", boards.length);
  } catch (err) {
    console.error(err);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());

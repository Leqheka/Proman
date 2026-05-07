const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const card = await prisma.card.findFirst({
    where: { title: "Learn Next.js" },
    include: { board: true, list: true }
  });

  if (card) {
    console.log("Found card:", card);
    console.log("Board archived:", card.board.isArchived);
    console.log("Card archived:", card.archived);
  } else {
    console.log("Card 'Learn Next.js' not found.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

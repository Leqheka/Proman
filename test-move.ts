import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const card = await prisma.card.findFirst({ where: { archived: false } });
  if (!card) {
      console.log("No card found");
      return;
  }
  const lists = await prisma.list.findMany({ where: { boardId: card.boardId }, take: 2 });
  if (lists.length < 2) {
      console.log("Not enough lists");
      return;
  }
  const fromListId = card.listId;
  const toListId = lists.find(l => l.id !== fromListId)?.id || lists[0].id;

  console.log(`Moving card ${card.id} from ${fromListId} to ${toListId}`);
  
  const body = {
      cardId: card.id,
      fromListId: fromListId,
      toListId: toListId,
      toIndex: 0
  };

  try {
      const res = await fetch("http://localhost:3000/api/cards/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
      });
      console.log("Status:", res.status, res.statusText);
      const text = await res.text();
      console.log("Response:", text);
  } catch(e) {
      console.error(e);
  }
}
main().finally(() => prisma.$disconnect());

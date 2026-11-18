import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const card = await prisma.card.findFirst({ where: { archived: false } });
  if (!card) return;
  const lists = await prisma.list.findMany({ where: { boardId: card.boardId } });
  const fromListId = card.listId;
  const toListId = lists.find(l => l.id !== fromListId)?.id || lists[0].id;
  const cardId = card.id;
  
  // Set a default checklist on the destination list
  await prisma.list.update({
      where: { id: toListId },
      data: {
          defaultChecklist: [
              { title: "Test Checklist", items: [{ title: "Item 1" }, { title: "Item 2" }] }
          ]
      }
  });

  console.log(`Moving ${cardId} to ${toListId} which now has a default checklist`);
  
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

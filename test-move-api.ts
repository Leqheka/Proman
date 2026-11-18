import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const card = await prisma.card.findFirst({
    where: { archived: false }
  });
  
  if (!card) {
    console.log("No card found");
    return;
  }
  
  const lists = await prisma.list.findMany({
    where: { boardId: card.boardId }
  });
  
  const fromListId = card.listId;
  const toListId = lists.find(l => l.id !== fromListId)?.id || lists[0].id;
  
  console.log(`Testing move card ${card.id} from ${fromListId} to ${toListId}`);
  
  try {
    const res = await fetch(`http://localhost:3000/api/cards/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: card.id,
        fromListId: fromListId,
        toListId: toListId,
        toIndex: 100
      })
    });
    
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error("Fetch failed", err);
  }
}

main().finally(() => prisma.$disconnect());
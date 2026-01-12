import { prisma } from "@/lib/prisma";

export async function logActivity(
  cardId: string | null,
  boardId: string | null,
  userId: string,
  type: string,
  message: string
) {
  try {
    // If boardId is missing but cardId is present, fetch boardId from card
    if (!boardId && cardId) {
      const card = await prisma.card.findUnique({ where: { id: cardId }, select: { boardId: true } });
      if (card) boardId = card.boardId;
    }

    await prisma.activity.create({
      data: {
        type,
        details: { message },
        userId,
        cardId,
        boardId,
      },
    });
  } catch (err) {
    console.error("Failed to log activity", err);
  }
}

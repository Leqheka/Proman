import { prisma } from "@/lib/prisma";

export type NotificationType = "CARD_ASSIGNMENT" | "COMMENT_MENTION";

export async function createNotification(
  userId: string,
  type: NotificationType,
  data: Record<string, any>
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        data,
        read: false,
      },
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const card = await prisma.card.findFirst({ where: { archived: false } });
  if (!card) return;
  const lists = await prisma.list.findMany({ where: { boardId: card.boardId } });
  const fromListId = card.listId;
  const toListId = lists.find(l => l.id !== fromListId)?.id || lists[0].id;
  const cardId = card.id;
  const toIndex = 0;
  
  console.log(`Moving ${cardId} to ${toListId}`);
  
  try {
      await prisma.$transaction(async (tx) => {
        // remove from source list: close the gap
        await tx.card.updateMany({
          where: { listId: fromListId, archived: false, order: { gt: card.order } },
          data: { order: { decrement: 1 } },
        });
        // make room in dest list
        await tx.card.updateMany({
          where: { listId: toListId, archived: false, order: { gte: toIndex } },
          data: { order: { increment: 1 } },
        });

        const toList = await tx.list.findUnique({
          where: { id: toListId },
          select: { defaultDueDays: true, defaultMemberIds: true, defaultChecklist: true },
        });

        const updateData: any = { listId: toListId, order: toIndex };
        await tx.card.update({ where: { id: cardId }, data: updateData });

        if (toList) {
          await tx.cardAssignment.deleteMany({ where: { cardId } });

          if (toList.defaultMemberIds?.length) {
            await tx.cardAssignment.createMany({
              data: toList.defaultMemberIds.map((uid) => ({ cardId, userId: uid })),
              skipDuplicates: true,
            });
          }
          if (toList.defaultChecklist) {
            const defaults = toList.defaultChecklist as any;
            let checklistsToCreate: { title: string; items: any[] }[] = [];

            if (Array.isArray(defaults) && defaults.length > 0) {
               const isNewFormat = defaults.some(d => d && typeof d === 'object' && 'items' in d && Array.isArray(d.items));
               
               if (isNewFormat) {
                   checklistsToCreate = defaults
                     .filter(d => d && d.title)
                     .map(d => ({
                       title: d.title,
                       items: Array.isArray(d.items) ? d.items : []
                   }));
               } else {
                   const validItems = defaults.filter((i: any) => i && i.title);
                   if (validItems.length > 0) {
                       checklistsToCreate.push({ title: "Checklist", items: validItems });
                   }
               }
            }

            const existingChecklists = await tx.checklist.findMany({
                where: { cardId },
                include: { items: true }
            });

            for (const cl of checklistsToCreate) {
                const match = existingChecklists.find(ex => {
                    if (ex.title !== cl.title) return false;
                    if (ex.items.length !== cl.items.length) return false;
                    const sortedEx = [...ex.items].sort((a, b) => (a.order || 0) - (b.order || 0));
                    return sortedEx.every((item, idx) => {
                         const clItem = cl.items[idx] || {};
                         return item.title === (clItem.title || "Untitled");
                    });
                });

                if (match) continue;

                const checklist = await tx.checklist.create({
                    data: { title: cl.title, cardId }
                });

                for (let idx = 0; idx < cl.items.length; idx++) {
                    const item = cl.items[idx];
                    const createdItem = await tx.checklistItem.create({
                        data: {
                            title: item.title || "Untitled",
                            completed: !!item.completed,
                            order: idx,
                            checklistId: checklist.id
                        }
                    });

                    if (item.subItems && Array.isArray(item.subItems) && item.subItems.length > 0) {
                        await tx.checklistItem.createMany({
                            data: item.subItems.map((sub: any, subIdx: number) => ({
                                title: sub.title || "Untitled",
                                completed: !!sub.completed,
                                order: subIdx,
                                checklistId: checklist.id,
                                parentId: createdItem.id
                            }))
                        });
                    }
                }
            }
          }
        }
      });
      console.log("Success");
  } catch (e) {
      console.error("TRANSACTION FAILED:", e);
  }
}
main().finally(() => prisma.$disconnect());

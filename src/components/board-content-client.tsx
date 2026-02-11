"use client";

import dynamic from "next/dynamic";
import type { ListItem, CardItem } from "./board-content";

const BoardContentLazy = dynamic(() => import("./board-content"), {
  ssr: false,
  loading: () => <div className="px-6 pt-10">Loading board...</div>,
});

export default function BoardContentClient({ 
  boardId, 
  initialLists, 
  archivedCards,
  showArchives,
  onCloseArchives
}: { 
  boardId: string; 
  initialLists: ListItem[]; 
  archivedCards: CardItem[];
  showArchives?: boolean;
  onCloseArchives?: () => void;
}) {
  return <BoardContentLazy 
    boardId={boardId} 
    initialLists={initialLists} 
    archivedCards={archivedCards} 
    showArchives={showArchives} 
    onCloseArchives={onCloseArchives} 
  />;
}
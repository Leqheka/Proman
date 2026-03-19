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
  archivedLists,
  showArchives,
  onCloseArchives,
  showListArchives,
  onCloseListArchives
}: { 
  boardId: string; 
  initialLists: ListItem[]; 
  archivedCards: CardItem[];
  archivedLists?: Array<{ id: string; title: string }>;
  showArchives?: boolean;
  onCloseArchives?: () => void;
  showListArchives?: boolean;
  onCloseListArchives?: () => void;
}) {
  return <BoardContentLazy 
    boardId={boardId} 
    initialLists={initialLists} 
    archivedCards={archivedCards} 
    archivedLists={archivedLists}
    showArchives={showArchives} 
    onCloseArchives={onCloseArchives} 
    showListArchives={showListArchives}
    onCloseListArchives={onCloseListArchives}
  />;
}
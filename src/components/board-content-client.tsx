"use client";

import dynamic from "next/dynamic";
import type { ListItem } from "./board-content";

const BoardContentLazy = dynamic(() => import("./board-content"), {
  ssr: false,
  loading: () => <div className="px-6 pt-10">Loading board...</div>,
});

export default function BoardContentClient({ boardId, initialLists }: { boardId: string; initialLists: ListItem[] }) {
  return <BoardContentLazy boardId={boardId} initialLists={initialLists} />;
}
"use client";

import React from "react";
import BoardToolbar from "./board-toolbar";
import BoardContentClient from "./board-content-client";
import type { ListItem, CardItem } from "./board-content";

function normalizeUnsplash(u: string) {
  try {
    const url = new URL(u);
    if (url.hostname === "images.unsplash.com" || url.hostname === "plus.unsplash.com") {
      if (!url.searchParams.has("ixlib")) url.searchParams.set("ixlib", "rb-4.0.3");
      // Large background: keep quality modest and width reasonable
      if (!url.searchParams.has("w")) url.searchParams.set("w", "1600");
      if (!url.searchParams.has("q")) url.searchParams.set("q", "60");
      if (!url.searchParams.has("auto")) url.searchParams.set("auto", "format");
      if (!url.searchParams.has("fit")) url.searchParams.set("fit", "crop");
      return url.toString();
    }
    return u;
  } catch {
    return u;
  }
}

const toProxy = (u: string) => (u && u.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(u)}` : u);

export default function BoardPageClient({
  currentBoardId,
  boardTitle,
  initialBackground,
  boards,
  initialLists,
  archivedCards,
}: {
  currentBoardId: string;
  boardTitle: string;
  initialBackground: string;
  boards: Array<{ id: string; title: string }>;
  initialLists: ListItem[];
  archivedCards: CardItem[];
}) {
  const [bg, setBg] = React.useState<string>(initialBackground);
  const appliedBg = bg ? toProxy(normalizeUnsplash(bg)) : undefined;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground" style={{ backgroundImage: appliedBg ? `url(${appliedBg})` : undefined }}>
      <BoardToolbar boards={boards} currentBoardId={currentBoardId} boardTitle={boardTitle} onBackgroundChanged={setBg} />
      <BoardContentClient boardId={currentBoardId} initialLists={initialLists} archivedCards={archivedCards} />
    </div>
  );
}
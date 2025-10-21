"use client";

import Link from "next/link";
import GlobalSearch from "./global-search";

export default function AppHeader() {
  return (
    <header className="fixed top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-black/10 dark:border-white/15">
      <div className="mx-auto max-w-7xl px-4 h-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <Link href="/" className="font-semibold text-sm whitespace-nowrap">Proman</Link>
        <GlobalSearch />
        <div className="flex items-center gap-3 justify-self-end">
          <button title="Notifications" className="text-sm rounded px-2 py-1 bg-foreground/5">🔔</button>
          <button title="Profile" className="w-7 h-7 rounded-full bg-foreground/20 flex items-center justify-center text-xs">ME</button>
        </div>
      </div>
    </header>
  );
}
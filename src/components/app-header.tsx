"use client";

import Link from "next/link";
import GlobalSearch from "./global-search";
import Avatar from "./avatar";
import React from "react";

export default function AppHeader() {
  const [openProfile, setOpenProfile] = React.useState(false);
  const [loggedIn, setLoggedIn] = React.useState<boolean | null>(null);
  const [user, setUser] = React.useState<{ id: string; email: string; username?: string | null; name?: string | null; image?: string | null } | null>(null);
  const profileWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    if (!openProfile) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const container = profileWrapRef.current;
      if (container && !container.contains(target)) {
        setOpenProfile(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenProfile(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openProfile]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  }

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me");
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        setLoggedIn(r.ok);
        setUser(r.ok ? (j?.user || null) : null);
      } catch {
        if (!alive) return;
        setLoggedIn(false);
        setUser(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem("theme");
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
      setTheme(initial);
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(theme);
      window.localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  return (
    <header className="fixed top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-black/10 dark:border-white/15">
      <div className="mx-auto max-w-7xl px-4 h-10 grid grid-cols-[1fr_minmax(0,2fr)_1fr] items-center gap-4">
        {loggedIn ? (
          <Link href="/" className="font-semibold text-sm whitespace-nowrap">Proman</Link>
        ) : (
          <span className="font-semibold text-sm whitespace-nowrap select-none">Proman</span>
        )}
        {loggedIn ? <GlobalSearch /> : <span />}
        <div className="flex items-center gap-3 justify-self-end">
          {loggedIn ? (
            <button
              title="Toggle theme"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            >
              <span className="text-xs">{theme === "light" ? "☾" : "☼"}</span>
            </button>
          ) : null}
          {loggedIn ? (
            <button title="Notifications" className="text-sm rounded px-2 py-1 bg-foreground/5 text-foreground">🔔</button>
          ) : null}
          {loggedIn ? (
          <div className="relative" ref={profileWrapRef}>
            <button
              title="Profile"
              onClick={() => setOpenProfile((v) => !v)}
              className="w-7 h-7 rounded-full bg-foreground/20 flex items-center justify-center text-xs overflow-hidden"
            >
              <Avatar name={user?.name || undefined} email={user?.email || ""} image={user?.image || undefined} size={28} />
            </button>
            {openProfile && (
              <div className="absolute right-0 mt-2 w-40 rounded border border-black/10 dark:border-white/15 bg-background p-2 shadow">
                <Link href="/settings/password" className="block text-xs rounded px-2 py-1 hover:bg-foreground/5">Settings</Link>
                <Link href="/settings/profile" className="block text-xs rounded px-2 py-1 hover:bg-foreground/5">Profile</Link>
                <button onClick={logout} className="block w-full text-left text-xs rounded px-2 py-1 hover:bg-foreground/5">Logout</button>
              </div>
            )}
          </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

"use client";

import React from "react";

const HOME_BACKGROUNDS = [
  "/Backgrounds/Default.jpg",
  "/Backgrounds/aj-FjDaN9WlRLg-unsplash.jpg",
  "/Backgrounds/aritra-roy-mEjphVjP3hA-unsplash.jpg",
  "/Backgrounds/barb-canale-YDG0lDHz9PI-unsplash.jpg",
  "/Backgrounds/clement-fusil-Fpqx6GGXfXs-unsplash.jpg",
  "/Backgrounds/elizeu-dias-RN6ts8IZ4_0-unsplash.jpg",
  "/Backgrounds/gayatri-malhotra-P9gkfbaxMTU-unsplash.jpg",
  "/Backgrounds/lukas-blazek-GnvurwJsKaY-unsplash.jpg",
  "/Backgrounds/maxxup-B2I9jm2bDlE-unsplash.jpg",
  "/Backgrounds/sean-oulashin-KMn4VEePR8-unsplash.jpg",
  "/Backgrounds/social-mode-WmVtCFR1C1g-unsplash.jpg",
  "/Backgrounds/tianyi-ma-j1Fv6s4jwXI-unsplash.jpg",
];

const DEFAULT_HOME_BG = HOME_BACKGROUNDS[0];

export default function HomeScene({ children }: { children: React.ReactNode }) {
  const [bg, setBg] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem("homeBg");
      if (v) setBg(v);
    } catch {}
  }, []);

  function changeBackground(url: string) {
    try {
      localStorage.setItem("homeBg", url);
      setBg(url);
      setOpen(false);
    } catch {}
  }

  // Use a relative proxy path to keep SSR and client styles identical
  const toProxy = (u: string) => (u && u.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(u)}` : u);

  const appliedBg = bg ?? DEFAULT_HOME_BG;
  const style: React.CSSProperties = {
    backgroundImage: `url(${toProxy(appliedBg)}), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)`,
    backgroundSize: "cover, auto",
    backgroundPosition: "center, center",
    backgroundRepeat: "no-repeat, no-repeat",
  };

  return (
    <div className="min-h-screen text-foreground" style={style}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mt-2 mb-2 flex items-center justify-end">
          <div className="relative">
            <button onClick={() => setOpen((v) => !v)} className="text-xs rounded px-2 py-1 bg-foreground/5">Change background</button>
            {open && (
              <div className="absolute right-0 mt-2 w-64 rounded border border-black/10 dark:border-white/15 bg-background p-2 shadow z-50">
                <div className="grid grid-cols-2 gap-2">
                  {HOME_BACKGROUNDS.map((u) => (
                    <button
                      key={u}
                      className="h-20 rounded overflow-hidden border border-black/10 dark:border-white/15"
                      onClick={() => changeBackground(u)}
                      style={{ backgroundImage: `url(${toProxy(u)}), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)`, backgroundSize: "cover, auto", backgroundPosition: "center, center", backgroundRepeat: "no-repeat, no-repeat" }}
                      aria-label="Pick background"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

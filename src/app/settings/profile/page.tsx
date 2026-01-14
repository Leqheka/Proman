"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<{ id: string; email: string; username?: string | null; name?: string | null; image?: string | null } | null>(null);
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [backHref, setBackHref] = React.useState<string>("/");

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/users/me");
        if (r.status === 401) {
          router.push("/login");
          return;
        }
        const j = await r.json();
        if (!alive) return;
        if (r.ok) {
          setUser(j);
          setName(j?.name || "");
          setUsername(j?.username || "");
          setEmail(j?.email || "");
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    try {
      const id = localStorage.getItem("lastBoardId");
      if (id) setBackHref(`/boards/${id}`);
    } catch {}
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username, email }) });
      if (r.status === 401) {
        router.push("/login");
        return;
      }
      const j = await r.json();
      if (!r.ok) setMsg(j?.error || "Failed"); else { setMsg("Saved"); setUser(j.user); }
    } catch { setMsg("Network error"); } finally { setBusy(false); }
  }

  async function uploadAvatar(file: File) {
    if (!user?.id) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/users/${user.id}/image`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) setMsg(j?.error || "Upload failed"); else { setMsg("Profile picture updated"); setUser((u) => (u ? { ...u, image: j.image } : u)); }
    } catch { setMsg("Network error"); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-5xl px-6 pt-6 flex items-center justify-between">
        <span />
        <a href={backHref} className="text-xs rounded px-2 py-1 bg-foreground text-background">Back to board</a>
      </div>
      <div className="w-full max-w-sm mx-auto mt-4 rounded border border-black/10 dark:border-white/15 p-4 bg-background">
        <p className="text-lg font-semibold">Profile settings</p>
        <div className="mt-3 flex justify-center">
          <label className="group relative cursor-pointer">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} 
            />
            {user?.image ? (
              <img 
                src={user.image} 
                alt={user.name || user.email} 
                className="w-48 h-48 rounded-full object-cover border-4 border-background shadow-lg" 
              />
            ) : (
              <div className="w-48 h-48 rounded-full bg-foreground/20 flex items-center justify-center text-4xl border-4 border-background shadow-lg">
                {(user?.name || user?.email || "").slice(0,2).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-sm font-medium">Upload new</span>
            </div>
          </label>
        </div>
        <label className="text-xs mt-3 block">Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full text-sm px-2 py-1 border rounded bg-background" />
        <label className="text-xs mt-3 block">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full text-sm px-2 py-1 border rounded bg-background" />
        <label className="text-xs mt-3 block">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full text-sm px-2 py-1 border rounded bg-background" />
        {msg ? <p className="mt-2 text-xs">{msg}</p> : null}
        <button onClick={save} disabled={busy} className="mt-3 w-full text-xs rounded px-3 py-2 bg-foreground text-background">{busy ? "Saving..." : "Save"}</button>
      </div>
    </div>
  );
}

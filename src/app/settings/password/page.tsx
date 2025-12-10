"use client";
import React from "react";

export default function PasswordSettingsPage() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function change() {
    setLoading(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/auth/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      if (resp.ok) setMsg("Password changed"); else setMsg((await resp.json()).error || "Failed");
    } catch { setMsg("Network error"); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="w-full max-w-sm rounded border border-black/10 dark:border-white/15 p-4 bg-background">
        <p className="text-lg font-semibold">Change password</p>
        <label className="text-xs mt-3 block">Current password</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="mt-1 w-full text-sm px-2 py-1 border rounded bg-background" />
        <label className="text-xs mt-3 block">New password</label>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1 w-full text-sm px-2 py-1 border rounded bg-background" />
        {msg ? <p className="mt-2 text-xs">{msg}</p> : null}
        <button onClick={change} disabled={loading} className="mt-3 w-full text-xs rounded px-3 py-2 bg-foreground text-background">{loading ? "Saving..." : "Save"}</button>
      </div>
    </div>
  );
}


"use client";
import React from "react";

export default function LoginPage() {
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [bg, setBg] = React.useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }) });
      if (resp.ok) {
        window.location.href = "/";
      } else {
        const j = await resp.json().catch(() => ({}));
        setError(j?.error || "Login failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/landing-bg");
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        if (j?.url) setBg(String(j.url));
      } catch {
        if (!alive) return;
        setBg("https://images.unsplash.com/photo-1528164344705-475426870aed?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3");
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${bg || "https://images.unsplash.com/photo-1528164344705-475426870aed?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-sm rounded border border-black/10 dark:border-white/15 p-4 bg-background">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <p className="text-lg font-semibold">Sign in</p>
          <label className="text-xs mt-3 block">Username or email</label>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="mt-1 w-full text-sm px-2 py-1 border rounded bg-background" />
          <label className="text-xs mt-3 block">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full text-sm px-2 py-1 border rounded bg-background" />
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="mt-3 w-full text-xs rounded px-3 py-2 bg-foreground text-background">{loading ? "Signing in..." : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}

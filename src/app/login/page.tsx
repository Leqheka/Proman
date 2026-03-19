"use client";
import React from "react";

export default function LoginPage() {
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
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
          <div className="relative mt-1">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full text-sm px-2 py-1 border rounded bg-background pr-10" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground focus:outline-none"
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="mt-3 w-full text-xs rounded px-3 py-2 bg-foreground text-background">{loading ? "Signing in..." : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}

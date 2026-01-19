"use client";

import React from "react";
import Link from "next/link";
import Avatar from "@/components/avatar";

type Member = { id: string; name?: string | null; email: string; image?: string | null; isAdmin: boolean };

export default function MembersClient({
  initialMembers,
  currentUserAdmin,
}: {
  initialMembers: Member[];
  currentUserAdmin: boolean;
}) {
  const [members, setMembers] = React.useState<Member[]>(initialMembers || []);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [uploadingUserId, setUploadingUserId] = React.useState<string | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      showToast("error", "Email is required");
      return;
    }
    setBusy(true);
    try {
      const resp = await fetch(`/api/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, isAdmin }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast("error", data?.error || "Failed to add member");
      } else {
        const created: Member = { id: data.id, name: data.name, email: data.email, image: data.image, isAdmin: data.isAdmin };
        setMembers((prev) => {
          const exists = prev.some((m) => m.id === created.id);
          const next = exists ? prev.map((m) => (m.id === created.id ? created : m)) : [created, ...prev];
          return next;
        });
        setEmail("");
        setName("");
        setIsAdmin(false);
        showToast("success", "Member added successfully");
      }
    } catch (err) {
      console.error("Add member error", err);
      showToast("error", "Network error while adding member");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(userId: string, file: File) {
    setUploadingUserId(userId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Assuming existing user image upload endpoint works for global users too
      const resp = await fetch(`/api/users/${userId}/image`, { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) {
        showToast("error", data?.error || "Upload failed");
      } else {
        setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, image: data.image } : m)));
        showToast("success", "Profile picture updated");
      }
    } catch (err) {
      console.error("Upload avatar error", err);
      showToast("error", "Network error while uploading avatar");
    } finally {
      setUploadingUserId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded px-3 py-2 text-sm shadow ${
            toast.type === "success" ? "bg-green-600 text-background" : "bg-red-600 text-background"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Workspace Members</h1>
          <Link href="/" className="text-xs rounded px-2 py-1 bg-black text-white dark:bg-white dark:text-black">
            Back to Home
          </Link>
        </div>

        {currentUserAdmin && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">Register new member</h2>
          <form onSubmit={handleAddMember} className="mt-2 flex items-center gap-2 flex-wrap">
            <input
              name="email"
              type="email"
              required
              placeholder="email@example.com"
              className="text-xs px-2 py-1 border rounded bg-background min-w-[200px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              name="name"
              type="text"
              placeholder="Full name"
              className="text-xs px-2 py-1 border rounded bg-background min-w-[150px]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="text-xs flex items-center gap-1">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              Admin
            </label>
            <button disabled={busy} className="text-xs rounded px-2 py-1 bg-foreground text-background">
              {busy ? "Adding..." : "Add Member"}
            </button>
          </form>
        </section>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold">All Members ({members.length})</h2>
          {members.length === 0 ? (
            <p className="text-xs text-foreground/60 mt-2">No members found.</p>
          ) : (
            <ul className="mt-2 divide-y divide-black/10 dark:divide-white/15">
              {members.map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} email={m.email} image={m.image} size={28} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{m.name || m.email}</p>
                        {m.isAdmin && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/60">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs inline-flex items-center gap-2 cursor-pointer hover:text-foreground/80 transition-colors">
                      <span>Upload photo</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadAvatar(m.id, file);
                        }}
                      />
                    </label>
                    <span className="text-[11px] text-foreground/60 w-16 text-right">
                      {uploadingUserId === m.id ? "Uploading..." : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

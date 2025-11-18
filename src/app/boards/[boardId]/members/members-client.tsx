"use client";

import React from "react";
import Link from "next/link";
import Avatar from "@/components/avatar";

type Member = { id: string; name?: string | null; email: string; role: string; image?: string | null };

export default function MembersClient({
  boardId,
  boardTitle,
  initialMembers,
}: {
  boardId: string;
  boardTitle: string;
  initialMembers: Member[];
}) {
  const [members, setMembers] = React.useState<Member[]>(initialMembers || []);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("VIEWER");
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
      const resp = await fetch(`/api/boards/${boardId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast("error", data?.error || "Failed to add member");
      } else {
        const created: Member = { id: data.id, name: data.name, email: data.email, role: data.role, image: data.image };
        setMembers((prev) => {
          const exists = prev.some((m) => m.id === created.id);
          const next = exists ? prev.map((m) => (m.id === created.id ? created : m)) : [created, ...prev];
          return next;
        });
        setEmail("");
        setName("");
        setRole(created.role || "VIEWER");
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
          <h1 className="text-2xl font-bold">Members · {boardTitle || "Board"}</h1>
          <Link href={`/boards/${boardId}`} prefetch={false} className="text-xs rounded px-2 py-1 bg-foreground/5">
            Back to board
          </Link>
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-semibold">Register new member</h2>
          <form onSubmit={handleAddMember} className="mt-2 flex items-center gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="email@example.com"
              className="text-xs px-2 py-1 border rounded bg-background"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              name="name"
              type="text"
              placeholder="Full name"
              className="text-xs px-2 py-1 border rounded bg-background"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              name="role"
              className="text-xs px-2 py-1 border rounded bg-background"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button disabled={busy} className="text-xs rounded px-2 py-1 bg-foreground text-background">
              {busy ? "Adding..." : "Add"}
            </button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold">Existing members</h2>
          {members.length === 0 ? (
            <p className="text-xs text-foreground/60 mt-2">No members yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-black/10 dark:divide-white/15">
              {members.map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} email={m.email} image={m.image} size={28} />
                    <div>
                      <p className="text-sm font-medium">{m.name || m.email}</p>
                      <p className="text-xs text-foreground/60">{m.email} · {m.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs inline-flex items-center gap-2">
                      <span>Profile picture</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadAvatar(m.id, file);
                        }}
                      />
                    </label>
                    <span className="text-[11px] text-foreground/60">
                      {uploadingUserId === m.id ? "Uploading..." : ""}
                    </span>
                    <form action={`/api/boards/${boardId}/members/${m.id}`} method="post">
                      <input type="hidden" name="_method" value="PATCH" />
                      <select name="role" className="text-xs px-2 py-1 border rounded bg-background" defaultValue={m.role}>
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button className="ml-2 text-xs rounded px-2 py-1 bg-foreground/5">Update</button>
                    </form>
                    <form action={`/api/boards/${boardId}/members/${m.id}`} method="post" className="inline">
                      <input type="hidden" name="_method" value="DELETE" />
                      <button className="text-xs rounded px-2 py-1 bg-red-600 text-background">Remove</button>
                    </form>
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
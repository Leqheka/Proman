"use client";

import React from "react";
import Link from "next/link";
import Avatar from "@/components/avatar";

type Member = { id: string; name?: string | null; email: string; image?: string | null; isAdmin: boolean; role: string };

const ROLES = ["VIEWER", "EDITOR", "ADMIN"];

export default function MembersClient({
  initialMembers,
  currentUserAdmin,
}: {
  initialMembers: Member[];
  currentUserAdmin: boolean;
}) {
  const [members, setMembers] = React.useState<Member[]>(initialMembers || []);
  
  // New Member Form State
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("VIEWER");
  
  // UI State
  const [toast, setToast] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [uploadingUserId, setUploadingUserId] = React.useState<string | null>(null);
  const [editingMember, setEditingMember] = React.useState<Member | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

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
      const isAdmin = role === "ADMIN"; // For backward compatibility/sync
      const resp = await fetch(`/api/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, isAdmin, role }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast("error", data?.error || "Failed to add member");
      } else {
        const created: Member = { 
          id: data.id, 
          name: data.name, 
          email: data.email, 
          image: data.image, 
          isAdmin: data.isAdmin,
          role: data.role || (data.isAdmin ? "ADMIN" : "VIEWER")
        };
        setMembers((prev) => {
          const exists = prev.some((m) => m.id === created.id);
          const next = exists ? prev.map((m) => (m.id === created.id ? created : m)) : [created, ...prev];
          return next;
        });
        setEmail("");
        setName("");
        setRole("VIEWER");
        showToast("success", "Member added successfully");
      }
    } catch (err) {
      console.error("Add member error", err);
      showToast("error", "Network error while adding member");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setBusy(true);
    try {
      const isAdmin = editingMember.role === "ADMIN";
      const resp = await fetch(`/api/members/${editingMember.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          name: editingMember.name, 
          email: editingMember.email, 
          role: editingMember.role,
          isAdmin 
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast("error", data?.error || "Failed to update member");
      } else {
        setMembers((prev) => prev.map((m) => (m.id === editingMember.id ? { ...m, ...editingMember, isAdmin } : m)));
        setEditingMember(null);
        showToast("success", "Member updated successfully");
      }
    } catch (err) {
      console.error("Update member error", err);
      showToast("error", "Network error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteMember() {
    if (!deleteId) return;
    setBusy(true);
    try {
      const resp = await fetch(`/api/members/${deleteId}`, { method: "DELETE" });
      if (!resp.ok) {
        const data = await resp.json();
        showToast("error", data?.error || "Failed to delete member");
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== deleteId));
        setDeleteId(null);
        showToast("success", "Member deleted successfully");
      }
    } catch (err) {
      console.error("Delete member error", err);
      showToast("error", "Network error");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resettingMember || !newPassword) return;
    setBusy(true);
    try {
      const resp = await fetch("/api/auth/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: resettingMember.id, newPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast("error", data?.error || "Failed to reset password");
      } else {
        showToast("success", "Password reset successfully");
        setResettingMember(null);
        setNewPassword("");
      }
    } catch (err) {
      console.error("Reset password error", err);
      showToast("error", "Network error");
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
      showToast("error", "Network error");
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

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded bg-background p-4 shadow-lg border border-black/10 dark:border-white/15">
            <h3 className="text-lg font-bold">Delete Member?</h3>
            <p className="mt-2 text-sm text-foreground/80">Are you sure you want to delete this member? This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button 
                onClick={() => setDeleteId(null)} 
                className="text-xs rounded px-3 py-1.5 bg-foreground/10 hover:bg-foreground/20"
                disabled={busy}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteMember} 
                className="text-xs rounded px-3 py-1.5 bg-red-600 text-white hover:bg-red-700"
                disabled={busy}
              >
                {busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded bg-background p-6 shadow-lg border border-black/10 dark:border-white/15">
            <h3 className="text-lg font-bold">Edit Member</h3>
            <form onSubmit={handleUpdateMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full text-sm px-3 py-2 border rounded bg-background"
                  value={editingMember.email}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full text-sm px-3 py-2 border rounded bg-background"
                  value={editingMember.name || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Role</label>
                <select
                  className="w-full text-sm px-3 py-2 border rounded bg-background"
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingMember(null)} 
                  className="text-xs rounded px-3 py-1.5 bg-foreground/10 hover:bg-foreground/20"
                  disabled={busy}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="text-xs rounded px-3 py-1.5 bg-foreground text-background"
                  disabled={busy}
                >
                  {busy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded bg-background p-6 shadow-lg border border-black/10 dark:border-white/15">
            <h3 className="text-lg font-bold">Reset Password</h3>
            <p className="mt-1 text-xs text-foreground/60">
              For user: <span className="font-semibold">{resettingMember.name || resettingMember.email}</span>
            </p>
            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  className="w-full text-sm px-3 py-2 border rounded bg-background"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => { setResettingMember(null); setNewPassword(""); }} 
                  className="text-xs rounded px-3 py-1.5 bg-foreground/10 hover:bg-foreground/20"
                  disabled={busy}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="text-xs rounded px-3 py-1.5 bg-red-600 text-white hover:bg-red-700"
                  disabled={busy}
                >
                  {busy ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
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
        <section className="mt-6 p-4 rounded border border-black/10 dark:border-white/15 bg-foreground/5">
          <h2 className="text-sm font-semibold">Register new member</h2>
          <form onSubmit={handleAddMember} className="mt-3 flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs mb-1 font-medium">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="email@example.com"
                className="w-full text-sm px-2 py-1.5 border rounded bg-background"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs mb-1 font-medium">Name</label>
              <input
                name="name"
                type="text"
                placeholder="Full name"
                className="w-full text-sm px-2 py-1.5 border rounded bg-background"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="w-[120px]">
              <label className="block text-xs mb-1 font-medium">Role</label>
              <select
                className="w-full text-sm px-2 py-1.5 border rounded bg-background"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <button disabled={busy} className="text-xs rounded px-4 py-2 bg-foreground text-background font-medium">
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
            <div className="mt-4 rounded border border-black/10 dark:border-white/15 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 border-b border-black/10 dark:border-white/15">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/15 bg-background">
                  {members.map((m) => (
                    <tr key={m.id} className="group hover:bg-foreground/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative group/avatar cursor-pointer">
                            <Avatar name={m.name} email={m.email} image={m.image} size={32} />
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover/avatar:opacity-100 rounded-full transition-opacity">
                              <span className="text-[8px]">Upload</span>
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
                          </div>
                          <div>
                            <p className="font-medium">{m.name || "No Name"}</p>
                            <p className="text-xs text-foreground/60">{m.email}</p>
                            {uploadingUserId === m.id && (
                              <p className="text-[10px] text-blue-500">Uploading...</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                          ${m.role === "ADMIN" || m.isAdmin ? "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800" : 
                            m.role === "EDITOR" ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" :
                            "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                          }`}>
                          {m.role || (m.isAdmin ? "ADMIN" : "VIEWER")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {currentUserAdmin && (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingMember(m)}
                              className="text-xs rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 text-foreground"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => setResettingMember(m)}
                              className="text-xs rounded px-2 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40 dark:text-yellow-400"
                            >
                              Reset PW
                            </button>
                            <button 
                              onClick={() => setDeleteId(m.id)}
                              className="text-xs rounded px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

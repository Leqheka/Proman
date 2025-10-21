"use client";

import { useRouter } from "next/navigation";

const BG_CHOICES = [
  "https://picsum.photos/id/1018/1600/900",
  "https://picsum.photos/id/1024/1600/900",
  "https://picsum.photos/id/1035/1600/900",
];

export default function BoardBackgroundPicker({ boardId }: { boardId: string }) {
  const router = useRouter();
  const toProxy = (u: string) => (u && u.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(u)}` : u);

  async function changeBackground(url: string) {
    try {
      await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: url }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to change background", err);
      alert("Failed to change background");
    }
  }

  return (
    <div className="flex items-center gap-2">
      {BG_CHOICES.map((u) => (
        <button
          key={u}
          title="Set background"
          onClick={() => changeBackground(u)}
          className="h-8 w-12 rounded overflow-hidden border border-black/10 dark:border-white/15"
          style={{ backgroundImage: `url(${toProxy(u)}), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)`, backgroundSize: "cover, auto", backgroundPosition: "center, center" }}
          aria-label="Pick background"
        />
      ))}
    </div>
  );
}
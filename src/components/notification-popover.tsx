"use client";

import React from "react";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  type: string;
  data: any;
  read: boolean;
  createdAt: string;
};

export default function NotificationPopover() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch (e) {
      console.error(e);
    }
  }

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }

  function handleClick(n: Notification) {
    if (!n.read) markRead(n.id);
    setIsOpen(false);
    
    if (n.type === "CARD_ASSIGNMENT" || n.type === "COMMENT_MENTION") {
        if (n.data.boardId && n.data.cardId) {
            router.push(`/boards/${n.data.boardId}?openCard=${n.data.cardId}`);
        }
    }
  }

  function getMessage(n: Notification) {
    if (n.type === "CARD_ASSIGNMENT") {
        return (
            <span>
                You were assigned to <strong>{n.data.cardTitle || "a card"}</strong>
                {n.data.boardTitle ? ` in ${n.data.boardTitle}` : ""}
            </span>
        );
    }
    if (n.type === "COMMENT_MENTION") {
        return (
            <span>
                {n.data.mentionedByName || "Someone"} mentioned you in <strong>{n.data.cardTitle || "a card"}</strong>
            </span>
        );
    }
    return "New notification";
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-sm rounded px-2 py-1 bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadCount}
            </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-black/10 dark:border-neutral-800 bg-background shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-black/10 dark:border-neutral-800 flex justify-between items-center">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <button onClick={fetchNotifications} className="text-xs hover:text-primary">Refresh</button>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-foreground/50">No notifications</div>
                ) : (
                    notifications.map(n => (
                        <div 
                            key={n.id}
                            onClick={() => handleClick(n)}
                            className={`p-3 border-b border-black/5 dark:border-white/5 cursor-pointer hover:bg-foreground/5 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                        >
                            <p className="text-xs">{getMessage(n)}</p>
                            <p className="text-[10px] text-foreground/40 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  );
}

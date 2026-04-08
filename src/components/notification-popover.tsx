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
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
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

  async function clearNotifications(type: "read" | "all") {
    try {
      await fetch(`/api/notifications?type=${type}`, { method: "DELETE" });
      if (type === "all") {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        setNotifications(prev => prev.filter(n => !n.read));
      }
      setShowClearConfirm(false);
    } catch (e) {
      console.error("Failed to clear notifications", e);
    }
  }

  function handleClick(n: Notification) {
    if (!n.read) markRead(n.id);
    setIsOpen(false);
    
    if (n.type === "CARD_ASSIGNMENT" || n.type === "COMMENT_MENTION" || n.type === "CARD_DUE") {
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
    if (n.type === "CARD_DUE") {
        const state = n.data.state;
        const stateText = state === "today" ? "is due today" : state === "overdue" ? "is overdue" : "is due soon";
        return (
            <span>
                Card <strong>{n.data.cardTitle || "Untitled"}</strong> {stateText}
            </span>
        );
    }
    return "New notification";
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors"
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
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
                <div className="flex items-center gap-3">
                    {notifications.length > 0 && (
                        <button onClick={() => setShowClearConfirm(true)} className="text-xs text-red-500 hover:text-red-600 transition-colors">Clear</button>
                    )}
                </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-foreground/50">No notifications</div>
                ) : (
                    notifications.map(n => (
                        <div 
                            key={n.id}
                            onClick={() => handleClick(n)}
                            className={`p-3 border-b border-black/5 dark:border-white/5 cursor-pointer transition-all relative hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_4px_6px_-1px_rgba(255,255,255,0.1)] hover:z-10 ${!n.read ? "bg-foreground/5" : "bg-transparent"}`}
                        >
                            {!n.read && (
                                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                            )}
                            <p className="text-xs">{getMessage(n)}</p>
                            <p className="text-[10px] text-foreground/40 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-background border border-black/10 dark:border-neutral-800 rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-2">Clear Notifications</h2>
                <p className="text-sm text-foreground/70 mb-6">Which notifications would you like to clear?</p>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => clearNotifications("read")}
                        className="w-full py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded font-medium transition-colors"
                    >
                        Clear Read
                    </button>
                    <button 
                        onClick={() => clearNotifications("all")}
                        className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded font-medium transition-colors"
                    >
                        Clear All
                    </button>
                    <button 
                        onClick={() => setShowClearConfirm(false)}
                        className="w-full py-2 mt-2 text-foreground/60 hover:text-foreground rounded font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

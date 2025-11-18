"use client";

import React from "react";

export default function Avatar({
  name,
  email,
  image,
  size = 24,
  className = "",
}: {
  name?: string | null;
  email: string;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = React.useMemo(() => {
    const n = (name || email || "").trim();
    if (!n) return "?";
    if (n.includes("@")) {
      const local = n.split("@")[0];
      return local.slice(0, 2).toUpperCase();
    }
    const parts = n.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase();
  }, [name, email]);

  const bg = React.useMemo(() => {
    const palette = [
      "#2563eb", // blue-600
      "#16a34a", // green-600
      "#db2777", // pink-600
      "#f59e0b", // amber-500
      "#7c3aed", // violet-600
      "#ef4444", // red-500
      "#0ea5e9", // sky-500
      "#22c55e", // green-500
    ];
    const key = (email || name || "avatar");
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }, [email, name]);

  const style: React.CSSProperties = { width: size, height: size };

  if (image) {
    return (
      <img
        src={image}
        alt={name || email}
        className={`rounded-full object-cover ${className}`}
        style={style}
      />
    );
  }
  return (
    <span
      className={`rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white ${className}`}
      style={{ ...style, backgroundColor: bg }}
      title={name || email}
    >
      {initials}
    </span>
  );
}
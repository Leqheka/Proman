"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";

// --- Helper for cropping ---
const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  flip = { horizontal: false, vertical: false }
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  const { width: bBoxWidth, height: bBoxHeight } = { width: image.width, height: image.height };

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(data, 0, 0);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, "image/jpeg");
  });
}
// ---------------------------

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<{ id: string; email: string; username?: string | null; name?: string | null; image?: string | null } | null>(null);
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [backHref, setBackHref] = React.useState<string>("/");

  // Crop state
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/users/me");
        if (r.status === 401) {
          router.push("/login");
          return;
        }
        const j = await r.json();
        if (!alive) return;
        if (r.ok) {
          setUser(j);
          setName(j?.name || "");
          setUsername(j?.username || "");
          setEmail(j?.email || "");
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    try {
      const id = localStorage.getItem("lastBoardId");
      if (id) setBackHref(`/boards/${id}`);
    } catch {}
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username, email }) });
      if (r.status === 401) {
        router.push("/login");
        return;
      }
      const j = await r.json();
      if (!r.ok) setMsg(j?.error || "Failed"); else { setMsg("Saved"); setUser(j.user); }
    } catch { setMsg("Network error"); } finally { setBusy(false); }
  }

  async function uploadAvatar(blob: Blob) {
    if (!user?.id) return;
    setBusy(true);
    setMsg(null);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/users/${user.id}/image`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) setMsg(j?.error || "Upload failed"); else { setMsg("Profile picture updated"); setUser((u) => (u ? { ...u, image: j.image } : u)); }
    } catch { setMsg("Network error"); } finally { setBusy(false); setImageSrc(null); }
  }

  const onCropComplete = React.useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      });
      reader.readAsDataURL(file);
      // Reset input value so same file can be selected again
      e.target.value = "";
    }
  };

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImage) {
        await uploadAvatar(croppedImage);
      }
    } catch (e) {
      console.error(e);
      setMsg("Failed to crop image");
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-5xl px-6 pt-6 flex items-center justify-between">
        <span />
        <a href={backHref} className="text-xs rounded px-2 py-1 bg-foreground text-background">Back to board</a>
      </div>
      <div className="w-full max-w-sm mx-auto mt-4 rounded border border-black/10 dark:border-white/15 p-4 bg-background">
        <p className="text-lg font-semibold">Profile settings</p>
        <div className="mt-3 flex justify-center">
          <label className="group relative cursor-pointer">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={onFileChange} 
            />
            {user?.image ? (
              <img 
                src={user.image} 
                alt={user.name || user.email} 
                className="w-48 h-48 rounded-full object-cover border-4 border-background shadow-lg" 
              />
            ) : (
              <div className="w-48 h-48 rounded-full bg-foreground/20 flex items-center justify-center text-4xl border-4 border-background shadow-lg">
                {(user?.name || user?.email || "").slice(0,2).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-sm font-medium">Upload new</span>
            </div>
          </label>
        </div>
        <label className="text-xs mt-3 block">Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full text-sm px-2 py-1 border rounded bg-background" />
        <label className="text-xs mt-3 block">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full text-sm px-2 py-1 border rounded bg-background" />
        <label className="text-xs mt-3 block">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full text-sm px-2 py-1 border rounded bg-background" />
        {msg ? <p className="mt-2 text-xs">{msg}</p> : null}
        <button onClick={save} disabled={busy} className="mt-3 w-full text-xs rounded px-3 py-2 bg-foreground text-background">{busy ? "Saving..." : "Save"}</button>
      </div>

      {/* Cropper Modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-4 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Crop Profile Picture</h3>
            <div className="relative h-64 w-full overflow-hidden rounded bg-neutral-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
              />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <label className="text-xs">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setImageSrc(null)}
                className="rounded px-3 py-1 text-sm hover:bg-foreground/5"
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                disabled={busy}
                className="rounded bg-foreground px-3 py-1 text-sm text-background hover:bg-foreground/90"
              >
                {busy ? "Saving..." : "Save Picture"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

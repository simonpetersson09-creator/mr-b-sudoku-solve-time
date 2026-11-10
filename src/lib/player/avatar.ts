import { useEffect, useState } from "react";
import { getMe, setAvatar } from "@/lib/backend/online.functions";

// Own profile picture. The phone keeps the copy it shows (so the picture also
// works without internet), and the server keeps a backup copy for a new device.
const AVATAR_KEY = "mrb-sudoku:v1:avatar-image";
const SYNCED_KEY = "mrb-sudoku:v1:avatar-synced";
const CHANGED = "mrb-sudoku-avatar-changed";

/** Center-crop a picked photo to a small square JPEG, the same way Yatzy does. */
export async function fileToAvatarDataUrl(file: File, maxSize = 256): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const size = Math.min(maxSize, Math.min(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const side = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function fingerprint(s: string | null): string {
  if (!s) return "none";
  let h = 0;
  for (let i = 0; i < s.length; i += 7) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `${s.length}:${h}`;
}

/** The picture stored on this device, or null when only the emoji is used. */
export function getOwnAvatar(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(AVATAR_KEY); } catch { return null; }
}

/** Upload the own picture if it differs from the last one the server accepted. */
export async function syncOwnAvatar(): Promise<boolean> {
  const img = getOwnAvatar();
  const fp = fingerprint(img);
  try { if (localStorage.getItem(SYNCED_KEY) === fp) return true; } catch { /* offline cache only */ }
  try {
    await setAvatar({ data: { image: img } });
    try { localStorage.setItem(SYNCED_KEY, fp); } catch { /* optional shortcut */ }
    return true;
  } catch {
    return false; // kept on the phone; retried the next time a screen asks
  }
}

/**
 * A device that has never seen this player's picture takes the server copy
 * instead of pushing "nothing" and erasing it.
 */
export async function adoptOwnAvatarFromServer(): Promise<void> {
  if (getOwnAvatar()) return;
  try { if (localStorage.getItem(SYNCED_KEY) !== null) return; } catch { return; }
  const me = await getMe().catch(() => null);
  const img = me?.profile?.avatar_image ?? null;
  if (!img) return;
  try {
    localStorage.setItem(AVATAR_KEY, img);
    localStorage.setItem(SYNCED_KEY, fingerprint(img));
  } catch { /* storage full/blocked: the server copy still works */ }
  window.dispatchEvent(new Event(CHANGED));
}

/** Save on the phone at once, then let the server copy catch up in the background. */
export async function setOwnAvatar(image: string | null): Promise<boolean> {
  try {
    if (image) localStorage.setItem(AVATAR_KEY, image);
    else localStorage.removeItem(AVATAR_KEY);
    localStorage.removeItem(SYNCED_KEY);
  } catch { /* storage full/blocked */ }
  window.dispatchEvent(new Event(CHANGED));
  return syncOwnAvatar();
}

/** Own picture, re-rendered when it changes on this device. */
export function useOwnAvatar(): string | null {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    setImg(getOwnAvatar());
    const handler = () => setImg(getOwnAvatar());
    window.addEventListener(CHANGED, handler);
    return () => window.removeEventListener(CHANGED, handler);
  }, []);
  return img;
}

"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { Upload, Check, Loader2, X } from "lucide-react";

// Crop a source image to a square and export a resized JPEG blob (no server-side
// image library needed).
async function cropToJpeg(src: string, area: { x: number; y: number; width: number; height: number }, size = 256): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
}

export function AvatarUploader({ current, fullName }: { current: string | null; fullName: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(current);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result as string);
    reader.readAsDataURL(f);
  };

  const onCropComplete = useCallback((_: any, px: any) => setAreaPx(px), []);

  async function save() {
    if (!src || !areaPx) return;
    setBusy(true); setError(null);
    try {
      const blob = await cropToJpeg(src, areaPx);
      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/account/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "تعذّر الرفع");
      setPreview(json.url);
      setSrc(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "تعذّر الرفع");
    } finally {
      setBusy(false);
    }
  }

  const initials = fullName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-2xl font-semibold text-brand">{initials}</span>
        )}
        <div>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost flex items-center gap-1.5">
            <Upload size={15} /> اختر صورة
          </button>
          <p className="mt-1 text-[11px] text-gray-400">JPG/PNG حتى 2 ميغابايت. يمكنك اقتصاص الصورة.</p>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
      </div>

      {error && <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {src && (
        <div className="mt-4">
          <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gray-900">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
            <button onClick={save} disabled={busy} className="btn-primary flex items-center gap-1.5">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} حفظ الصورة
            </button>
            <button onClick={() => setSrc(null)} className="btn-ghost flex items-center gap-1"><X size={15} /> إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Eye, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { requestDeletion } from "@/app/actions/deletion";

export function RowActions({
  entityType,
  entityId,
  label,
  sublabel,
  viewHref,
  editHref,
  pending,
}: {
  entityType: string;
  entityId: string;
  label: string;
  sublabel?: string;
  viewHref?: string;
  editHref?: string;
  pending: boolean;
}) {
  const router = useRouter();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menu = pos !== null;

  const MENU_W = 176;
  function toggle() {
    if (menu) { setPos(null); return; }
    const r = btnRef.current!.getBoundingClientRect();
    // Open below the button; keep the menu fully on-screen (RTL-friendly).
    const left = Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8);
    setPos({ top: r.bottom + 4, left });
  }

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setPos(null);
    };
    const dismiss = () => setPos(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [menu]);

  const item = "flex w-full items-center gap-2 px-3 py-2 text-right text-sm hover:bg-gray-50";

  return (
    <div className="flex justify-center">
      <button
        ref={btnRef}
        onClick={toggle}
        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        title="إجراءات"
      >
        <MoreVertical size={16} />
      </button>

      {menu && (
        <div
          ref={menuRef}
          dir="rtl"
          className="fixed z-50 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-pop"
          style={{ top: pos!.top, left: pos!.left }}
        >
          {viewHref && (
            <Link href={viewHref} className={`${item} text-gray-700`} onClick={() => setPos(null)}>
              <Eye size={15} className="text-gray-400" /> عرض
            </Link>
          )}
          {editHref && (
            <Link href={editHref} className={`${item} text-gray-700`} onClick={() => setPos(null)}>
              <Pencil size={15} className="text-gray-400" /> تعديل
            </Link>
          )}
          <button
            disabled={pending}
            onClick={() => { setPos(null); setModal(true); setError(null); }}
            className={`${item} text-red-600 disabled:cursor-not-allowed disabled:text-gray-300`}
          >
            <Trash2 size={15} /> {pending ? "طلب حذف قائم" : "حذف"}
          </button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget && !busy) setModal(false); }}>
          <div className="w-full max-w-md rounded-lg bg-white shadow-pop" dir="rtl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-700"><AlertTriangle size={16} /> طلب حذف: {label}</h3>
              <button onClick={() => setModal(false)} disabled={busy} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError(null);
                const fd = new FormData(e.currentTarget as HTMLFormElement);
                fd.set("entityType", entityType);
                fd.set("entityId", entityId);
                fd.set("label", label);
                if (sublabel) fd.set("sublabel", sublabel);
                const r = await requestDeletion(fd);
                setBusy(false);
                if (r?.ok) { setModal(false); router.refresh(); }
                else setError(r?.error ?? "تعذّر إرسال الطلب");
              }}
              className="space-y-3 p-4"
            >
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                لن يُحذف العنصر مباشرةً. يتطلب الحذف موافقة <b>مسؤول المرحلة</b> ثم <b>مدير المشروع</b>.
              </p>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">سبب الحذف (إلزامي)</label>
                <textarea name="reason" required rows={3} className="field w-full" placeholder="اذكر سبب طلب حذف هذا الموقع…" />
              </div>
              {error && <div className="rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModal(false)} disabled={busy} className="btn-ghost">إلغاء</button>
                <button type="submit" disabled={busy} className="rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                  {busy ? "جارٍ الإرسال…" : "إرسال طلب الحذف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

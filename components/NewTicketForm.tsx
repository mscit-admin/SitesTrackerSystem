"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createTicket } from "@/app/maintenance/actions";

export function NewTicketForm({
  sites,
}: {
  sites: { id: string; siteId: string; name: string | null }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  const inputCls = "field w-full";

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setPending(true);
        await createTicket(fd);
        formRef.current?.reset();
        setPending(false);
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs text-slate-500">الموقع</label>
        <select name="siteId" required className={inputCls} defaultValue="">
          <option value="" disabled>اختر الموقع…</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.siteId} — {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs text-slate-500">عنوان البلاغ</label>
        <input name="title" required placeholder="مثال: انقطاع الكهرباء عن الموقع" className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">التصنيف</label>
        <select name="category" className={inputCls} defaultValue="Power">
          <option value="Power">الكهرباء</option>
          <option value="Fiber">الفايبر</option>
          <option value="RF">الراديو (RF)</option>
          <option value="MW">الميكروويف</option>
          <option value="Civil">مدني</option>
          <option value="Security">الأمن</option>
          <option value="Other">أخرى</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">الأولوية</label>
        <select name="priority" className={inputCls} defaultValue="MEDIUM">
          <option value="CRITICAL">حرجة</option>
          <option value="HIGH">عالية</option>
          <option value="MEDIUM">متوسطة</option>
          <option value="LOW">منخفضة</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs text-slate-500">الوصف (اختياري)</label>
        <textarea name="description" rows={2} className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">المُبلِّغ (اختياري)</label>
        <input name="reportedBy" className={inputCls} />
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={pending} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> {pending ? "جارٍ الحفظ…" : "تسجيل البلاغ"}
        </button>
      </div>
    </form>
  );
}

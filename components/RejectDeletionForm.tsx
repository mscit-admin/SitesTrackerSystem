"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { rejectDeletion } from "@/app/sites/actions";

export function RejectDeletionForm({ id, stage }: { id: string; stage: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost flex items-center gap-1 text-red-600">
        <X size={14} /> رفض
      </button>
    );
  }

  return (
    <form action={rejectDeletion} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stage" value={stage} />
      <input name="reason" placeholder="سبب الرفض (اختياري)" className="field py-1.5 text-xs" />
      <button type="submit" className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">تأكيد الرفض</button>
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">إلغاء</button>
    </form>
  );
}

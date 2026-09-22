"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Item = { id: string; name: string };
type AddAction = (fd: FormData) => Promise<{ ok: boolean; error?: string } | void>;
type RemoveAction = (fd: FormData) => Promise<any>;

export function CatalogManager({
  title,
  hint,
  placeholder,
  items,
  addAction,
  removeAction,
}: {
  title: string;
  hint?: string;
  placeholder: string;
  items: Item[];
  addAction: AddAction;
  removeAction: RemoveAction;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card p-5">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}

      <form
        ref={formRef}
        action={async (fd) => {
          setError(null);
          const r = await addAction(fd);
          if (r && !r.ok) setError(r.error ?? "تعذّر الإضافة");
          else formRef.current?.reset();
        }}
        className="mt-4 flex gap-2"
      >
        <input name="name" required placeholder={placeholder} className="field flex-1" />
        <button type="submit" className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> إضافة
        </button>
      </form>
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}

      <ul className="mt-4 divide-y divide-gray-100">
        {items.length === 0 && <li className="py-3 text-sm text-gray-400">لا توجد عناصر بعد.</li>}
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-800">{it.name}</span>
            <form action={removeAction}>
              <input type="hidden" name="id" value={it.id} />
              <button type="submit" className="text-gray-400 hover:text-red-600" title="حذف">
                <Trash2 size={15} />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

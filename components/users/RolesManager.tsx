"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Save, Check, ShieldCheck, X, AlertTriangle } from "lucide-react";
import { PERMISSION_CATALOG } from "@/lib/permissions";
import { createRole, saveRolePermissions, deleteRole } from "@/app/users/actions";

type Role = {
  id: string; name: string; description: string | null;
  isAdmin: boolean; isSystem: boolean; userCount: number; permissions: string[];
};

export function RolesManager({
  roles, canCreate, canEdit, canDelete,
}: {
  roles: Role[]; canCreate: boolean; canEdit: boolean; canDelete: boolean;
}) {
  const [selId, setSelId] = useState<string>(roles[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const selected = roles.find((r) => r.id === selId) ?? roles[0];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      {/* roles list */}
      <div className="card h-fit overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 p-3">
          <h2 className="text-sm font-semibold text-gray-800">الأدوار</h2>
          {canCreate && (
            <button onClick={() => setCreating(true)} className="rounded p-1 text-brand hover:bg-brand/10" title="دور جديد">
              <Plus size={16} />
            </button>
          )}
        </div>
        <ul className="divide-y divide-gray-100">
          {roles.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setSelId(r.id)}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-right text-[13px] hover:bg-gray-50 ${r.id === selId ? "bg-brand/5 font-semibold text-brand" : "text-gray-700"}`}
              >
                <span className="flex items-center gap-1.5">
                  {r.isAdmin && <ShieldCheck size={14} className="text-emerald-600" />}
                  {r.name}
                </span>
                <span className="text-[11px] text-gray-400">{r.userCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* matrix */}
      {selected && (
        <RoleMatrix key={selected.id} role={selected} canEdit={canEdit} canDelete={canDelete} />
      )}

      {creating && <CreateRoleModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function RoleMatrix({ role, canEdit, canDelete }: { role: Role; canEdit: boolean; canDelete: boolean }) {
  const [sel, setSel] = useState<Set<string>>(new Set(role.permissions));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = canEdit && !role.isAdmin;

  const total = useMemo(() => PERMISSION_CATALOG.reduce((n, m) => n + m.groups.reduce((k, g) => k + g.actions.length, 0), 0), []);

  const toggle = (key: string) => {
    if (!editable) return;
    setSel((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const toggleGroup = (keys: string[], on: boolean) => {
    if (!editable) return;
    setSel((prev) => { const n = new Set(prev); keys.forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            {role.isAdmin && <ShieldCheck size={16} className="text-emerald-600" />} {role.name}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {role.isAdmin ? "يملك كل الصلاحيات تلقائياً — غير قابل للتعديل" : `${sel.size} / ${total} صلاحية`}
            {role.description ? ` — ${role.description}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && !role.isSystem && !role.isAdmin && (
            <form action={async (fd) => { await deleteRole(fd); }}>
              <input type="hidden" name="id" value={role.id} />
              <button className="btn-ghost flex items-center gap-1.5 text-red-600" title="حذف الدور">
                <Trash2 size={15} /> حذف
              </button>
            </form>
          )}
        </div>
      </div>

      {role.isAdmin ? (
        <div className="p-6 text-center text-sm text-gray-500">
          هذا دور المدير: كل الصلاحيات ممنوحة تلقائياً.
        </div>
      ) : (
        <form
          action={async (fd) => {
            setError(null); setSaved(false);
            const res = await saveRolePermissions(fd);
            if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
            else setError(res.error ?? "تعذّر الحفظ");
          }}
        >
          <input type="hidden" name="id" value={role.id} />
          {[...sel].map((k) => <input key={k} type="hidden" name="perm" value={k} />)}

          {error && <div className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertTriangle size={15} /> {error}</div>}

          <div className="max-h-[62vh] space-y-4 overflow-y-auto scroll-slim p-4">
            {PERMISSION_CATALOG.map((m) => (
              <div key={m.id} className="rounded-lg border border-gray-100">
                <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-800">{m.label}</div>
                <div className="divide-y divide-gray-50">
                  {m.groups.map((g) => {
                    const keys = g.actions.map((a) => a.key);
                    const allOn = keys.every((k) => sel.has(k));
                    return (
                      <div key={g.id} className="p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">{g.label}</span>
                          {editable && (
                            <button type="button" onClick={() => toggleGroup(keys, !allOn)} className="text-[11px] text-brand hover:underline">
                              {allOn ? "إلغاء الكل" : "تحديد الكل"}
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {g.actions.map((a) => {
                            const on = sel.has(a.key);
                            return (
                              <button
                                type="button"
                                key={a.key}
                                onClick={() => toggle(a.key)}
                                disabled={!editable}
                                className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition ${
                                  on ? "border-brand bg-brand/10 text-brand" : "border-gray-200 bg-white text-gray-500"
                                } ${editable ? "hover:border-brand/60" : "cursor-default opacity-90"}`}
                              >
                                <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${on ? "border-brand bg-brand text-white" : "border-gray-300"}`}>
                                  {on && <Check size={10} />}
                                </span>
                                {a.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {editable && (
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 p-4">
              {saved && <span className="chip bg-emerald-50 text-emerald-700 border-emerald-100"><Check size={13} /> تم الحفظ</span>}
              <button type="submit" className="btn-primary flex items-center gap-1.5"><Save size={16} /> حفظ الصلاحيات</button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

function CreateRoleModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-lg bg-white shadow-pop" dir="rtl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">دور جديد</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <form
          action={async (fd) => { setError(null); const r = await createRole(fd); if (r.ok) onClose(); else setError(r.error ?? "تعذّر"); }}
          className="space-y-3 p-4"
        >
          {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">اسم الدور *</label>
            <input name="name" required className="field w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">الوصف</label>
            <input name="description" className="field w-full" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">إلغاء</button>
            <button type="submit" className="btn-primary">إنشاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

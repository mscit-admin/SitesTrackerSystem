"use client";

import { useState } from "react";
import { UserPlus, Pencil, KeyRound, Power, ShieldCheck, X, Check, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { createUser, updateUser, setUserActive, resetUserPassword, disableUser2fa } from "@/app/users/actions";

const todayStr = () => new Date().toISOString().slice(0, 10);
function expired(to: string) { return !!to && to < todayStr(); }
function expiringSoon(to: string) {
  if (!to) return false;
  const days = (new Date(to + "T23:59:59").getTime() - Date.now()) / 86400000;
  return days >= 0 && days <= 7;
}

type Role = { id: string; name: string };
type Row = {
  id: string; firstName: string; lastName: string; employeeId: string; email: string;
  mobile: string | null; avatarUrl: string | null; roleId: string | null; roleName: string | null;
  isActive: boolean; twoFactorEnabled: boolean; validFrom: string; validTo: string;
};

export function UsersManager({
  users, roles, meId, canCreate, canEdit, canDeactivate, canReset,
}: {
  users: Row[]; roles: Role[]; meId: string;
  canCreate: boolean; canEdit: boolean; canDeactivate: boolean; canReset: boolean;
}) {
  const [form, setForm] = useState<null | { mode: "create" } | { mode: "edit"; row: Row }>(null);
  const [resetFor, setResetFor] = useState<Row | null>(null);

  return (
    <div>
      {canCreate && (
        <div className="mb-4">
          <button onClick={() => setForm({ mode: "create" })} className="btn-primary flex items-center gap-1.5">
            <UserPlus size={16} /> مستخدم جديد
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">المستخدم</th>
                <th className="th">الرقم الوظيفي</th>
                <th className="th">البريد</th>
                <th className="th">الجوال</th>
                <th className="th">الدور</th>
                <th className="th">مدة الصلاحية</th>
                <th className="th">2FA</th>
                <th className="th">الحالة</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                          {(u.firstName[0] ?? "") + (u.lastName[0] ?? "")}
                        </span>
                      )}
                      <span className="font-medium text-gray-800">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td className="td font-mono">{u.employeeId}</td>
                  <td className="td text-gray-500" dir="ltr">{u.email}</td>
                  <td className="td text-gray-500" dir="ltr">{u.mobile ?? "—"}</td>
                  <td className="td">{u.roleName ?? <span className="text-gray-400">—</span>}</td>
                  <td className="td text-xs text-gray-500" dir="ltr">
                    {u.validFrom || u.validTo ? (
                      <span className={expired(u.validTo) ? "text-red-600" : expiringSoon(u.validTo) ? "text-amber-600" : ""}>
                        {u.validFrom || "…"} ← {u.validTo || "…"}
                      </span>
                    ) : (
                      <span className="text-gray-400">دائم</span>
                    )}
                  </td>
                  <td className="td">
                    {u.twoFactorEnabled
                      ? <span className="chip bg-emerald-50 text-emerald-700 border-emerald-100">مفعّلة</span>
                      : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="td">
                    {u.isActive
                      ? <span className="chip bg-emerald-50 text-emerald-700 border-emerald-100">نشط</span>
                      : <span className="chip bg-gray-100 text-gray-500 border-gray-200">معطّل</span>}
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      {canEdit && (
                        <button title="تعديل" onClick={() => setForm({ mode: "edit", row: u })} className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                          <Pencil size={15} />
                        </button>
                      )}
                      {canReset && (
                        <button title="إعادة تعيين كلمة المرور" onClick={() => setResetFor(u)} className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                          <KeyRound size={15} />
                        </button>
                      )}
                      {canEdit && u.twoFactorEnabled && (
                        <form action={async (fd) => { await disableUser2fa(fd); }}>
                          <input type="hidden" name="id" value={u.id} />
                          <button title="تعطيل 2FA" className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-amber-700">
                            <ShieldCheck size={15} />
                          </button>
                        </form>
                      )}
                      {canDeactivate && u.id !== meId && (
                        <form action={async (fd) => { await setUserActive(fd); }}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="active" value={u.isActive ? "0" : "1"} />
                          <button title={u.isActive ? "تعطيل" : "تفعيل"} className={`rounded p-1 hover:bg-gray-100 ${u.isActive ? "text-red-500 hover:text-red-700" : "text-emerald-600"}`}>
                            <Power size={15} />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <UserModal
          roles={roles}
          initial={form.mode === "edit" ? form.row : null}
          onClose={() => setForm(null)}
        />
      )}
      {resetFor && <ResetModal row={resetFor} onClose={() => setResetFor(null)} />}
    </div>
  );
}

function UserModal({ roles, initial, onClose }: { roles: Role[]; initial: Row | null; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial;
  return (
    <Modal title={isEdit ? "تعديل مستخدم" : "مستخدم جديد"} onClose={onClose}>
      <form
        action={async (fd) => {
          setError(null);
          if (!isEdit && String(fd.get("password")) !== String(fd.get("confirm"))) {
            setError("كلمتا المرور غير متطابقتين");
            return;
          }
          const res = isEdit ? await updateUser(fd) : await createUser(fd);
          if (res.ok) onClose(); else setError(res.error ?? "تعذّر الحفظ");
        }}
        className="space-y-3"
      >
        {isEdit && <input type="hidden" name="id" value={initial!.id} />}
        {error && <div className="flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"><AlertTriangle size={15} /> {error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <F label="الاسم الأول *"><input name="firstName" required defaultValue={initial?.firstName} className="field w-full" /></F>
          <F label="اسم العائلة *"><input name="lastName" required defaultValue={initial?.lastName} className="field w-full" /></F>
          <F label="الرقم الوظيفي *"><input name="employeeId" required defaultValue={initial?.employeeId} className="field w-full" dir="ltr" /></F>
          <F label="رقم الجوال"><input name="mobile" defaultValue={initial?.mobile ?? ""} className="field w-full" dir="ltr" /></F>
          <F label="البريد الإلكتروني *"><input name="email" type="email" required defaultValue={initial?.email} className="field w-full" dir="ltr" /></F>
          <F label="الدور">
            <select name="roleId" defaultValue={initial?.roleId ?? ""} className="field w-full">
              <option value="">— بدون دور —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </F>
          <F label="صلاحية الحساب من">
            <input name="validFrom" type="date" defaultValue={initial?.validFrom ?? ""} className="field w-full" dir="ltr" />
          </F>
          <F label="صلاحية الحساب إلى">
            <input name="validTo" type="date" defaultValue={initial?.validTo ?? ""} className="field w-full" dir="ltr" />
            <p className="mt-1 text-[11px] text-gray-400">يُعطَّل الحساب تلقائياً بعد هذا التاريخ. اتركه فارغاً لحساب دائم.</p>
          </F>
          {!isEdit && (
            <>
              <F label="كلمة المرور المبدئية *">
                <PasswordField name="password" placeholder="8 أحرف على الأقل" />
              </F>
              <F label="تأكيد كلمة المرور *">
                <PasswordField name="confirm" placeholder="أعد كتابة كلمة المرور" />
              </F>
              <p className="col-span-2 -mt-1 text-[11px] text-gray-400">
                يجب أن تحتوي على حرف ورقم (8 أحرف على الأقل). سيُطلب من المستخدم تغييرها عند أول دخول.
              </p>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">إلغاء</button>
          <button type="submit" className="btn-primary flex items-center gap-1.5"><Check size={15} /> حفظ</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title={`إعادة تعيين كلمة مرور: ${row.firstName} ${row.lastName}`} onClose={onClose}>
      <form
        action={async (fd) => {
          setError(null);
          if (String(fd.get("password")) !== String(fd.get("confirm"))) {
            setError("كلمتا المرور غير متطابقتين");
            return;
          }
          const res = await resetUserPassword(fd);
          if (res.ok) onClose(); else setError(res.error ?? "تعذّر");
        }}
        className="space-y-3"
      >
        <input type="hidden" name="id" value={row.id} />
        {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">كلمة المرور الجديدة *</label>
          <PasswordField name="password" placeholder="8 أحرف على الأقل" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">تأكيد كلمة المرور *</label>
          <PasswordField name="confirm" placeholder="أعد كتابة كلمة المرور" />
        </div>
        <p className="text-[11px] text-gray-400">سيُطلب من المستخدم تغييرها عند الدخول، وستُنهى جلساته الحالية.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">إلغاء</button>
          <button type="submit" className="btn-primary">حفظ</button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-lg bg-white shadow-pop" dir="rtl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

const F = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={full ? "col-span-2" : ""}>
    <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
    {children}
  </div>
);

// Masked password input with a show/hide eye toggle.
function PasswordField({ name, placeholder }: { name: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder={placeholder}
        className="field w-full pl-9"
        dir="ltr"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className="absolute inset-y-0 left-2 flex items-center text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

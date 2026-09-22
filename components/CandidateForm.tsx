"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { TOWER_OWNERS } from "@/lib/acquisition";
import { addCandidate } from "@/app/acquisition/actions";

export function CandidateForm({ nominalPointId }: { nominalPointId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [owner, setOwner] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setPending(true);
        await addCandidate(fd);
        formRef.current?.reset();
        setOwner("");
        setPending(false);
      }}
      className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-3"
    >
      <input type="hidden" name="nominalPointId" value={nominalPointId} />

      <Field label="اسم المرشّح / الموقع">
        <input name="name" className="field w-full" />
      </Field>
      <Field label="خط العرض">
        <input name="latitude" type="number" step="any" className="field w-full" />
      </Field>
      <Field label="خط الطول">
        <input name="longitude" type="number" step="any" className="field w-full" />
      </Field>

      <Field label="القرب من النقطة (كم)">
        <input name="proximityKm" type="number" step="any" className="field w-full" />
      </Field>
      <Field label="توفّر الفايبر">
        <select name="fiberAvailable" className="field w-full" defaultValue="">
          <option value="">—</option>
          <option value="Yes">متوفّر</option>
          <option value="Partial">جزئي</option>
          <option value="No">غير متوفّر</option>
        </select>
      </Field>
      <Field label="سهولة الإجراءات">
        <select name="easeOfProcedures" className="field w-full" defaultValue="">
          <option value="">—</option>
          <option value="High">سهلة</option>
          <option value="Medium">متوسطة</option>
          <option value="Low">صعبة</option>
        </select>
      </Field>

      <Field label="مالك البرج">
        <select
          name="towerOwner"
          className="field w-full"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          <option value="">—</option>
          {TOWER_OWNERS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      {owner === "Other" ? (
        <Field label="تفاصيل المالك (إلزامي)">
          <input name="towerOwnerDetail" required className="field w-full" />
        </Field>
      ) : (
        <div className="hidden md:block" />
      )}
      <Field label="العنوان">
        <input name="address" className="field w-full" />
      </Field>

      <Field label="شخص التواصل">
        <input name="contactPerson" className="field w-full" />
      </Field>
      <Field label="رقم التواصل">
        <input name="contactPhone" className="field w-full" />
      </Field>
      <div className="flex items-end">
        <button type="submit" disabled={pending} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> {pending ? "جارٍ الإضافة…" : "إضافة مرشّح"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Plus, Save } from "lucide-react";
import { TOWER_OWNERS } from "@/lib/acquisition";
import { addCandidate, updateCandidate } from "@/app/acquisition/actions";
import { MapButton } from "@/components/MapButton";

type CandDefaults = {
  id: string;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  proximityKm: number | null;
  fiberAvailable: string | null;
  easeOfProcedures: string | null;
  towerOwner: string | null;
  towerOwnerDetail: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  address: string | null;
};

export function CandidateForm({
  nominalPointId,
  candidate,
  onDone,
}: {
  nominalPointId?: string;
  candidate?: CandDefaults; // present => edit mode
  onDone?: () => void;
}) {
  const isEdit = !!candidate;
  const formRef = useRef<HTMLFormElement>(null);
  const [owner, setOwner] = useState(candidate?.towerOwner ?? "");
  const [pending, setPending] = useState(false);
  const v = (x: any) => (x == null ? "" : String(x));

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setPending(true);
        if (isEdit) await updateCandidate(fd);
        else await addCandidate(fd);
        if (isEdit) onDone?.();
        else {
          formRef.current?.reset();
          setOwner("");
        }
        setPending(false);
      }}
      className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-3"
    >
      {isEdit ? (
        <input type="hidden" name="candidateId" value={candidate!.id} />
      ) : (
        <input type="hidden" name="nominalPointId" value={nominalPointId} />
      )}

      <Field label="اسم المرشّح / الموقع">
        <input name="name" defaultValue={v(candidate?.name)} className="field w-full" />
      </Field>
      <Field label="خط العرض">
        <input name="latitude" type="number" step="any" defaultValue={v(candidate?.latitude)} className="field w-full" />
      </Field>
      <Field label="خط الطول">
        <input name="longitude" type="number" step="any" defaultValue={v(candidate?.longitude)} className="field w-full" />
      </Field>
      <div className="flex items-end">
        <MapButton latName="latitude" lngName="longitude" />
      </div>

      <Field label="القرب من النقطة (كم)">
        <input name="proximityKm" type="number" step="any" defaultValue={v(candidate?.proximityKm)} className="field w-full" />
      </Field>
      <Field label="توفّر الفايبر">
        <select name="fiberAvailable" className="field w-full" defaultValue={v(candidate?.fiberAvailable)}>
          <option value="">—</option>
          <option value="Yes">متوفّر</option>
          <option value="Partial">جزئي</option>
          <option value="No">غير متوفّر</option>
        </select>
      </Field>
      <Field label="سهولة الإجراءات">
        <select name="easeOfProcedures" className="field w-full" defaultValue={v(candidate?.easeOfProcedures)}>
          <option value="">—</option>
          <option value="High">سهلة</option>
          <option value="Medium">متوسطة</option>
          <option value="Low">صعبة</option>
        </select>
      </Field>

      <Field label="مالك البرج">
        <select name="towerOwner" className="field w-full" value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">—</option>
          {TOWER_OWNERS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      {owner === "Other" ? (
        <Field label="تفاصيل المالك (إلزامي)">
          <input name="towerOwnerDetail" required defaultValue={v(candidate?.towerOwnerDetail)} className="field w-full" />
        </Field>
      ) : (
        <div className="hidden md:block" />
      )}
      <Field label="العنوان">
        <input name="address" defaultValue={v(candidate?.address)} className="field w-full" />
      </Field>

      <Field label="شخص التواصل">
        <input name="contactPerson" defaultValue={v(candidate?.contactPerson)} className="field w-full" />
      </Field>
      <Field label="رقم التواصل">
        <input name="contactPhone" defaultValue={v(candidate?.contactPhone)} className="field w-full" />
      </Field>
      <div className="flex items-end gap-2">
        <button type="submit" disabled={pending} className="btn-primary flex items-center gap-1.5">
          {isEdit ? <Save size={16} /> : <Plus size={16} />}
          {pending ? "جارٍ الحفظ…" : isEdit ? "حفظ التعديلات" : "إضافة مرشّح"}
        </button>
        {isEdit && (
          <button type="button" onClick={onDone} className="btn-ghost">إلغاء</button>
        )}
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

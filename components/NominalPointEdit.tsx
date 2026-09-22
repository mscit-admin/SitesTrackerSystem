"use client";

import { useState } from "react";
import { Pencil, Save } from "lucide-react";
import { MapButton } from "@/components/MapButton";
import { RegionDetect } from "@/components/RegionDetect";
import { updateNominalPoint } from "@/app/acquisition/actions";

const REGIONS = ["Middle Area", "Tripoli Area", "Zawia Area", "WM Area"];

export function NominalPointEdit({
  np,
}: {
  np: { id: string; ref: string; name: string | null; latitude: number | null; longitude: number | null; region: string | null; notes: string | null };
}) {
  const [open, setOpen] = useState(false);
  const v = (x: any) => (x == null ? "" : String(x));

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost flex items-center gap-1.5">
        <Pencil size={15} /> تعديل بيانات النقطة
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await updateNominalPoint(fd);
        setOpen(false);
      }}
      className="card w-full p-5"
    >
      <input type="hidden" name="id" value={np.id} />
      <div className="mb-3 text-sm font-semibold text-gray-800">تعديل النقطة الاسمية ({np.ref})</div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2">
        <L label="اسم النقطة"><input name="name" defaultValue={v(np.name)} className="field w-full" /></L>
        <L label="المنطقة">
          <select name="region" defaultValue={v(np.region)} className="field w-full">
            <option value="">—</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </L>
        <L label="خط العرض"><input name="latitude" type="number" step="any" defaultValue={v(np.latitude)} className="field w-full" /></L>
        <L label="خط الطول"><input name="longitude" type="number" step="any" defaultValue={v(np.longitude)} className="field w-full" /></L>
        <div className="flex items-end"><MapButton latName="latitude" lngName="longitude" /></div>
        <div className="md:col-span-2">
          <RegionDetect latName="latitude" lngName="longitude" regionName="region" subRegionName="__noSubRegion" />
        </div>
        <L label="ملاحظات"><input name="notes" defaultValue={v(np.notes)} className="field w-full" /></L>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn-primary flex items-center gap-1.5"><Save size={16} /> حفظ التعديلات</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">إلغاء</button>
      </div>
    </form>
  );
}

const L = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
    {children}
  </div>
);

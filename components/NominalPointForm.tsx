"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { createNominalPoint } from "@/app/acquisition/actions";
import { MapButton } from "@/components/MapButton";
import { RegionDetect } from "@/components/RegionDetect";

const REGIONS = ["Middle Area", "Tripoli Area", "Zawia Area", "WM Area"];

export function NominalPointForm() {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      action={async (fd) => {
        setError(null);
        const r = await createNominalPoint(fd);
        if (r && !r.ok) setError(r.error ?? "تعذّر الإنشاء");
      }}
      className="card max-w-2xl p-5"
    >
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2">
        <L label="المرجع / الكود *">
          <input name="ref" required placeholder="مثال: NP-TR-014" className="field w-full" />
        </L>
        <L label="اسم النقطة">
          <input name="name" className="field w-full" />
        </L>
        <L label="خط العرض (Latitude)">
          <input name="latitude" type="number" step="any" className="field w-full" />
        </L>
        <L label="خط الطول (Longitude)">
          <input name="longitude" type="number" step="any" className="field w-full" />
        </L>
        <div className="flex items-end md:col-span-2">
          <MapButton latName="latitude" lngName="longitude" />
        </div>
        <div className="md:col-span-2">
          <RegionDetect latName="latitude" lngName="longitude" regionName="region" subRegionName="__noSubRegion" />
        </div>
        <L label="المنطقة">
          <select name="region" className="field w-full" defaultValue="">
            <option value="">—</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </L>
        <L label="ملاحظات">
          <input name="notes" className="field w-full" />
        </L>
      </div>
      <div className="mt-5">
        <button type="submit" className="btn-primary flex items-center gap-1.5">
          <MapPin size={16} /> إنشاء النقطة الاسمية
        </button>
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

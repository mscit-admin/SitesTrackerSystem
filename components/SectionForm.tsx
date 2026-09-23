"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Save, Check, AlertTriangle } from "lucide-react";
import type { SectionDef } from "@/lib/formSchema";
import { saveSiteSection } from "@/app/sites/actions";
import { MapButton } from "@/components/MapButton";
import { RegionDetect } from "@/components/RegionDetect";
import { DraftAutosave } from "@/components/DraftAutosave";

type SaveResult = { ok: boolean; error?: string; ts?: number } | void;
type SaveAction = (fd: FormData) => Promise<SaveResult>;

function SubmitButton({ label }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary flex items-center gap-1.5">
      <Save size={16} /> {pending ? "جارٍ الحفظ…" : label ?? "حفظ"}
    </button>
  );
}

export function SectionForm({
  siteId,
  section,
  values,
  mode = "edit",
  action = saveSiteSection,
  submitLabel,
}: {
  siteId: string;
  section: SectionDef;
  values: Record<string, string>;
  mode?: "edit" | "create";
  action?: SaveAction;
  submitLabel?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftKey = `site:${siteId || "new"}:${section.id}`;

  return (
    <form
      action={async (fd) => {
        setSaved(false);
        setError(null);
        const res = await action(fd);
        if (res && !res.ok) {
          setError(res.error ?? "تعذّر الحفظ");
        } else if (res?.ok) {
          setSaved(true);
          // saved to DB → drop the local draft
          window.dispatchEvent(new CustomEvent("draft:clear", { detail: draftKey }));
          setTimeout(() => setSaved(false), 2500);
        }
      }}
      className="card p-5"
    >
      <input type="hidden" name="__siteId" value={siteId} />
      <input type="hidden" name="__sectionId" value={section.id} />
      <DraftAutosave storageKey={draftKey} />

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
          {section.hint && <p className="mt-0.5 text-xs text-gray-500">{section.hint}</p>}
        </div>
        {saved && (
          <span className="chip bg-emerald-50 text-emerald-700 border-emerald-100">
            <Check size={13} /> تم الحفظ
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2">
        {section.fields.map((f) => {
          const val = values[f.path] ?? "";
          const disabled = mode === "edit" && f.readOnlyOnEdit;
          if (f.type === "map") {
            return (
              <div key={f.path} className={f.col === 2 ? "md:col-span-2" : ""}>
                <MapButton latName={f.latName!} lngName={f.lngName!} />
              </div>
            );
          }
          if (f.type === "regiondetect") {
            return (
              <div key={f.path} className={f.col === 2 ? "md:col-span-2" : ""}>
                <RegionDetect
                  latName={f.latName!}
                  lngName={f.lngName!}
                  regionName={f.regionName!}
                  subRegionName={f.subRegionName!}
                />
              </div>
            );
          }
          return (
            <div key={f.path} className={f.col === 2 ? "md:col-span-2" : ""}>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {f.label}
                {f.keyField && <span className="text-red-500"> *</span>}
              </label>
              {f.type === "select" ? (
                <select
                  name={f.path}
                  defaultValue={val}
                  disabled={disabled}
                  className="field w-full disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">—</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea name={f.path} defaultValue={val} rows={2} className="field w-full" />
              ) : (
                <input
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  step={f.type === "number" ? "any" : undefined}
                  name={f.path}
                  defaultValue={val}
                  disabled={disabled}
                  required={f.keyField && mode === "create"}
                  className="field w-full disabled:bg-gray-100 disabled:text-gray-400"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        {mode === "edit" && (
          <a href={`/sites/${siteId}`} className="btn-ghost">عرض الموقع</a>
        )}
      </div>
    </form>
  );
}

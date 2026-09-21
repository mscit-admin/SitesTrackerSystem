"use client";

import { useState } from "react";
import { SECTIONS } from "@/lib/formSchema";
import { SectionForm } from "./SectionForm";

export function SiteEditor({
  siteId,
  values,
}: {
  siteId: string;
  values: Record<string, string>;
}) {
  const [active, setActive] = useState(SECTIONS[0].id);
  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
      <nav className="card h-max p-2 lg:sticky lg:top-[68px]">
        <div className="mb-1 px-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
          المراحل
        </div>
        <ul className="space-y-0.5">
          {SECTIONS.map((s, i) => {
            const isActive = s.id === active;
            return (
              <li key={s.id}>
                <button
                  onClick={() => setActive(s.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-right text-[13px] transition ${
                    isActive
                      ? "bg-brand-soft font-semibold text-brand-dark"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] ${
                      isActive ? "bg-brand text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <SectionForm key={active} siteId={siteId} section={section} values={values} mode="edit" />
    </div>
  );
}

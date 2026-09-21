import { PHASE_BY_CODE, STATUS_LABELS, MilestoneStatus } from "@/lib/lifecycle";
import { fmtDate, badge } from "@/lib/format";

interface M {
  phaseCode: string;
  phaseOrder: number;
  status: string;
  plannedDate: Date | null;
  actualDate: Date | null;
}

const DOT: Record<string, string> = {
  DONE: "bg-emerald-500 border-emerald-500",
  IN_PROGRESS: "bg-amber-400 border-amber-400",
  NOT_STARTED: "bg-white border-slate-300",
  NA: "bg-slate-200 border-slate-200",
  BLOCKED: "bg-red-500 border-red-500",
};

const LINE: Record<string, string> = {
  DONE: "bg-emerald-400",
  IN_PROGRESS: "bg-amber-300",
  NOT_STARTED: "bg-slate-200",
  NA: "bg-slate-200",
  BLOCKED: "bg-red-300",
};

export function LifecycleTimeline({ milestones }: { milestones: M[] }) {
  return (
    <ol className="relative">
      {milestones.map((m, i) => {
        const phase = PHASE_BY_CODE[m.phaseCode];
        const st = STATUS_LABELS[m.status as MilestoneStatus];
        const last = i === milestones.length - 1;
        return (
          <li key={m.phaseCode} className="relative flex gap-3 pb-5">
            {/* connector */}
            {!last && (
              <span
                className={`absolute top-5 h-full w-0.5 ${LINE[m.status] ?? "bg-slate-200"}`}
                style={{ insetInlineStart: "9px" }}
              />
            )}
            <span
              className={`z-10 mt-1 h-5 w-5 shrink-0 rounded-full border-2 ${DOT[m.status] ?? DOT.NOT_STARTED}`}
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-800">
                  <span className="ml-2 text-xs text-slate-400">{phase?.order}.</span>
                  {phase?.ar ?? m.phaseCode}
                  <span className="mr-2 text-xs font-normal text-slate-400">{phase?.en}</span>
                </div>
                <span className={`chip ${badge(m.status)}`}>{st.ar}</span>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-slate-500">
                {m.plannedDate && <span>مخطط: {fmtDate(m.plannedDate)}</span>}
                {m.actualDate && <span className="text-emerald-600">فعلي: {fmtDate(m.actualDate)}</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

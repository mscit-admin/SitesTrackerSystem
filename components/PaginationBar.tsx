"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "@/lib/queries";

export function PaginationBar({
  page,
  pageSize,
  total,
  totalPages,
  pageKey = "page",
  sizeKey = "size",
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pageKey?: string;
  sizeKey?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function go(next: Record<string, string | null>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">عدد الصفوف:</span>
        <select
          value={String(pageSize)}
          onChange={(e) => go({ [sizeKey]: e.target.value, [pageKey]: "1" })}
          className="field py-1.5"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          عرض {from}–{to} من {total}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => go({ [pageKey]: String(page - 1) })}
          disabled={page <= 1}
          className="btn-ghost flex items-center gap-1 disabled:opacity-40"
        >
          <ChevronRight size={15} /> السابق
        </button>
        <span className="px-2 text-xs tabular-nums text-gray-500">صفحة {page} من {totalPages}</span>
        <button
          onClick={() => go({ [pageKey]: String(page + 1) })}
          disabled={page >= totalPages}
          className="btn-ghost flex items-center gap-1 disabled:opacity-40"
        >
          التالي <ChevronLeft size={15} />
        </button>
      </div>
    </div>
  );
}

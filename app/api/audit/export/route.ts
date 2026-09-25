import { getCurrentUser, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { CATEGORY_AR, ACTION_AR, logAudit, AUDIT } from "@/lib/audit";
import { parseAuditFilter, auditWhere } from "@/lib/auditQuery";

export const runtime = "nodejs";

// GET /api/audit/export?category=&action=&actorId=&entity=&q=&from=&to=
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || !can(me, "audit.export")) return new Response("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const sp: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (sp[k] = v));
  const where = auditWhere(parseAuditFilter(sp));

  // Cap the export to a sane maximum.
  const logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 50000 });

  const rows: string[][] = [[
    "الوقت (UTC)", "الفئة", "الإجراء", "ناجح", "المستخدم", "البريد", "الدور",
    "العنصر", "المعرّف", "التسمية", "الوصف", "قبل", "بعد", "IP", "User-Agent",
  ]];
  for (const l of logs) {
    rows.push([
      l.createdAt.toISOString().slice(0, 19).replace("T", " "),
      CATEGORY_AR[l.category] ?? l.category,
      ACTION_AR[l.action] ?? l.action,
      l.success ? "نعم" : "لا",
      l.actorName ?? "",
      l.actorEmail ?? "",
      l.actorRole ?? "",
      l.entity ?? "",
      l.entityId ?? "",
      l.entityLabel ?? "",
      l.summary ?? "",
      l.before ?? "",
      l.after ?? "",
      l.ip ?? "",
      l.userAgent ?? "",
    ]);
  }

  // Exporting the audit trail is itself an audited event.
  await logAudit({ category: AUDIT.EXPORT_IMPORT, action: "EXPORT", actor: me,
    entity: "AuditLog", entityLabel: `${logs.length} سجل`,
    summary: `تصدير سجل التدقيق (${logs.length} سجل)` });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${stamp}.csv"`,
    },
  });
}

import { revalidatePath } from "next/cache";
import { getCurrentUser, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_MESSAGE_KEYS } from "@/lib/messages";
import { parseCsv } from "@/lib/csv";
import { logAudit, AUDIT } from "@/lib/audit";

export const runtime = "nodejs";

// POST /api/i18n/import  (multipart: code, file)
// Same logic as the importTranslations server action, but as a real upload
// endpoint so the browser can report upload progress via XHR.
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || !can(me, "localization.translate")) {
    return Response.json({ ok: false, error: "غير مصرّح" }, { status: 403 });
  }

  const form = await req.formData();
  const code = String(form.get("code") ?? "").trim();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ ok: false, error: "لم يتم اختيار ملف" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return Response.json({ ok: false, error: "حجم الملف كبير جداً (الحد الأقصى 8 ميجابايت)" }, { status: 400 });
  }

  const lang = await prisma.language.findUnique({ where: { code }, select: { code: true } });
  if (!lang) return Response.json({ ok: false, error: "اللغة غير موجودة" }, { status: 400 });

  const csv = await file.text();
  const rows = parseCsv(csv);
  if (rows.length === 0) return Response.json({ ok: false, error: "الملف فارغ" }, { status: 400 });

  const firstCell = (rows[0][0] ?? "").toLowerCase();
  const start = firstCell === "source" || firstCell === "key" ? 1 : 0;
  const known = new Set(ALL_MESSAGE_KEYS);

  let count = 0;
  const ops: any[] = [];
  for (let i = start; i < rows.length; i++) {
    const key = (rows[i][0] ?? "").trim();
    const value = (rows[i][rows[i].length - 1] ?? "").trim();
    if (!key || !known.has(key) || value === key || !value) continue;
    ops.push(
      prisma.translation.upsert({
        where: { languageCode_key: { languageCode: code, key } },
        update: { value },
        create: { languageCode: code, key, value },
      })
    );
    count++;
  }
  if (ops.length) await prisma.$transaction(ops);

  await logAudit({ category: AUDIT.EXPORT_IMPORT, action: "IMPORT", actor: me,
    entity: "Translation", entityId: code, entityLabel: (file as File).name || code,
    summary: `استيراد ترجمة للغة ${code}: ${count} نص`, after: { count } });

  revalidatePath("/settings/languages");
  revalidatePath("/", "layout");
  return Response.json({ ok: true, count });
}

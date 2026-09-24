import { getCurrentUser, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_MESSAGE_KEYS } from "@/lib/messages";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";

// GET /api/i18n/export?lang=fr
// CSV columns: source (Arabic) | <language name> (fill this column, then re-import).
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || !can(me, "localization.translate")) return new Response("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const code = (url.searchParams.get("lang") ?? "").trim();
  const lang = code ? await prisma.language.findUnique({ where: { code } }) : null;
  if (!lang) return new Response("Unknown language", { status: 400 });

  const existing = new Map(
    (await prisma.translation.findMany({ where: { languageCode: code }, select: { key: true, value: true } })).map((r) => [r.key, r.value])
  );

  const rows: string[][] = [["source", lang.name]];
  for (const key of ALL_MESSAGE_KEYS) rows.push([key, existing.get(key) ?? ""]);

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="translations-${code}.csv"`,
    },
  });
}

import { getCurrentUser, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MESSAGES, ALL_MESSAGE_KEYS } from "@/lib/messages";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";

// GET /api/i18n/export?lang=fr
// Returns a CSV with columns: key, source (Arabic), translation (existing, if any)
// — hand it to a translator, fill the 3rd column, then import it back.
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || !can(me, "localization.translate")) {
    return new Response("Forbidden", { status: 403 });
  }
  const url = new URL(req.url);
  const code = (url.searchParams.get("lang") ?? "").trim();
  const lang = code ? await prisma.language.findUnique({ where: { code } }) : null;
  if (!lang) return new Response("Unknown language", { status: 400 });

  const existing = new Map(
    (await prisma.translation.findMany({ where: { languageCode: code }, select: { key: true, value: true } }))
      .map((r) => [r.key, r.value])
  );

  const rows: string[][] = [["key", "source", lang.name]];
  for (const key of ALL_MESSAGE_KEYS) {
    rows.push([key, MESSAGES[key] ?? "", existing.get(key) ?? ""]);
  }

  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="translations-${code}.csv"`,
    },
  });
}

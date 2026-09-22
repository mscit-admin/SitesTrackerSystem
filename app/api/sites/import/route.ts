import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseMasterSites, buildSiteData } from "@/lib/importMaster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Streams newline-delimited JSON progress so the client can show a live
// percentage while each site is upserted.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: any) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        if (!(file instanceof File) || file.size === 0) {
          send({ type: "error", error: "لم يتم اختيار ملف." });
          return controller.close();
        }
        if (file.size > 15 * 1024 * 1024) {
          send({ type: "error", error: "حجم الملف كبير جداً (الحد الأقصى 15 ميجابايت)." });
          return controller.close();
        }

        let rows: any[];
        try {
          rows = parseMasterSites(await file.arrayBuffer());
        } catch (e: any) {
          send({ type: "error", error: e?.message || "تعذّر قراءة الملف. تأكّد أنه بصيغة GSDN Master." });
          return controller.close();
        }

        const total = rows.length;
        if (total === 0) {
          send({ type: "error", error: "لم يتم العثور على مواقع في الملف." });
          return controller.close();
        }

        send({ type: "start", total });
        let created = 0, updated = 0, failed = 0;
        const errors: string[] = [];

        for (let i = 0; i < total; i++) {
          const raw = rows[i];
          try {
            const { scalars, milestones } = buildSiteData(raw);
            const existing = await prisma.site.findUnique({ where: { siteId: raw.siteId }, select: { id: true } });
            if (existing) {
              await prisma.$transaction([
                prisma.site.update({ where: { id: existing.id }, data: scalars }),
                prisma.milestone.deleteMany({ where: { siteId: existing.id } }),
                prisma.milestone.createMany({ data: milestones.map((m) => ({ ...m, siteId: existing.id })) }),
              ]);
              updated++;
            } else {
              await prisma.site.create({ data: { siteId: raw.siteId, ...scalars, milestones: { create: milestones } } });
              created++;
            }
          } catch (e: any) {
            failed++;
            if (errors.length < 5) errors.push(`${raw.siteId}: ${e?.message ?? "خطأ"}`);
          }
          send({ type: "progress", done: i + 1, total, created, updated, failed });
        }

        revalidatePath("/sites");
        revalidatePath("/");
        send({ type: "result", total, created, updated, failed, errors });
      } catch (e: any) {
        send({ type: "error", error: e?.message || "خطأ غير متوقع أثناء المعالجة." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no", // disable nginx buffering so progress streams live
    },
  });
}

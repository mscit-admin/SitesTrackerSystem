import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

export async function POST(req: Request) {
  let me;
  try {
    me = await requireUser();
  } catch {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "لا يوجد ملف" }, { status: 400 });
  if (file.size > 2_000_000) return NextResponse.json({ error: "الحجم أكبر من 2 ميغابايت" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return NextResponse.json({ error: "نوع صورة غير مدعوم" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  await fs.mkdir(AVATAR_DIR, { recursive: true });
  const filename = `${me.id}.jpg`;
  await fs.writeFile(path.join(AVATAR_DIR, filename), buf);

  const url = `/uploads/avatars/${filename}?t=${Date.now()}`;
  await prisma.user.update({ where: { id: me.id }, data: { avatarUrl: url } });
  return NextResponse.json({ ok: true, url });
}

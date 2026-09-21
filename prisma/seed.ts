import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveLifecycle } from "../lib/lifecycle";

const prisma = new PrismaClient();

const toDate = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const asNum = (v: any): number | null =>
  typeof v === "number" && !isNaN(v) ? v : null;

async function main() {
  const dataDir = join(process.cwd(), "data");
  const sites: any[] = JSON.parse(readFileSync(join(dataDir, "sites.json"), "utf-8"));
  const risks: any[] = JSON.parse(readFileSync(join(dataDir, "risks.json"), "utf-8"));

  console.log(`Seeding ${sites.length} sites and ${risks.length} risks…`);

  // Clean slate (idempotent seed).
  await prisma.preventiveMaintenance.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.site.deleteMany();
  await prisma.risk.deleteMany();

  let handedOver = 0;
  let onair = 0;

  for (const s of sites) {
    const derived = deriveLifecycle(s);
    if (derived.isHandedOver) handedOver++;
    if (derived.isOnair) onair++;

    const site = await prisma.site.create({
      data: {
        seq: asNum(s.seq),
        siteId: s.siteId,
        name: s.name ?? null,
        towerOwner: s.towerOwner ?? null,
        ownerSiteId: s.ownerSiteId ? String(s.ownerSiteId) : null,
        latitude: asNum(s.latitude),
        longitude: asNum(s.longitude),
        existingOrNew: s.existingOrNew ?? null,
        rtOrGf: s.rtOrGf ?? null,
        towerType: s.towerType ?? null,
        towerHeight: asNum(s.towerHeight),
        busbarHeight: asNum(s.busbarHeight),
        subRegion: s.subRegion ?? null,
        region: s.region ?? null,
        scenario: s.scenario ?? null,
        siteType: s.siteType ? String(s.siteType).trim() : null,
        uplinkSite: s.uplinkSite ?? null,
        backupSite: s.backupSite ?? null,
        belongToFN: s.belongToFN ?? null,
        primaryMFN: s.primaryMFN ?? null,
        secondaryMFN: s.secondaryMFN ?? null,
        cabinetFoundationType: s.cabinetFoundationType ?? null,
        cabinetFoundationDims: s.cabinetFoundationDims ? String(s.cabinetFoundationDims) : null,
        deliveryBatch: s.deliveryBatch ?? null,
        sowTowerErection: s.sow?.towerErection != null ? String(s.sow.towerErection) : null,
        sowSiteAdaption: s.sow?.siteAdaption != null ? String(s.sow.siteAdaption) : null,
        sowGecolRequired: s.sow?.gecolRequired != null ? String(s.sow.gecolRequired) : null,
        sowHlcRequired: s.sow?.hlcRequired != null ? String(s.sow.hlcRequired) : null,
        currentPhase: derived.currentPhase,
        progressPct: derived.progressPct,
        isOnair: derived.isOnair,
        isHandedOver: derived.isHandedOver,
        overallStatus: derived.overallStatus,
        rfSurveyDate: toDate(derived.keyDates.rfSurveyDate),
        prDate: toDate(derived.keyDates.prDate),
        cwPacDate: toDate(derived.keyDates.cwPacDate),
        cwFacDate: toDate(derived.keyDates.cwFacDate),
        rfiDate: toDate(derived.keyDates.rfiDate),
        teInstallDate: toDate(derived.keyDates.teInstallDate),
        onairDate: toDate(derived.keyDates.onairDate),
        patDate: toDate(derived.keyDates.patDate),
        omHandoverDate: toDate(derived.keyDates.omHandoverDate),
        phaseData: JSON.stringify({
          design: s.design, procurement: s.procurement, preCw: s.preCw,
          towerErection: s.towerErection, siteAdaption: s.siteAdaption,
          cwAcceptance: s.cwAcceptance, power: s.power, fiber: s.fiber,
          rfi: s.rfi, teInstallation: s.teInstallation, onair: s.onair,
          testing: s.testing, handover: s.handover, sow: s.sow,
        }),
        cwBoq: JSON.stringify(s.cwBoq ?? {}),
        teBoq: JSON.stringify(s.teBoq ?? {}),
        milestones: {
          create: derived.milestones.map((ms) => ({
            phaseCode: ms.phaseCode,
            phaseOrder: ms.phaseOrder,
            status: ms.status,
            plannedDate: toDate(ms.plannedDate),
            actualDate: toDate(ms.actualDate),
          })),
        },
      },
    });

    // Pending issue -> Issue row.
    if (s.issue?.pending) {
      await prisma.issue.create({
        data: {
          siteId: site.id,
          title: String(s.issue.pending),
          owner: s.issue.owner ? String(s.issue.owner) : null,
          remark: s.issue.remark ? String(s.issue.remark) : null,
          status: "OPEN",
        },
      });
    }

    // Seed a default preventive-maintenance schedule for handed-over sites,
    // so the O&M phase is populated from day one.
    if (derived.isHandedOver) {
      const base = toDate(derived.keyDates.omHandoverDate) ?? new Date();
      const plan: Array<[string, number]> = [
        ["الفحص الدوري الشامل (Quarterly Inspection)", 90],
        ["اختبار البطاريات (Battery Test)", 180],
        ["صيانة نظام الكهرباء والمولّد (Power/Generator Service)", 180],
        ["فحص نظام التأريض (Grounding Check)", 365],
      ];
      for (const [taskType, freq] of plan) {
        const next = new Date(base.getTime() + freq * 86400000);
        await prisma.preventiveMaintenance.create({
          data: {
            siteId: site.id,
            taskType,
            frequencyDays: freq,
            lastDoneAt: base,
            nextDueAt: next,
            status: next.getTime() < Date.now() ? "OVERDUE" : "SCHEDULED",
          },
        });
      }
    }
  }

  // Risks
  for (const r of risks) {
    await prisma.risk.create({
      data: {
        riskId: r.riskId,
        statement: r.statement ?? "",
        category: r.category ?? null,
        scope: r.scope ?? null,
        affectedSites: asNum(r.affectedSites),
        probability: asNum(r.probability),
        impact: asNum(r.impact),
        score: asNum(r.score),
        level: r.level ?? null,
        response: r.response ?? null,
        mitigation: r.mitigation ?? null,
        riskOwner: r.riskOwner ?? null,
        actionOwner: r.actionOwner ?? null,
        targetDate: toDate(r.targetDate),
        status: r.status ?? "Open",
        trend: r.trend ?? null,
        lastReviewDate: toDate(r.lastReview),
      },
    });
  }

  // Demo users (roles for the different teams). Auth is wired in a later phase.
  const users: Array<[string, string, string]> = [
    ["مدير المشروع", "admin@gsdn.ly", "ADMIN"],
    ["فريق التصميم والاستحواذ", "design@gsdn.ly", "DESIGN"],
    ["فريق الأعمال المدنية", "civil@gsdn.ly", "CIVIL"],
    ["فريق المعدات والتركيبات", "te@gsdn.ly", "TE"],
    ["فريق التشغيل والصيانة", "om@gsdn.ly", "OM"],
  ];
  for (const [name, email, role] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { name, role },
      create: { name, email, role },
    });
  }

  console.log(`Done. On-air: ${onair}, Handed over: ${handedOver}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

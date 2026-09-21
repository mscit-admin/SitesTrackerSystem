import { prisma } from "@/lib/prisma";
import { PHASES } from "@/lib/lifecycle";

export async function getDashboard() {
  const [
    total,
    byStatus,
    byRegion,
    progressAgg,
    milestoneDone,
    openIssues,
    risksByLevel,
    pmOverdue,
    ticketsOpen,
  ] = await Promise.all([
    prisma.site.count(),
    prisma.site.groupBy({ by: ["overallStatus"], _count: true }),
    prisma.site.groupBy({
      by: ["region"],
      _count: true,
      _avg: { progressPct: true },
    }),
    prisma.site.aggregate({ _avg: { progressPct: true } }),
    prisma.milestone.groupBy({
      by: ["phaseCode", "status"],
      _count: true,
    }),
    prisma.issue.count({ where: { status: "OPEN" } }),
    prisma.risk.groupBy({ by: ["level"], _count: true }),
    prisma.preventiveMaintenance.count({ where: { status: "OVERDUE" } }),
    prisma.maintenanceTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const statusCount = (s: string) =>
    byStatus.find((x) => x.overallStatus === s)?._count ?? 0;

  // Region rollup with on-air / handed-over counts
  const regionRows = await Promise.all(
    byRegion.map(async (r) => {
      const [onair, handed] = await Promise.all([
        prisma.site.count({ where: { region: r.region, isOnair: true } }),
        prisma.site.count({ where: { region: r.region, isHandedOver: true } }),
      ]);
      return {
        region: r.region ?? "—",
        total: r._count,
        onair,
        handed,
        progress: Math.round(r._avg.progressPct ?? 0),
      };
    })
  );
  regionRows.sort((a, b) => b.total - a.total);

  // Lifecycle funnel (delivery phases only)
  const funnel = PHASES.filter((p) => p.group === "DELIVERY").map((p) => {
    const rows = milestoneDone.filter((m) => m.phaseCode === p.code);
    const get = (st: string) => rows.find((m) => m.status === st)?._count ?? 0;
    return {
      code: p.code,
      ar: p.ar,
      done: get("DONE"),
      inProgress: get("IN_PROGRESS"),
      notStarted: get("NOT_STARTED"),
      na: get("NA"),
      blocked: get("BLOCKED"),
    };
  });

  const riskLevel = (l: string) =>
    risksByLevel.find((x) => x.level === l)?._count ?? 0;

  return {
    total,
    inOperation: statusCount("IN_OPERATION"),
    onair: statusCount("ONAIR") + statusCount("IN_OPERATION"),
    inProgress: statusCount("IN_PROGRESS"),
    notStarted: statusCount("NOT_STARTED"),
    blocked: statusCount("BLOCKED"),
    avgProgress: Math.round(progressAgg._avg.progressPct ?? 0),
    regionRows,
    funnel,
    openIssues,
    risks: {
      critical: riskLevel("Critical"),
      high: riskLevel("High"),
      medium: riskLevel("Medium"),
      low: riskLevel("Low"),
      total: risksByLevel.reduce((s, x) => s + x._count, 0),
    },
    pmOverdue,
    ticketsOpen,
  };
}

export interface SiteFilters {
  q?: string;
  region?: string;
  status?: string;
  phase?: string;
  batch?: string;
}

export async function getSites(filters: SiteFilters) {
  const where: any = {};
  if (filters.region) where.region = filters.region;
  if (filters.status) where.overallStatus = filters.status;
  if (filters.phase) where.currentPhase = filters.phase;
  if (filters.batch) where.deliveryBatch = filters.batch;
  if (filters.q) {
    where.OR = [
      { siteId: { contains: filters.q } },
      { name: { contains: filters.q } },
      { subRegion: { contains: filters.q } },
      { towerOwner: { contains: filters.q } },
    ];
  }
  return prisma.site.findMany({
    where,
    orderBy: [{ region: "asc" }, { siteId: "asc" }],
    select: {
      id: true,
      siteId: true,
      name: true,
      region: true,
      subRegion: true,
      siteType: true,
      deliveryBatch: true,
      currentPhase: true,
      overallStatus: true,
      progressPct: true,
      onairDate: true,
      _count: { select: { issues: { where: { status: "OPEN" } } } },
    },
  });
}

export async function getSite(id: string) {
  return prisma.site.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { phaseOrder: "asc" } },
      issues: { orderBy: { createdAt: "desc" } },
      maintenanceTickets: { orderBy: { reportedAt: "desc" } },
      preventiveTasks: { orderBy: { nextDueAt: "asc" } },
    },
  });
}

export async function getFilterOptions() {
  const [regions, batches] = await Promise.all([
    prisma.site.findMany({
      where: { region: { not: null } },
      distinct: ["region"],
      select: { region: true },
      orderBy: { region: "asc" },
    }),
    prisma.site.findMany({
      where: { deliveryBatch: { not: null } },
      distinct: ["deliveryBatch"],
      select: { deliveryBatch: true },
      orderBy: { deliveryBatch: "asc" },
    }),
  ]);
  return {
    regions: regions.map((r) => r.region!).filter(Boolean),
    batches: batches.map((b) => b.deliveryBatch!).filter(Boolean),
  };
}

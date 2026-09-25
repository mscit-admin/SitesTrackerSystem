// Shared filter parsing + where-builder for the audit log, used by both the
// viewer page and the CSV export route so they always agree.
import type { Prisma } from "@prisma/client";

export interface AuditFilter {
  category?: string;
  action?: string;
  actorId?: string;
  entity?: string;
  q?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function parseAuditFilter(sp: SP): AuditFilter {
  return {
    category: one(sp.category),
    action: one(sp.action),
    actorId: one(sp.actorId),
    entity: one(sp.entity),
    q: one(sp.q),
    from: one(sp.from),
    to: one(sp.to),
  };
}

export function auditWhere(f: AuditFilter): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (f.category) where.category = f.category;
  if (f.action) where.action = f.action;
  if (f.actorId) where.actorId = f.actorId;
  if (f.entity) where.entity = f.entity;
  if (f.q) {
    where.OR = [
      { summary: { contains: f.q } },
      { entityLabel: { contains: f.q } },
      { actorName: { contains: f.q } },
      { actorEmail: { contains: f.q } },
      { ip: { contains: f.q } },
    ];
  }
  const createdAt: Prisma.DateTimeFilter = {};
  if (f.from) {
    const d = new Date(f.from + "T00:00:00");
    if (!isNaN(d.getTime())) createdAt.gte = d;
  }
  if (f.to) {
    const d = new Date(f.to + "T23:59:59");
    if (!isNaN(d.getTime())) createdAt.lte = d;
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;
  return where;
}

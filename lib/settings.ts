// Configurable security / session parameters, stored in AppSetting and editable
// from the Settings screen.
import { prisma } from "@/lib/prisma";

export interface SecuritySettings {
  idleMinutes: number; // auto-logout after this many minutes of inactivity
  absoluteDays: number; // hard session lifetime
  maxFailures: number; // failed logins before lockout
  lockMinutes: number; // lockout duration
}

export const SECURITY_DEFAULTS: SecuritySettings = {
  idleMinutes: 30,
  absoluteDays: 7,
  maxFailures: 8,
  lockMinutes: 15,
};

const KEY = (k: keyof SecuritySettings) => `security.${k}`;
const BOUNDS: Record<keyof SecuritySettings, [number, number]> = {
  idleMinutes: [1, 1440],
  absoluteDays: [1, 90],
  maxFailures: [3, 50],
  lockMinutes: [1, 1440],
};

function clamp(k: keyof SecuritySettings, v: number): number {
  const [lo, hi] = BOUNDS[k];
  if (!Number.isFinite(v)) return SECURITY_DEFAULTS[k];
  return Math.min(hi, Math.max(lo, Math.round(v)));
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const keys = (Object.keys(SECURITY_DEFAULTS) as (keyof SecuritySettings)[]).map(KEY);
  const rows = await prisma.appSetting.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...SECURITY_DEFAULTS };
  for (const k of Object.keys(SECURITY_DEFAULTS) as (keyof SecuritySettings)[]) {
    const raw = map.get(KEY(k));
    if (raw != null) out[k] = clamp(k, parseInt(raw, 10));
  }
  return out;
}

export async function setSecuritySettings(values: Partial<SecuritySettings>): Promise<void> {
  const entries = Object.entries(values) as [keyof SecuritySettings, number][];
  for (const [k, v] of entries) {
    if (!(k in SECURITY_DEFAULTS)) continue;
    const val = String(clamp(k, Number(v)));
    await prisma.appSetting.upsert({ where: { key: KEY(k) }, update: { value: val }, create: { key: KEY(k), value: val } });
  }
}

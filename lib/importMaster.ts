// Parse an uploaded GSDN Master workbook (.xlsb / .xlsx) and turn each row into
// Site data, reusing the same lifecycle derivation as the seed.
import * as XLSX from "xlsx";
import { deriveLifecycle } from "@/lib/lifecycle";
import { detectRegion } from "@/lib/geoRegion";

const EPOCH = Date.UTC(1899, 11, 30); // Excel day 0 = 1899-12-30

function serialToISO(v: any): string | null {
  if (typeof v === "number" && v > 1 && v < 100000) {
    const d = new Date(EPOCH + Math.round(v) * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}
function clean(v: any): any {
  if (v == null) return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s === "" ? null : s;
  }
  return v;
}
const asNum = (v: any): number | null => (typeof v === "number" && !isNaN(v) ? v : null);
const toDate = (s: string | null): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const CW_BOQ: [string, number][] = [
  ["towerM", 118], ["mountingPoleM", 119], ["concretePlain", 120], ["concreteReinf", 121],
  ["acCable4x16", 122], ["acCable4x10", 123], ["dcCable25", 124], ["dcCable35", 125],
  ["ofPatchCord", 126], ["ofOutdoorShield", 127], ["cableTrayIndoor", 128], ["cableTrayOutdoor", 129],
  ["pvc1", 130], ["pvc15", 131], ["pvc2", 132], ["gnd16", 133], ["gnd35", 134], ["gnd50", 135],
  ["busbar", 136], ["copperRod", 137], ["copperPlatedRod", 138], ["manhole", 139],
  ["sw63a3ph", 140], ["sw63a1p", 141], ["sw32a1p", 142], ["sw16a1p", 143], ["sw10a1p", 144],
  ["acBox", 145], ["dcBox", 146], ["acBoxStand", 147], ["indoorRack", 148],
];
const TE_BOQ: [string, number][] = [
  ["wlVendor", 149], ["wlSectorQty", 150], ["wlAntennaType", 151], ["wlRfHeight", 152],
  ["wlAzimuth", 153], ["wlMTilt", 154], ["mwVendor", 155], ["mwAntennaQty", 156],
  ["mwAntennaType", 157], ["mwAntennaHeight", 158], ["mwAzimuth", 159], ["mwRssi", 160],
  ["mwUplinkSite", 161], ["ipVendor", 162], ["ipRouterQty", 163], ["ipRouterType", 164],
  ["pwrRectifierStatus", 165], ["pwrVendor", 166], ["pwrRatedRectifier", 167], ["pwrNoCharger", 168],
  ["pwrMaxCharger", 169], ["pwrMdbType", 170], ["pwrBatteryType", 171], ["pwrBatteryModel", 172],
  ["pwrBatteryCapacity", 173], ["pwrBatteryQty", 174], ["pwrBackupTime", 175], ["pwrDg", 176],
];

export function parseMasterSites(buf: ArrayBuffer): any[] {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets["Master"];
  if (!ws) throw new Error("لم يتم العثور على ورقة باسم 'Master' في الملف.");
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  const out: any[] = [];
  for (let r = 4; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const g = (c: number) => clean(row[c]);
    const dt = (c: number) => serialToISO(row[c]);
    const siteId = g(1);
    if (!siteId || typeof siteId !== "string") continue;

    const latitude = asNum(row[5]);
    const longitude = asNum(row[6]);
    let subRegion = g(12);
    let region = g(13);
    // Auto-derive Region / Sub-Region from coordinates when the workbook leaves
    // them empty. Explicit workbook values always win.
    if ((!region || !subRegion) && latitude != null && longitude != null) {
      const det = detectRegion(latitude, longitude);
      if (det) {
        if (!region) region = det.region;
        if (!subRegion && det.subRegion) subRegion = det.subRegion;
      }
    }

    const boq = (map: [string, number][]) => {
      const o: Record<string, any> = {};
      for (const [k, c] of map) o[k] = g(c);
      return o;
    };

    out.push({
      siteId,
      name: g(2),
      towerOwner: g(3),
      ownerSiteId: g(4) != null ? String(g(4)) : null,
      latitude,
      longitude,
      existingOrNew: g(7),
      rtOrGf: g(8),
      towerType: g(9),
      towerHeight: asNum(row[10]),
      busbarHeight: asNum(row[11]),
      subRegion,
      region,
      scenario: g(14),
      siteType: g(15) != null ? String(g(15)).trim() : null,
      uplinkSite: g(16),
      backupSite: g(17),
      belongToFN: g(18),
      primaryMFN: g(19),
      secondaryMFN: g(20),
      cabinetFoundationType: g(21),
      cabinetFoundationDims: g(22) != null ? String(g(22)) : null,
      deliveryBatch: g(25),
      sow: { towerErection: g(26), siteAdaption: g(27), gecolRequired: g(28), hlcRequired: g(29) },
      design: { rfSurveyDate: dt(23), acquisitionDate: dt(24), acquisitionStatus: dt(24) == null ? g(24) : null },
      procurement: { prDate: dt(30), poDate: dt(31), contractor: g(32) },
      preCw: {
        accessPermissionDate: dt(33), seName: g(34), surveyPlan: dt(35), surveyActual: dt(36),
        staPlan: dt(37), staActual: dt(38), layoutSubmission: dt(39), layoutApproval: dt(40),
      },
      towerErection: { mosPlan: dt(41), mosActual: dt(42), installPlanEnd: dt(43), installActualEnd: dt(44) },
      siteAdaption: {
        mosPlan: dt(45), mosActual: dt(46), cabinetFoundation: g(47), mountingPole: g(48), cableTray: g(49),
        indoorRack: g(50), opticalFiber: g(51), acDcBox: g(52), siteGnd: g(53), installPlanEnd: dt(54), installActualEnd: dt(55),
      },
      cwAcceptance: {
        cwDate: dt(56), pacPlan: dt(57), pacSnagsCleared: g(58), pacActual: dt(59),
        dlpStart: dt(60), dlpEnd: dt(61), facSnagsCleared: g(62), facActual: dt(63),
      },
      power: { gecolPrDate: dt(64), gecolInstallDate: dt(65) },
      fiber: { hlcPrDate: dt(66), hlcInstallDate: dt(67) },
      rfi: { rfiDate: dt(68) },
      teInstallation: {
        accessPermissionDate: dt(69), vendor: g(70), seName: g(71), surveyDate: dt(72), dnSubmitted: dt(73), dnApproved: dt(74),
        mosPlan: dt(75), mosActual: dt(76), mtsCabinet: g(77), ipRouter: g(78), rfAntenna: g(79), mwAntenna: g(80),
        dcOfCable: g(81), installPlanEnd: dt(82), installActualEnd: dt(83), teInstallDate: dt(84),
      },
      onair: { planDate: dt(85), commissioningDate: dt(86), mwAlignmentDate: dt(87), integrationDate: dt(88), onairDate: dt(89) },
      testing: {
        snagsCleared: g(90), hwInstallDocDate: dt(91), eirPwr: g(92), eirWl: g(93), eirMw: g(94), eirIp: g(95), eirDate: dt(96),
        patPwr: g(97), patWl: g(98), patMw: g(99), patIp: g(100), patDate: dt(101),
      },
      handover: {
        asBuiltDate: dt(102), asBuiltStatus: dt(102) == null ? g(102) : null,
        tePacDate: dt(103), tePacStatus: dt(103) == null ? g(103) : null,
        omHandoverDate: dt(104), omHandoverStatus: dt(104) == null ? g(104) : null,
      },
      issue: { pending: g(115), owner: g(116), remark: g(117) },
      cwBoq: boq(CW_BOQ),
      teBoq: boq(TE_BOQ),
    });
  }
  return out;
}

/** Build the Site scalar data + milestones from a parsed raw row. */
export function buildSiteData(raw: any) {
  const derived = deriveLifecycle(raw);
  const sow = raw.sow ?? {};
  const scalars = {
    name: raw.name ?? null,
    towerOwner: raw.towerOwner ?? null,
    ownerSiteId: raw.ownerSiteId ?? null,
    latitude: asNum(raw.latitude),
    longitude: asNum(raw.longitude),
    existingOrNew: raw.existingOrNew ?? null,
    rtOrGf: raw.rtOrGf ?? null,
    towerType: raw.towerType ?? null,
    towerHeight: asNum(raw.towerHeight),
    busbarHeight: asNum(raw.busbarHeight),
    subRegion: raw.subRegion ?? null,
    region: raw.region ?? null,
    scenario: raw.scenario ?? null,
    siteType: raw.siteType ?? null,
    uplinkSite: raw.uplinkSite ?? null,
    backupSite: raw.backupSite ?? null,
    belongToFN: raw.belongToFN ?? null,
    primaryMFN: raw.primaryMFN ?? null,
    secondaryMFN: raw.secondaryMFN ?? null,
    cabinetFoundationType: raw.cabinetFoundationType ?? null,
    cabinetFoundationDims: raw.cabinetFoundationDims ?? null,
    deliveryBatch: raw.deliveryBatch ?? null,
    sowTowerErection: sow.towerErection != null ? String(sow.towerErection) : null,
    sowSiteAdaption: sow.siteAdaption != null ? String(sow.siteAdaption) : null,
    sowGecolRequired: sow.gecolRequired != null ? String(sow.gecolRequired) : null,
    sowHlcRequired: sow.hlcRequired != null ? String(sow.hlcRequired) : null,
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
      design: raw.design, procurement: raw.procurement, preCw: raw.preCw, towerErection: raw.towerErection,
      siteAdaption: raw.siteAdaption, cwAcceptance: raw.cwAcceptance, power: raw.power, fiber: raw.fiber,
      rfi: raw.rfi, teInstallation: raw.teInstallation, onair: raw.onair, testing: raw.testing,
      handover: raw.handover, sow: raw.sow,
    }),
    cwBoq: JSON.stringify(raw.cwBoq ?? {}),
    teBoq: JSON.stringify(raw.teBoq ?? {}),
  };
  const milestones = derived.milestones.map((m) => ({
    phaseCode: m.phaseCode,
    phaseOrder: m.phaseOrder,
    status: m.status,
    plannedDate: toDate(m.plannedDate),
    actualDate: toDate(m.actualDate),
  }));
  return { scalars, milestones };
}

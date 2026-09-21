#!/usr/bin/env python3
"""Extract GSDN Master workbook into clean JSON for the SitesTracker seed."""
import pyxlsb, json, datetime, math, sys

import os
SRC = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "data", "source", "GSDN_Master.xlsb")
OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "data")

EPOCH = datetime.date(1899, 12, 30)

def to_date(v):
    """Excel serial number -> ISO date string, else None."""
    if v is None:
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if 1 < v < 100000:  # plausible Excel date serial
            try:
                return (EPOCH + datetime.timedelta(days=int(v))).isoformat()
            except Exception:
                return None
    return None

def clean(v):
    """Normalise a text/status cell."""
    if v is None:
        return None
    if isinstance(v, float):
        if math.isnan(v):
            return None
        if v.is_integer():
            return int(v)
        return v
    if isinstance(v, str):
        s = v.strip()
        return s if s else None
    return v

def rows_as_dicts(sh):
    out = []
    for row in sh.rows():
        d = {c.c: c.v for c in row if c.v is not None}
        out.append((row[0].r if row else None, d))
    return out

# ---- Column map for Master (0-indexed), data starts at row 4 ----
def extract_master(wb):
    with wb.get_sheet("Master") as sh:
        data = rows_as_dicts(sh)
    sites = []
    for r, d in data:
        if r is None or r < 4:
            continue
        site_id = clean(d.get(1))
        if not site_id or not isinstance(site_id, str):
            continue
        g = lambda c: clean(d.get(c))
        dt = lambda c: to_date(d.get(c))
        site = {
            "seq": g(0),
            "siteId": site_id,
            "name": g(2),
            "towerOwner": g(3),
            "ownerSiteId": g(4),
            "latitude": g(5) if isinstance(d.get(5), (int, float)) else None,
            "longitude": g(6) if isinstance(d.get(6), (int, float)) else None,
            "existingOrNew": g(7),
            "rtOrGf": g(8),
            "towerType": g(9),
            "towerHeight": g(10),
            "busbarHeight": g(11),
            "subRegion": g(12),
            "region": g(13),
            "scenario": g(14),
            "siteType": g(15),
            "uplinkSite": g(16),
            "backupSite": g(17),
            "belongToFN": g(18),
            "primaryMFN": g(19),
            "secondaryMFN": g(20),
            "cabinetFoundationType": g(21),
            "cabinetFoundationDims": g(22),
            "deliveryBatch": g(25),
            "sow": {
                "towerErection": g(26),
                "siteAdaption": g(27),
                "gecolRequired": g(28),
                "hlcRequired": g(29),
            },
            # ---- Lifecycle stage raw data ----
            "design": {
                "rfSurveyDate": dt(23),
                "acquisitionDate": dt(24),  # some are 'Done' text
                "acquisitionStatus": g(24) if dt(24) is None else None,
            },
            "procurement": {
                "prDate": dt(30), "poDate": dt(31), "contractor": g(32),
            },
            "preCw": {
                "accessPermissionDate": dt(33), "seName": g(34),
                "surveyPlan": dt(35), "surveyActual": dt(36),
                "staPlan": dt(37), "staActual": dt(38),
                "layoutSubmission": dt(39), "layoutApproval": dt(40),
            },
            "towerErection": {
                "mosPlan": dt(41), "mosActual": dt(42),
                "installPlanEnd": dt(43), "installActualEnd": dt(44),
            },
            "siteAdaption": {
                "mosPlan": dt(45), "mosActual": dt(46),
                "cabinetFoundation": g(47), "mountingPole": g(48), "cableTray": g(49),
                "indoorRack": g(50), "opticalFiber": g(51), "acDcBox": g(52), "siteGnd": g(53),
                "installPlanEnd": dt(54), "installActualEnd": dt(55),
            },
            "cwAcceptance": {
                "cwDate": dt(56),
                "pacPlan": dt(57), "pacSnagsCleared": g(58), "pacActual": dt(59),
                "dlpStart": dt(60), "dlpEnd": dt(61), "facSnagsCleared": g(62), "facActual": dt(63),
            },
            "power": {"gecolPrDate": dt(64), "gecolInstallDate": dt(65)},
            "fiber": {"hlcPrDate": dt(66), "hlcInstallDate": dt(67)},
            "rfi": {"rfiDate": dt(68)},
            "teInstallation": {
                "accessPermissionDate": dt(69), "vendor": g(70), "seName": g(71),
                "surveyDate": dt(72), "dnSubmitted": dt(73), "dnApproved": dt(74),
                "mosPlan": dt(75), "mosActual": dt(76),
                "mtsCabinet": g(77), "ipRouter": g(78), "rfAntenna": g(79),
                "mwAntenna": g(80), "dcOfCable": g(81),
                "installPlanEnd": dt(82), "installActualEnd": dt(83), "teInstallDate": dt(84),
            },
            "onair": {
                "planDate": dt(85), "commissioningDate": dt(86),
                "mwAlignmentDate": dt(87), "integrationDate": dt(88), "onairDate": dt(89),
            },
            "testing": {
                "snagsCleared": g(90), "hwInstallDocDate": dt(91),
                "eirPwr": g(92), "eirWl": g(93), "eirMw": g(94), "eirIp": g(95), "eirDate": dt(96),
                "patPwr": g(97), "patWl": g(98), "patMw": g(99), "patIp": g(100), "patDate": dt(101),
            },
            "handover": {
                "asBuiltDate": dt(102), "asBuiltStatus": g(102) if dt(102) is None else None,
                "tePacDate": dt(103), "tePacStatus": g(103) if dt(103) is None else None,
                "omHandoverDate": dt(104), "omHandoverStatus": g(104) if dt(104) is None else None,
            },
            "issue": {
                "pending": g(115), "owner": g(116), "remark": g(117),
            },
            "cwBoq": {
                "towerM": g(118), "mountingPoleM": g(119),
                "concretePlain": g(120), "concreteReinf": g(121),
                "acCable4x16": g(122), "acCable4x10": g(123),
                "dcCable25": g(124), "dcCable35": g(125),
                "ofPatchCord": g(126), "ofOutdoorShield": g(127),
                "cableTrayIndoor": g(128), "cableTrayOutdoor": g(129),
                "pvc1": g(130), "pvc15": g(131), "pvc2": g(132),
                "gnd16": g(133), "gnd35": g(134), "gnd50": g(135),
                "busbar": g(136), "copperRod": g(137), "copperPlatedRod": g(138), "manhole": g(139),
                "sw63a3ph": g(140), "sw63a1p": g(141), "sw32a1p": g(142), "sw16a1p": g(143), "sw10a1p": g(144),
                "acBox": g(145), "dcBox": g(146), "acBoxStand": g(147), "indoorRack": g(148),
            },
            "teBoq": {
                "wlVendor": g(149), "wlSectorQty": g(150), "wlAntennaType": g(151),
                "wlRfHeight": g(152), "wlAzimuth": g(153), "wlMTilt": g(154),
                "mwVendor": g(155), "mwAntennaQty": g(156), "mwAntennaType": g(157),
                "mwAntennaHeight": g(158), "mwAzimuth": g(159), "mwRssi": g(160), "mwUplinkSite": g(161),
                "ipVendor": g(162), "ipRouterQty": g(163), "ipRouterType": g(164),
                "pwrRectifierStatus": g(165), "pwrVendor": g(166), "pwrRatedRectifier": g(167),
                "pwrNoCharger": g(168), "pwrMaxCharger": g(169), "pwrMdbType": g(170),
                "pwrBatteryType": g(171), "pwrBatteryModel": g(172), "pwrBatteryCapacity": g(173),
                "pwrBatteryQty": g(174), "pwrBackupTime": g(175), "pwrDg": g(176),
            },
        }
        sites.append(site)
    return sites

def extract_risks(wb):
    with wb.get_sheet("Risk Register") as sh:
        data = rows_as_dicts(sh)
    risks = []
    for r, d in data:
        if r is None or r < 1:
            continue
        rid = clean(d.get(0))
        if not rid or not isinstance(rid, str) or not rid.startswith("R-"):
            continue
        g = lambda c: clean(d.get(c))
        risks.append({
            "riskId": rid, "statement": g(1), "category": g(2), "scope": g(3),
            "affectedSites": g(4), "probability": g(5), "impact": g(6),
            "score": g(7), "level": g(8), "response": g(9), "mitigation": g(10),
            "riskOwner": g(11), "actionOwner": g(12), "targetDate": to_date(d.get(13)),
            "status": g(14), "trend": g(15), "lastReview": to_date(d.get(16)),
        })
    return risks

def main():
    with pyxlsb.open_workbook(SRC) as wb:
        sites = extract_master(wb)
        risks = extract_risks(wb)
    with open(f"{OUT_DIR}/sites.json", "w", encoding="utf-8") as f:
        json.dump(sites, f, ensure_ascii=False, indent=1)
    with open(f"{OUT_DIR}/risks.json", "w", encoding="utf-8") as f:
        json.dump(risks, f, ensure_ascii=False, indent=1)
    print(f"Extracted {len(sites)} sites, {len(risks)} risks -> {OUT_DIR}")
    # quick sanity
    regions = {}
    for s in sites:
        regions[s["region"]] = regions.get(s["region"], 0) + 1
    print("Regions:", regions)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json, math
from pathlib import Path
import pandas as pd
import numpy as np
from bs4 import BeautifulSoup
from shapely.geometry import shape, Point, mapping

# ---------- Path handling (relative to this file) ----------
BASE = "content/"

DEF_MP   = BASE + "MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson"
DEF_POP  = BASE + "ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv"
DEF_HAWK = BASE + "HawkerCentresGEOJSON.geojson"
DEF_MRT  = BASE + "LTAMRTStationExitGEOJSON.geojson"
DEF_OUT  = BASE + "hawker_oppertunities.geojson"   # keep user's spelling

def _assert_exists(p: Path, label: str):
    if not p.exists():
        raise FileNotFoundError(f"{label} not found: {p}")

# ---------- Small utils ----------
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dlmb/2)**2
    return 2*R*math.asin(math.sqrt(a))

def zscore(series: pd.Series):
    s = pd.to_numeric(series, errors="coerce")
    mu, sd = s.mean(), s.std(ddof=0)
    if pd.isna(sd) or sd == 0:
        return pd.Series(np.zeros(len(s)), index=series.index, dtype=float)
    return (s - mu)/sd

def _parse_desc_table(html: str) -> dict:
    soup = BeautifulSoup(html or "", "html.parser")
    kv = {}
    for tr in soup.find_all("tr"):
        ths = tr.find_all("th")
        tds = tr.find_all("td")
        if len(ths) == 1 and len(tds) == 1:
            kv[ths[0].get_text(strip=True)] = tds[0].get_text(strip=True)
    return kv

# ---------- Loaders ----------
def load_masterplan(mp_path: Path) -> pd.DataFrame:
    _assert_exists(mp_path, "MasterPlan file")
    gj = json.loads(mp_path.read_text(encoding="utf-8"))
    rows = []
    for feat in gj.get("features", []):
        props = feat.get("properties", {}) or {}
        geom  = feat.get("geometry")
        name  = props.get("Name")
        info  = _parse_desc_table(props.get("Description", ""))
        subzone = (info.get("SUBZONE_N") or "").upper().strip()
        plan    = (info.get("PLN_AREA_N") or "").upper().strip()

        geom_obj = None
        lat = lon = None
        try:
            if geom:
                geom_obj = shape(geom)
                c = geom_obj.centroid
                lat, lon = float(c.y), float(c.x)
        except Exception:
            geom_obj = None

        rows.append({
            "Name": name,
            "SUBZONE_N": subzone,
            "PLN_AREA_N": plan,
            "geometry": geom_obj,
            "centroid_lat": lat,
            "centroid_lon": lon,
        })
    return pd.DataFrame(rows)

def load_population(pop_path: Path) -> pd.DataFrame:
    _assert_exists(pop_path, "Population CSV")
    df = pd.read_csv(pop_path)
    mask = (~df["Number"].str.contains(" - Total", na=False)) & (df["Number"] != "Total")
    pop = df.loc[mask, ["Number", "Total_Total"]].copy()
    pop["Total_Total"] = pd.to_numeric(pop["Total_Total"], errors="coerce")
    pop["SUBZONE_N"] = pop["Number"].str.upper().str.strip()
    return pop[["SUBZONE_N", "Total_Total"]]

def load_points(geojson_path: Path) -> pd.DataFrame:
    _assert_exists(geojson_path, "Points GeoJSON")
    gj = json.loads(geojson_path.read_text(encoding="utf-8"))
    rows = []
    for feat in gj.get("features", []):
        props = feat.get("properties", {}) or {}
        geom  = feat.get("geometry", {}) or {}
        lon = lat = None
        if geom.get("type") == "Point":
            coords = geom.get("coordinates", [])
            if isinstance(coords, (list, tuple)) and len(coords) >= 2:
                lon, lat = coords[0], coords[1]
        else:
            # Fallback for weird encodings
            coords = geom.get("coordinates")
            if isinstance(coords, list) and coords:
                p = coords[0]
                if isinstance(p, (list, tuple)) and len(p) >= 2 and not isinstance(p[0], (list, tuple)):
                    lon, lat = p[0], p[1]
        if lon is not None and lat is not None:
            rows.append({"Name": props.get("Name") or props.get("NAME") or props.get("name"),
                         "lat": float(lat), "lon": float(lon)})
    return pd.DataFrame(rows)

# ---------- Core ----------
def compute_scores_to_geojson(
    mp_path: Path,
    pop_path: Path,
    hawker_path: Path,
    mrt_path: Path,
    out_geojson: Path,
    w_dem=0.4, w_sup=0.3, w_acc=0.3,
):
    mp   = load_masterplan(mp_path)
    pop  = load_population(pop_path)
    hawk = load_points(hawker_path)
    mrt  = load_points(mrt_path)

    df = mp.merge(pop, on="SUBZONE_N", how="left")
    df.rename(columns={"Total_Total": "population"}, inplace=True)

    # supply: hawkers within polygon
    hawker_pts = [Point(xy) for xy in zip(hawk["lon"], hawk["lat"])]
    supply_counts = []
    for _, row in df.iterrows():
        poly = row["geometry"]
        if poly is None:
            supply_counts.append(np.nan)
            continue
        cnt = 0
        for pt in hawker_pts:
            try:
                if poly.contains(pt):
                    cnt += 1
            except Exception:
                pass
        supply_counts.append(cnt)
    df["supply_count"] = supply_counts

    # accessibility: nearest MRT (km) from centroid
    mrt_coords = list(zip(mrt["lat"], mrt["lon"]))
    def nearest_mrt_km(lat, lon):
        if pd.isna(lat) or pd.isna(lon) or not mrt_coords:
            return np.nan
        best = None
        for (mlat, mlon) in mrt_coords:
            d = haversine_km(lat, lon, mlat, mlon)
            if (best is None) or (d < best):
                best = d
        return best
    df["nearest_mrt_km"] = [nearest_mrt_km(la, lo) for la, lo in zip(df["centroid_lat"], df["centroid_lon"])]

    # z-scores
    df["Z_Dem"] = zscore(df["population"])
    df["Z_Sup"] = zscore(df["supply_count"])
    df["Z_Acc"] = -zscore(df["nearest_mrt_km"])  # nearer is better

    # combined + min-max to [0,1]
    df["H_raw"] = w_dem*df["Z_Dem"] - w_sup*df["Z_Sup"] + w_acc*df["Z_Acc"]
    h = df["H_raw"]
    hmin, hmax = h.min(skipna=True), h.max(skipna=True)
    df["H_score"] = 0.5 if (pd.isna(hmin) or pd.isna(hmax) or hmin==hmax) else (h - hmin) / (hmax - hmin)

    # write GeoJSON
    features = []
    for _, r in df.iterrows():
        geom = r["geometry"]
        if geom is None:
            continue
        props = {
            "Name": r["Name"],
            "SUBZONE_N": r["SUBZONE_N"],
            "PLN_AREA_N": r["PLN_AREA_N"],
            "population": None if pd.isna(r["population"]) else float(r["population"]),
            "supply_count": None if pd.isna(r["supply_count"]) else int(r["supply_count"]),
            "nearest_mrt_km": None if pd.isna(r["nearest_mrt_km"]) else float(r["nearest_mrt_km"]),
            "Z_Dem": None if pd.isna(r["Z_Dem"]) else float(r["Z_Dem"]),
            "Z_Sup": None if pd.isna(r["Z_Sup"]) else float(r["Z_Sup"]),
            "Z_Acc": None if pd.isna(r["Z_Acc"]) else float(r["Z_Acc"]),
            "H_score": None if pd.isna(r["H_score"]) else float(r["H_score"]),
        }
        #y het - name +population /3 do tuoi + so luong mrt + bus trong subzone day
        features.append({"type": "Feature", "properties": props, "geometry": mapping(geom)})

    out_geojson.write_text(json.dumps({"type": "FeatureCollection", "features": features}), encoding="utf-8")
    print(f"Wrote {out_geojson} with {len(features)} features.")

    # Write pd.DataFrame to CSV for debugging (optional)
    df.to_csv("debug_output.csv", index=False)


# ---------- CLI ----------
if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--masterplan", type=str, default=str(DEF_MP))
    p.add_argument("--population", type=str, default=str(DEF_POP))
    p.add_argument("--hawkers", type=str, default=str(DEF_HAWK))
    p.add_argument("--mrt", type=str, default=str(DEF_MRT))
    p.add_argument("--out", type=str, default=str(DEF_OUT))
    p.add_argument("--w_dem", type=float, default=0.4)
    p.add_argument("--w_sup", type=float, default=0.3)
    p.add_argument("--w_acc", type=float, default=0.3)
    args = p.parse_args()

    mp   = Path(args.masterplan)
    pop  = Path(args.population)
    hawk = Path(args.hawkers)
    mrt  = Path(args.mrt)
    out  = Path(args.out)

    compute_scores_to_geojson(mp, pop, hawk, mrt, out, w_dem=args.w_dem, w_sup=args.w_sup, w_acc=args.w_acc)

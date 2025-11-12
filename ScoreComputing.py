#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# hawker_oppertunity_gpd.py
# Output fields per subzone:
# name, subzone, planarea, population, pop_0_25, pop_25_65, pop_65plus, hawker, mrt, bus, H_score

import geopandas as gpd
import pandas as pd
import numpy as np
from pathlib import Path
from bs4 import BeautifulSoup

# ------------- Paths (same folder) -------------
BASE = Path(__file__).resolve().parent
MP   = "data/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson"
POP  = "data/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv"
HAWK = "data/HawkerCentresGEOJSON.geojson"
MRT  = "data/LTAMRTStationExitGEOJSON.geojson"    # exits, CRS84/WGS84
BUS  = "data/bus_stops.geojson"                    # your sample is EPSG:3414
OUT  = "hawker_opportunities_ver2.geojson"           # (requested spelling)

# ------------- Helpers -------------
def parse_from_desc(html: str, key: str):
    if not isinstance(html, str) or not html:
        return None
    soup = BeautifulSoup(html, "html.parser")
    th = soup.find("th", string=lambda s: s and s.strip().upper() == key.upper())
    if th:
        td = th.find_next("td")
        if td:
            return td.get_text(strip=True)
    return None

def zscore(s: pd.Series):
    s = pd.to_numeric(s, errors="coerce")
    mu, sd = s.mean(), s.std(ddof=0)
    if pd.isna(sd) or sd == 0:
        return pd.Series(np.zeros(len(s)), index=s.index, dtype=float)
    return (s - mu) / sd

def load_population(pop_csv: Path) -> pd.DataFrame:
    df = pd.read_csv(pop_csv)
    # keep subzone rows only
    mask = (~df["Number"].str.contains(" - Total", na=False)) & (df["Number"] != "Total")
    pop = df.loc[mask].copy()

    # numeric
    for c in pop.columns:
        if c.startswith("Total_"):
            pop[c] = pd.to_numeric(pop[c], errors="coerce")

    # Age groups: 0-25, 25-65, 65+
    g0_25   = ["Total_0_4","Total_5_9","Total_10_14","Total_15_19","Total_20_24","Total_25_29"]
    g25_65  = ["Total_30_34","Total_35_39","Total_40_44","Total_45_49","Total_50_54","Total_55_59","Total_60_64"]
    g65plus = ["Total_65_69","Total_70_74","Total_75_79","Total_80_84","Total_85_89","Total_90andOver"]

    pop["pop_0_25"] = pop[g0_25].sum(axis=1, skipna=True)
    pop["pop_25_65"] = pop[g25_65].sum(axis=1, skipna=True)
    pop["pop_65plus"] = pop[g65plus].sum(axis=1, skipna=True)
    pop["population"] = pop["pop_0_25"] + pop["pop_25_65"] + pop["pop_65plus"]
    pop["subzone"] = pop["Number"].str.upper().str.strip()
    return pop[["subzone","population","pop_0_25","pop_25_65","pop_65plus"]]

# ------------- Main -------------
def main():
    # 1) Master Plan polygons
    gdf_poly = gpd.read_file(MP)

    # Parse names out of Description if missing
    if "SUBZONE_N" not in gdf_poly.columns or "PLN_AREA_N" not in gdf_poly.columns:
        gdf_poly["SUBZONE_N"] = gdf_poly.get("SUBZONE_N")
        gdf_poly["PLN_AREA_N"] = gdf_poly.get("PLN_AREA_N")
        need = gdf_poly["SUBZONE_N"].isna() | gdf_poly["PLN_AREA_N"].isna()
        if "Description" in gdf_poly.columns:
            desc = gdf_poly.loc[need, "Description"].fillna("")
            gdf_poly.loc[need, "SUBZONE_N"] = desc.apply(lambda h: parse_from_desc(h, "SUBZONE_N"))
            gdf_poly.loc[need, "PLN_AREA_N"] = desc.apply(lambda h: parse_from_desc(h, "PLN_AREA_N"))

    # Normalize names
    gdf_poly["name"]     = gdf_poly.get("Name", None)
    gdf_poly["subzone"]  = gdf_poly["SUBZONE_N"].fillna("").str.upper().str.strip()
    gdf_poly["planarea"] = gdf_poly["PLN_AREA_N"].fillna("").str.upper().str.strip()

    # IMPORTANT: set polygon CRS correctly.
    # If your Master Plan is SVY21, set to 3414. If lon/lat, set to 4326.
    if gdf_poly.crs is None:
        gdf_poly = gdf_poly.set_crs(4326)  # change to 3414 if your MP is SVY21
    # fix invalid polygons
    gdf_poly["geometry"] = gdf_poly.buffer(0)

    # 2) Hawker centres → project to polygon CRS
    try:
        gdf_hawk = gpd.read_file(HAWK)
        if gdf_hawk.crs is None:
            gdf_hawk = gdf_hawk.set_crs(4326)
        gdf_hawk = gdf_hawk.to_crs(gdf_poly.crs)
    except Exception:
        gdf_hawk = gpd.GeoDataFrame(geometry=[], crs=gdf_poly.crs)

    # 3) MRT exits → stations
    gdf_mrt = gpd.read_file(MRT)
    gdf_mrt = gdf_mrt.set_crs(4326, allow_override=True).to_crs(gdf_poly.crs)

    # Extract station name for grouping
    if "STATION_NA" not in gdf_mrt.columns or gdf_mrt["STATION_NA"].isna().all():
        gdf_mrt["STATION_NA"] = gdf_mrt.get("STATION_NA")
        if "Description" in gdf_mrt.columns:
            need_st = gdf_mrt["STATION_NA"].isna()
            gdf_mrt.loc[need_st, "STATION_NA"] = (
                gdf_mrt.loc[need_st, "Description"].fillna("")
                .apply(lambda h: parse_from_desc(h, "STATION_NA"))
            )
    gdf_mrt["STATION_NA"] = gdf_mrt["STATION_NA"].fillna("").str.strip()

    # Collapse exits → one point per station (centroid of exits in same station)
    gdf_station = gdf_mrt.dissolve(by="STATION_NA")
    # Convert to projected CRS for accurate centroid calculation
    if gdf_station.crs.is_geographic:
        # Use a projected CRS for Singapore (EPSG:3414 - SVY21)
        gdf_station_proj = gdf_station.to_crs(3414)
        gdf_station_proj["geometry"] = gdf_station_proj.geometry.centroid
        gdf_station = gdf_station_proj.to_crs(gdf_poly.crs).reset_index()[["STATION_NA","geometry"]].set_crs(gdf_poly.crs)
    else:
        gdf_station["geometry"] = gdf_station.geometry.centroid
        gdf_station = gdf_station.reset_index()[["STATION_NA","geometry"]].set_crs(gdf_poly.crs)

    # 4) Bus stops (EPSG:3414 in your sample) → project to polygon CRS
    try:
        gdf_bus = gpd.read_file(BUS)
        gdf_bus = gdf_bus.set_crs(3414, allow_override=True).to_crs(gdf_poly.crs)
    except Exception:
        gdf_bus = gpd.GeoDataFrame(geometry=[], crs=gdf_poly.crs)

    # 5) Spatial joins → counts
    # hawker: intersects (include boundary)
    if len(gdf_hawk):
        hk = gpd.sjoin(
            gdf_hawk[["geometry"]],
            gdf_poly[["subzone","planarea","geometry"]],
            how="inner", predicate="intersects"
        )
        hawker_counts = (hk.groupby(["subzone","planarea"], as_index=False)
                           .size().rename(columns={"size":"hawker"}))
    else:
        hawker_counts = pd.DataFrame(columns=["subzone","planarea","hawker"])

    # mrt stations: within (station centroid must be inside polygon)
    if len(gdf_station):
        st = gpd.sjoin(
            gdf_station[["STATION_NA","geometry"]],
            gdf_poly[["subzone","planarea","geometry"]],
            how="inner", predicate="within"
        )
        mrt_counts = (st.groupby(["subzone","planarea"], as_index=False)
                        .agg(mrt=("STATION_NA","nunique")))
    else:
        mrt_counts = pd.DataFrame(columns=["subzone","planarea","mrt"])

    # bus: intersects (include boundary)
    if len(gdf_bus):
        bs = gpd.sjoin(
            gdf_bus[["geometry"]],
            gdf_poly[["subzone","planarea","geometry"]],
            how="inner", predicate="intersects"
        )
        bus_counts = (bs.groupby(["subzone","planarea"], as_index=False)
                        .size().rename(columns={"size":"bus"}))
    else:
        bus_counts = pd.DataFrame(columns=["subzone","planarea","bus"])

    # 6) Merge counts back to polygons
    keep_poly = ["name","subzone","planarea","geometry"]
    gdf = (gdf_poly[keep_poly]
           .merge(hawker_counts, on=["subzone","planarea"], how="left")
           .merge(mrt_counts,    on=["subzone","planarea"], how="left")
           .merge(bus_counts,    on=["subzone","planarea"], how="left"))

    for c in ["hawker","mrt","bus"]:
        gdf[c] = gdf[c].fillna(0).astype(int)

    # 7) Population + Accessibility + H_score (demand vs supply plus access)
    pop = load_population(POP)  # columns: subzone, population
    gdf = gdf.merge(pop, on="subzone", how="left")

    # Accessibility proxy: combine mrt and bus counts (simple count-based access)
    # If either column is missing, treat as 0. This avoids NaNs propagating.
    gdf["_mrt_for_acc"] = pd.to_numeric(gdf.get("mrt", 0), errors="coerce").fillna(0)
    gdf["_bus_for_acc"] = pd.to_numeric(gdf.get("bus", 0), errors="coerce").fillna(0)
    gdf["Acc"] = 0.7*gdf["_mrt_for_acc"] + 0.3*gdf["_bus_for_acc"]

    # H_score = normalized ( w_dem*Z(population) - w_sup*Z(hawker) + w_acc*Z(access) )
    # Rebalance weights to include accessibility
    w_dem, w_sup, w_acc = 0.5, 0.3, 0.2
    Z_Dem = zscore(gdf["population"])
    Z_Sup = zscore(gdf["hawker"])
    Z_Acc = zscore(gdf["Acc"])
    H_raw = w_dem*Z_Dem - w_sup*Z_Sup + w_acc*Z_Acc
    hmin, hmax = H_raw.min(skipna=True), H_raw.max(skipna=True)
    gdf["H_score"] = 0.5 if (pd.isna(hmin) or pd.isna(hmax) or hmin==hmax) else (H_raw - hmin) / (hmax - hmin)
    gdf["Dem"] = Z_Dem
    gdf["Sup"] = Z_Sup
    gdf["Acc"] = Z_Acc
    # Ranking
    gdf["H_rank"] = (
        gdf["H_score"]
        .rank(method="dense", ascending=False)
        .astype(int)
    )

    total_subzones = len(gdf)
    gdf["H_rank_label"] = gdf["H_rank"].astype(str) + "/" + str(total_subzones)

    # 8) Final field order + export (WGS84)
    # Keep as GeoDataFrame to maintain geometry column
    # Export without intermediate Acc field
    gdf_out = gdf[["name","subzone","planarea","population","pop_0_25","pop_25_65","pop_65plus","hawker","mrt","bus","H_score","H_rank","geometry","Dem","Sup","Acc"]].copy()
    gdf_out = gdf_out.to_crs(4326)
    gdf_out.to_file(OUT, driver="GeoJSON")

    print(f"[ok] wrote {OUT} with {len(gdf_out)} features.")
    print(gdf_out[["name","subzone","planarea","population","pop_0_25","pop_25_65","pop_65plus","hawker","mrt","bus","H_score","H_rank","Dem","Sup","Acc"]]
          .head(10).to_string(index=False))

if __name__ == "__main__":
    main()

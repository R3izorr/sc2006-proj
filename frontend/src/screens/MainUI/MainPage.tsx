import React, { useMemo, useState } from "react";
import MapView from "../../components/Map/MapView";

import { AppStateProvider } from "../../contexts/AppStateContext";

export default function MainPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isAdmin =
    typeof window !== "undefined" &&
    (localStorage.getItem("userRole") || "").toLowerCase() === "admin";
  const [selected, setSelected] = useState<any | null>(null);
  const [compare, setCompare] = useState<any[]>([]);
  const [tab, setTab] = useState<"details" | "search" | "filter">("details");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchName, setSearchName] = useState<string | null>(null);
  const [allNames, setAllNames] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [regionIndex, setRegionIndex] = useState<Record<string, string[]>>({});
  const [rankTop, setRankTop] = useState<10 | 20 | 50 | null>(null);
  const [rankBuckets, setRankBuckets] = useState<
    Record<"10" | "20" | "50", string[]>
  >({ "10": [], "20": [], "50": [] });
  const filteredSubzones = useMemo(() => {
    let a = allNames;
    if (regionName) {
      a = a.filter((n) => (regionIndex[regionName] ?? []).includes(n));
    }
    if (rankTop) {
      a = a.filter((n) =>
        (rankBuckets[String(rankTop) as "10" | "20" | "50"] ?? []).includes(n)
      );
    }
    return a;
  }, [allNames, regionName, rankTop, regionIndex, rankBuckets]);

  const suggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [] as string[];
    return allNames.filter((n) => n.toLowerCase().startsWith(q)).slice(0, 8);
  }, [searchInput, allNames]);

  const selectedId = useMemo(() => {
    if (!selected) return null;
    const p = selected.properties || {};
    return selected.id ?? p.SUBZONE_N ?? p.subzone ?? null;
  }, [selected]);

  const p = selected?.properties ?? {};
  const name = p.SUBZONE_N ?? p.subzone ?? "—";
  const planning = p.PLN_AREA_N ?? p.planning_area ?? p.planarea ?? "—";
  const h = normFmt(p.H_score ?? p.h_score);
  const rank = p.H_rank ?? p.h_rank;
  const pop = intFmt(p.population);
  const mrt = intFmt(p.mrt);
  const bus = intFmt(p.bus);
  const hawker = intFmt(p.hawker);
  const pop0 = Number(p.pop_0_25 ?? 0);
  const pop25 = Number(p.pop_25_65 ?? 0);
  const pop65 = Number(p.pop_65plus ?? 0);
  const popTotal = Number(p.population ?? 0);

  function itemId(f: any) {
    return f?.id ?? f?.properties?.SUBZONE_N ?? f?.properties?.subzone;
  }
  function inCompare(f: any) {
    const id = itemId(f);
    if (!id) return false;
    return compare.some((c) => itemId(c) === id);
  }
  function addToCompare(f: any) {
    const id = itemId(f);
    if (!id) return;
    setCompare((prev) => {
      const exists = prev.some((c) => itemId(c) === id);
      if (exists) return prev;
      if (prev.length >= 2) return [prev[1], f];
      return [...prev, f];
    });
  }
  function toggleCompare(f: any) {
    if (!f) return;
    if (inCompare(f)) {
      const id = itemId(f);
      setCompare((prev) => prev.filter((c) => itemId(c) !== id));
    } else {
      addToCompare(f);
    }
  }
  function removeCompareById(id: string) {
    setCompare((prev) => prev.filter((c) => itemId(c) !== id));
  }
  function clearCompare() {
    setCompare([]);
  }

  async function ensureJsPDF(): Promise<any> {
    const w: any = window as any;
    if (w.jspdf && w.jspdf.jsPDF) return w.jspdf.jsPDF;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });
    return (window as any).jspdf.jsPDF;
  }

  async function exportSubzonePdf() {
    if (!selected) return;
    const jsPDF = await ensureJsPDF();
    const doc = new jsPDF();
    const pad = 14;
    let y = 16;
    const title = String(name || "Subzone");
    doc.setFontSize(18);
    doc.text(title, pad, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(`Region: ${String(planning || "—")}`, pad, y);
    y += 6;
    doc.text(`Rank: ${String(rank ?? "—")}`, pad, y);
    y += 6;
    doc.text(`H_Score: ${String(h)}`, pad, y);
    y += 6;
    doc.text(`Population (total): ${String(pop)}`, pad, y);
    y += 8;
    doc.setFontSize(12);
    doc.text("Population by age group", pad, y);
    y += 6;
    doc.setFontSize(11);
    doc.text(
      `0–24: ${Math.round(Number(p.pop_0_25 ?? 0)).toLocaleString()}`,
      pad,
      y
    );
    y += 6;
    doc.text(
      `25–64: ${Math.round(Number(p.pop_25_65 ?? 0)).toLocaleString()}`,
      pad,
      y
    );
    y += 6;
    doc.text(
      `65+: ${Math.round(Number(p.pop_65plus ?? 0)).toLocaleString()}`,
      pad,
      y
    );
    y += 8;
    doc.setFontSize(12);
    doc.text("Nearby amenities", pad, y);
    y += 6;
    doc.setFontSize(11);
    doc.text(`MRT exits: ${String(mrt)}`, pad, y);
    y += 6;
    doc.text(`Bus stops: ${String(bus)}`, pad, y);
    y += 6;
    doc.text(`Hawker centres: ${String(hawker)}`, pad, y);
    y += 10;
    const ts = new Date().toLocaleString();
    doc.setFontSize(9);
    doc.text(`Generated on ${ts}`, pad, y);
    const fileSafe = title.replace(/[^a-z0-9\-_.]+/gi, "_");
    doc.save(`${fileSafe || "subzone"}.pdf`);
  }

  return (
    <AppStateProvider>
      <div className="h-full relative">
        <MapView
          selectedId={selectedId as any}
          onSelect={setSelected}
          searchName={searchName}
          onNamesLoaded={setAllNames}
          regionName={regionName}
          onRegionsLoaded={setRegions}
          onRegionIndexLoaded={setRegionIndex}
          rankTop={rankTop}
          onRankBucketsLoaded={setRankBuckets}
        />

        {/* Sidebar on the left */}
        <div className="absolute left-2 top-2 bottom-2 w-[420px] bg-white rounded-xl shadow px-5 py-3 z-[1000] flex flex-col justify-between gap-2 overflow-auto">
          {/* Logo and website name at the top */}
          <div className="flex flex-col items-center justify-center mt-2 mb-4">
            <a
              href="#/"
              className="flex items-center gap-2 mb-2 justify-start w-full hover:opacity-80 transition-opacity"
            >
              <img
                src="/images/hawker-logo.png"
                alt="Hawkerrr Logo"
                className="w-8 h-8 object-contain rounded"
              />
              <span className="font-bold text-lg text-gray-800">Hawkerrr</span>
            </a>
          </div>
          {/* Tabs row */}
          <div className="grid grid-cols-3 gap-0 border-b border-gray-200 pb-1 text-sm mb-1">
            <button
              className={`py-2 px-6 font-semibold flex flex-row items-center justify-center gap-4 transition-colors duration-150 ${
                tab === "details"
                  ? "bg-purple-100 text-purple-700 rounded-md shadow-sm"
                  : "text-gray-400 hover:bg-gray-50 rounded-md"
              }`}
              onClick={() => setTab("details")}
            >
              <img
                src="/icons/details_icon.png"
                alt="Details"
                className="w-5 h-5"
              />
              <span>Details</span>
            </button>
            <button
              className={`py-2 px-6 font-semibold flex flex-row items-center justify-center gap-4 transition-colors duration-150 ${
                tab === "search"
                  ? "bg-purple-100 text-purple-700 rounded-md shadow-sm"
                  : "text-gray-400 hover:bg-gray-50 rounded-md"
              }`}
              onClick={() => setTab("search")}
            >
              <img
                src="/icons/search_icon.png"
                alt="Search"
                className="w-5 h-5"
              />
              <span>Search</span>
            </button>
            <button
              className={`py-2 px-6 font-semibold flex flex-row items-center justify-center gap-4 transition-colors duration-150 ${
                tab === "filter"
                  ? "bg-purple-100 text-purple-700 rounded-md shadow-sm"
                  : "text-gray-400 hover:bg-gray-50 rounded-md"
              }`}
              onClick={() => setTab("filter")}
            >
              <img
                src="/icons/filter_icon.png"
                alt="Filter"
                className="w-5 h-5"
              />
              <span>Filter</span>
            </button>
          </div>

          {/* Tab content below */}
          <div className="flex-1">
            {tab === "details" && (
              <div className="mt-3 border border-gray-200 rounded-lg p-3 w-full">
                {/* Subzone name, planning area, and score */}
                <div className="flex flex-row justify-between items-start w-full">
                  <div>
                    <div className="font-semibold mb-0.5 text-lg mt-2">
                      {name}
                    </div>
                    <div className="text-sm text-gray-500 mb-2 mt-1">
                      {planning}
                    </div>
                  </div>
                  <div className="text-right min-w-[90px] rounded-md p-2">
                    <div className="text-base text-gray-500">Score</div>
                    <div className="text-2xl font-bold">{h}</div>
                    <div className="text-sm text-gray-400">
                      Rank {rank ?? "—"}
                    </div>
                  </div>
                </div>
                {/* Metrics grid */}
                <div className="mt-8 flex flex-row w-full rounded-md">
                  <div className="flex-[1.5] flex flex-col items-center justify-center pt-3 pb-0 text-center text-sm">
                    <Metric label="Population" value={pop} />
                  </div>
                  <div className="flex-[1.1] flex flex-col items-center justify-center pt-3 pb-0 text-center text-sm">
                    <Metric label="MRT" value={mrt} />
                  </div>
                  <div className="flex-[1.1] flex flex-col items-center justify-center pt-3 pb-0 text-center text-sm">
                    <Metric label="Bus Stops" value={bus} />
                  </div>
                  <div className="flex-[1.7] flex flex-col items-center justify-center pt-3 pb-0 text-center text-sm">
                    <Metric label="Hawker Centres" value={hawker} />
                  </div>
                </div>
                {/* Population by age group */}
                <div className="mt-8 w-full px-3">
                  <div className="text-base text-gray-600 mb-4">
                    Population by age group
                  </div>
                  <PopBars
                    pop0={pop0}
                    pop25={pop25}
                    pop65={pop65}
                    total={popTotal}
                  />
                </div>
                {/* Action buttons */}
                <div className="mt-8 grid grid-cols-2 gap-2 w-full px-3 pb-3">
                  <button
                    onClick={() => toggleCompare(selected)}
                    className={`w-full border py-1 rounded text-xs ${
                      inCompare(selected)
                        ? "border-red-600 text-red-600 bg-red-50 hover:bg-red-100"
                        : "border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100"
                    }`}
                  >
                    {inCompare(selected)
                      ? "− Remove from Comparison"
                      : "Add to Comparison"}
                  </button>
                  <button
                    onClick={exportSubzonePdf}
                    className="w-full border py-1 rounded text-xs border-gray-300 hover:bg-gray-50"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            )}
            {tab === "filter" && (
              <div
                className="mt-3 border border-gray-200 rounded-lg p-3 overflow-auto"
                style={{ maxHeight: "calc(100vh - 250px)" }}
              >
                <div className="text-sm text-gray-600 mb-7">
                  Filter by region
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={regionName ?? ""}
                    onChange={(e) => setRegionName(e.target.value || null)}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  >
                    <option value="">All regions</option>
                    {regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setRegionName(null)}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    Clear
                  </button>
                </div>
                <div className="text-sm text-gray-600 mt-4 mb-2">
                  Filter by rank
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={rankTop ?? ""}
                    onChange={(e) =>
                      setRankTop(
                        (e.target.value ? Number(e.target.value) : null) as any
                      )
                    }
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  >
                    <option value="">All ranks</option>
                    <option value="10">Top 10</option>
                    <option value="20">Top 20</option>
                    <option value="50">Top 50</option>
                  </select>
                  <button
                    onClick={() => setRankTop(null)}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    Clear
                  </button>
                </div>
                {filteredSubzones.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-600 mb-1">
                      Subzones matching filters
                    </div>
                    <div className="border border-gray-200 rounded">
                      {filteredSubzones.map((n) => (
                        <button
                          key={n}
                          onClick={() => {
                            setSearchInput(n);
                            setSearchName(n);
                          }}
                          className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {tab === "search" && (
              <div className="mt-3 border border-gray-200 rounded-lg p-6">
                <div className="text-sm text-gray-600 mb-2">
                  Search by subzone name
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSearchName(searchInput.trim() || null);
                      }
                    }}
                    placeholder="e.g. TIONG BAHRU"
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => setSearchName(searchInput.trim() || null)}
                    className="px-3 py-1 border rounded text-blue-600 border-blue-600 bg-blue-50 hover:bg-blue-100 text-sm"
                  >
                    Search
                  </button>
                </div>
                {suggestions.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded">
                    {suggestions.map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setSearchInput(n);
                          setSearchName(n);
                        }}
                        className="w-full text-left px-2 py-1 text-sm hover:bg-gray-50"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1 pl-1">
                  Tip: press Enter to go to the first match
                </div>
              </div>
            )}
          </div>
          {/* Bottom: Settings, Info, Divider, Left Arrow */}
          <div className="flex flex-row items-center justify-between w-full mt-4 pt-2 border-t border-gray-100 gap-2">
            <button
              className="flex flex-row items-center gap-2 px-2 py-1 text-gray-500 font-medium rounded hover:bg-gray-100 hover:text-gray-700 transition-all"
              onClick={() => {
                // Same as top-right settings Profile button
                window.location.hash = "#/profile";
              }}
            >
              <img
                src="/icons/profile_icon.png"
                alt="Profile"
                className="w-5 h-5 grayscale-0 mr-2"
                style={{ filter: "none" }}
              />
              <span className="text-sm">Profile</span>
            </button>
            <button
              className="flex flex-row items-center gap-2 px-2 py-1 text-gray-500 font-medium rounded hover:bg-gray-100 hover:text-gray-700 transition-all"
              onClick={async () => {
                // Same as top-right settings Logout button
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("userEmail");
                localStorage.removeItem("userRole");
                window.location.replace("#/login");
              }}
            >
              <img
                src="/icons/logout_icon.png"
                alt="Logout"
                className="w-5 h-5 grayscale-0 mr-2"
                style={{ filter: "none" }}
              />
              <span className="text-sm">Logout</span>
            </button>
            {isAdmin && (
              <button
                className="flex flex-row items-center gap-2 px-2 py-1 text-gray-500 font-medium rounded hover:bg-gray-100 hover:text-gray-700 transition-all"
                onClick={() => {
                  window.location.hash = "#/admin";
                }}
              >
                <img
                  src="/icons/admin_icon.png"
                  alt="Admin Console"
                  className="w-5 h-5 grayscale-0 mr-2"
                  style={{ filter: "none" }}
                />
                <span className="text-sm">Admin Console</span>
              </button>
            )}
          </div>
        </div>

        {/* Comparison tray (bottom): hidden until at least one element is added */}
        {compare.length > 0 && (
          <div
            className="absolute bg-white rounded-md shadow p-3 z-[1000]"
            style={{
              left: "calc(420px + 16px)", // sidebar width + sidebar left margin
              right: "88px", // leave space for zoom controls (plus/minus) and some gap
              bottom: "8px", // move bar slightly up from original
              transition: "left 0.2s, right 0.2s",
              pointerEvents: "auto",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="m-0 text-[16px] font-semibold">
                Comparison Tray (max 2)
              </h3>
              <button
                onClick={clearCompare}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => {
                const f = compare[i];
                const fp = f?.properties ?? {};
                const fid = f ? f.id ?? fp.SUBZONE_N ?? fp.subzone : null;
                const canAddSelected = !f && selected && !inCompare(selected);
                return (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg p-3 min-h-[80px] flex items-start justify-between gap-2"
                  >
                    {f ? (
                      <>
                        <div className="font-semibold">
                          {fp.SUBZONE_N ?? fp.subzone ?? "—"}
                        </div>
                        <button
                          onClick={() => fid && removeCompareById(String(fid))}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        Empty slot
                        <div className="mt-2">
                          <button
                            disabled={!canAddSelected}
                            onClick={() => addToCompare(selected)}
                            className={`text-sm px-2 py-1 rounded border ${
                              canAddSelected
                                ? "border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100"
                                : "border-gray-200 text-gray-300"
                            }`}
                          >
                            Add selected
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {compare.length === 2 && (
              <div className="mt-3 text-right">
                <button
                  onClick={() => {
                    const id1 = String(itemId(compare[0]));
                    const id2 = String(itemId(compare[1]));
                    window.location.hash = `#/compare?ids=${encodeURIComponent(
                      id1
                    )},${encodeURIComponent(id2)}`;
                  }}
                  className="px-3 py-1.5 border rounded text-white bg-blue-600 hover:bg-blue-700 text-sm"
                >
                  Compare
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppStateProvider>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function PopBars({
  pop0,
  pop25,
  pop65,
  total,
}: {
  pop0: number;
  pop25: number;
  pop65: number;
  total: number;
}) {
  const rows = [
    { label: "0–24", value: pop0, color: "bg-blue-500" },
    { label: "25–64", value: pop25, color: "bg-green-500" },
    { label: "65+", value: pop65, color: "bg-orange-500" },
  ];
  return (
    <div className="flex flex-col gap-1">
      {rows.map((r) => {
        const pct = Math.max(0, Math.min(1, total ? r.value / total : 0));
        return (
          <div key={r.label} className="flex items-center gap-2 text-base">
            <div className="w-12 text-gray-600">{r.label}</div>
            <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
              <div
                className={`${r.color} h-full`}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
            <div className="w-14 text-right tabular-nums">
              {Math.round(r.value).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function numFmt(v: any) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : String(v);
}
function intFmt(v: any) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : String(v);
}
function normFmt(v: any) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : String(v);
}

"use client";

import { useMemo, useState } from "react";
import { useLang, fmtKm2, fmtInt } from "@/i18n";
import type { IsoData, ProposedLine } from "@/lib/geo";

interface Props {
  iso: IsoData;
  lines: ProposedLine[];
}

const LINE_COLORS = ["#1f6feb", "#7c3aed", "#0e8a5f", "#d97706"];

function ringsToPath(rings: number[][][], p: (lon: number, lat: number) => [number, number]): string {
  const parts: string[] = [];
  for (const ring of rings) {
    if (!ring || ring.length < 3) continue;
    const pts = ring.map(([lon, lat]) => {
      const [x, y] = p(lon, lat);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    parts.push(`M${pts.join("L")}Z`);
  }
  return parts.join("");
}

function stationColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % LINE_COLORS.length;
  return LINE_COLORS[h];
}

export default function IsochroneMap({ iso, lines }: Props) {
  const { t, lang } = useLang();
  const m = t.map;
  const modes = useMemo(() => Object.keys(iso.modes), [iso]);
  const [mode, setMode] = useState<string>(modes.includes("transit") ? "transit" : modes[0]);
  const [minutes, setMinutes] = useState<number>(iso.meta.thresholds_min.includes(30) ? 30 : iso.meta.thresholds_min[0]);
  const [showLines, setShowLines] = useState(true);

  const modeNames: Record<string, string> = { transit: m.modes.transit, car: m.modes.car };

  const proj = useMemo(() => {
    const [lon0, lat0, lon1, lat1] = iso.meta.bbox;
    const latm = (lat0 + lat1) / 2;
    const kx = 111.32 * Math.cos((latm * Math.PI) / 180);
    const ky = 110.57;
    const W = (lon1 - lon0) * kx;
    const H = (lat1 - lat0) * ky;
    const p = (lon: number, lat: number): [number, number] => [(lon - lon0) * kx, (lat1 - lat) * ky];
    return { W, H, p };
  }, [iso]);

  const active = iso.modes[mode]?.[String(minutes)];
  const path = useMemo(
    () => (active ? ringsToPath(active.rings, proj.p) : ""),
    [active, proj]
  );
  const origin = proj.p(iso.meta.origin.lon, iso.meta.origin.lat);

  const lineName = (l: ProposedLine) => (lang === "fr" ? l.name_fr : l.name.split(" / ")[0]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/55">{m.mode}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["transit", "car"].map((md) => {
              const available = modes.includes(md);
              const label = modeNames[md] ?? md;
              return (
                <button
                  key={md}
                  disabled={!available}
                  onClick={() => setMode(md)}
                  title={available ? "" : m.carComputing}
                  aria-pressed={mode === md}
                  className={`rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors ${
                    !available
                      ? "cursor-not-allowed border border-line text-ink/30"
                      : mode === md
                        ? "bg-canada text-white"
                        : "border border-line text-ink/70 hover:border-ink"
                  }`}
                >
                  {label}
                  {!available && <span className="ml-1.5 text-[12px] font-normal">· {m.carComputing}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/55">{m.minutes}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {iso.meta.thresholds_min.map((th) => (
              <button
                key={th}
                onClick={() => setMinutes(th)}
                aria-pressed={minutes === th}
                className={`rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors ${
                  minutes === th ? "bg-ink text-white" : "border border-line text-ink/70 hover:border-ink"
                }`}
              >
                {th} {m.min}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/55">{m.lines}</p>
          <button
            onClick={() => setShowLines(!showLines)}
            aria-pressed={showLines}
            className={`mt-2 rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors ${
              showLines ? "bg-ink text-white" : "border border-line text-ink/70 hover:border-ink"
            }`}
          >
            {showLines ? "✓" : ""} {m.linesToggle}
          </button>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-[24px] border border-line bg-paper-warm">
        <svg
          viewBox={`0 0 ${proj.W.toFixed(1)} ${proj.H.toFixed(1)}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`${minutes} ${m.min} ${modeNames[mode] ?? mode} isochrone`}
        >
          <rect x={0} y={0} width={proj.W} height={proj.H} fill="#f4f4f2" />
          {path && <path d={path} fill="#d80621" fillOpacity={0.28} stroke="#d80621" strokeWidth={0.55} fillRule="evenodd" />}
          {showLines &&
            lines.map((l) => {
              const c = stationColor(l.id);
              const stations = l.stations ?? [];
              const d = stations
                .map((s) => {
                  const [x, y] = proj.p(s.lon, s.lat);
                  return `${x.toFixed(2)},${y.toFixed(2)}`;
                })
                .join("L");
              return (
                <g key={l.id}>
                  {d && <path d={`M${d}`} fill="none" stroke={c} strokeWidth={0.8} strokeLinecap="round" />}
                  {stations.map((s, i) => {
                    const [x, y] = proj.p(s.lon, s.lat);
                    return <circle key={i} cx={x} cy={y} r={0.85} fill={c} stroke="#fff" strokeWidth={0.25} />;
                  })}
                </g>
              );
            })}
          <circle cx={origin[0]} cy={origin[1]} r={1.15} fill="#0a0f1e" stroke="#fff" strokeWidth={0.4} />
        </svg>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-6 py-4 text-[14px] text-ink/70">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-[4px] bg-canada/30 ring-1 ring-canada" />
            {active ? fmtKm2(active.km2, lang) : "…"} {m.legendKm2}
          </span>
          {active?.population != null && (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-ink" />
              {fmtInt(active.population, lang)} {m.legendPop}
            </span>
          )}
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-ink ring-2 ring-white" />
            {m.origin}
          </span>
          {showLines && (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-[#1f6feb] ring-1 ring-white" />
              {m.station}
            </span>
          )}
          <span className="ml-auto rounded-full bg-canada/10 px-3 py-1 text-[12px] font-semibold text-canada">{m.estimated}</span>
        </div>
      </div>

      {showLines && lines.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[14px] text-ink/70">
          {lines.map((l) => (
            <span key={l.id} className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-6 rounded-full" style={{ background: stationColor(l.id) }} />
              {lineName(l)}
            </span>
          ))}
        </div>
      )}
      <p className="mt-5 max-w-[760px] text-[14px] leading-relaxed text-ink/55">{m.note}</p>
    </div>
  );
}

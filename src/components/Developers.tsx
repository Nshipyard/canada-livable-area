"use client";

import { useLang, fmtKm2 } from "@/i18n";
import McpConnect from "./McpConnect";

interface Sample {
  mode: string;
  minutes: number;
  km2: number;
  population: number | null;
  baseKm2: number | null;
  marginalReady: boolean;
  topRow: { id: string; marginal_km2: number; km2_per_bcad: number | null } | null;
}

export default function Developers({ sample }: { sample: Sample | null }) {
  const { t, lang } = useLang();

  const km2Str = sample ? fmtKm2(sample.km2, lang) : "…";
  const popStr = sample && sample.population != null ? String(sample.population) : "null";
  const baseStr = sample && sample.baseKm2 != null ? fmtKm2(sample.baseKm2, lang) : "…";

  const rankRow = sample?.topRow
    ? `{ "id": "${sample.topRow.id}",\n    "marginal_km2": ${fmtKm2(sample.topRow.marginal_km2, lang)}, "km2_per_bcad": ${sample.topRow.km2_per_bcad == null ? "null" : fmtKm2(sample.topRow.km2_per_bcad, lang)} }`
    : `{ "id": "ontario-line", "marginal_km2": "…", "km2_per_bcad": "…" }`;

  const endpoints = [
    {
      method: "GET",
      path: `/api/v1/isochrone?mode=${sample?.mode ?? "transit"}&minutes=${sample?.minutes ?? 30}`,
      desc:
        lang === "fr"
          ? "Une isochrone modélisée : mode, minutes, km², population quand calculée, et les anneaux de polygones."
          : "One modeled isochrone: mode, minutes, km², population when computed, and the polygon rings.",
      response: `{
  "mode": "${sample?.mode ?? "transit"}",
  "minutes": ${sample?.minutes ?? 30},
  "km2": ${km2Str},
  "population": ${popStr},
  "estimate": "modeled estimate",
  "rings": [ [ [ -79.38, 43.65 ], … ] ]
}`,
    },
    {
      method: "GET",
      path: "/api/v1/corridors",
      desc:
        lang === "fr"
          ? "Lignes proposées classées par km² de 30 min ajoutés par milliard de dollars, avec l'isochrone de base. Retombe sur les métadonnées des lignes pendant que l'analyse marginale calcule."
          : "Proposed lines ranked by added 30-minute km² per billion dollars, with the base isochrone. Falls back to line metadata while marginal analysis computes.",
      response: `{
  "status": "${sample?.marginalReady ? "ready" : "computing"}",
  "base_km2_30min": ${baseStr},
  "ranking": [ ${rankRow} ]
}`,
    },
  ];

  return (
    <section id="developers" className="bg-ink text-white">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">{t.developers.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.developers.title}</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-white/70">{t.developers.body}</p>

        <h3 className="mt-14 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">{t.developers.endpoints}</h3>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {endpoints.map((e) => (
            <article key={e.path} className="flex min-w-0 flex-col rounded-[24px] border border-white/15 bg-white/5 p-6">
              <p className="font-mono text-[12px] font-semibold text-white/60">{e.method}</p>
              <code className="mt-1 break-all font-mono text-[13px] text-white">{e.path}</code>
              <p className="mt-2 text-[14px] text-white/65">{e.desc}</p>
              <pre className="mt-4 flex-1 overflow-x-auto rounded-[16px] bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-white/80">
                {e.response}
              </pre>
              <a
                href={e.path}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block self-start rounded-full border border-white/25 px-5 py-2 text-[14px] font-semibold hover:border-white"
              >
                {t.developers.tryIt} →
              </a>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <a href="/api/openapi.json" target="_blank" rel="noreferrer" className="block rounded-[24px] bg-white/[0.06] p-6 hover:bg-white/[0.09]">
            <h4 className="text-[19px] font-semibold">{t.developers.openapi}</h4>
            <code className="mt-2 block font-mono text-[13px] text-white/60">GET /api/openapi.json</code>
          </a>
        </div>

        <McpConnect
          config={{
            slug: "livable-area",
            displayName: "Livable Area",
            exampleEn: "Get the 30-minute transit isochrone from Union Station and show me its km²",
            exampleFr: "Récupère l'isochrone de 30 minutes en transport en commun depuis la gare Union et montre-moi ses km²",
          }}
        />
      </div>
    </section>
  );
}

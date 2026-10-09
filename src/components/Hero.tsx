"use client";

import { useLang, fmtKm2, fmtInt } from "@/i18n";

export interface HeroStats {
  transitKm2: number | null;
  carKm2: number | null;
  population: number | null;
  top: { name: string; name_fr: string; km2PerBcad: number } | null;
  lineCount: number;
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export default function Hero({ stats }: { stats: HeroStats }) {
  const { t, lang } = useLang();
  const s = t.stats;
  const topName = stats.top ? (lang === "fr" ? stats.top.name_fr : stats.top.name.split(" / ")[0]) : "";

  const tiles = [
    {
      value: stats.transitKm2 == null ? "…" : fmtKm2(stats.transitKm2, lang),
      label: fill(s.km2Label, { mode: t.map.modes.transit }),
    },
    {
      value: stats.carKm2 == null ? "…" : fmtKm2(stats.carKm2, lang),
      label:
        stats.carKm2 == null
          ? fill(s.computingLabel, { name: t.map.modes.car })
          : fill(s.km2Label, { mode: t.map.modes.car }),
    },
    {
      value: stats.population == null ? "…" : fmtInt(stats.population, lang),
      label:
        stats.population == null
          ? fill(s.computingLabel, { name: "population" })
          : fill(s.populationLabel, { mode: t.map.modes.transit }),
    },
    stats.top
      ? {
          value: fmtKm2(stats.top.km2PerBcad, lang),
          label: fill(s.corridorLabel, { name: topName }),
        }
      : {
          value: String(stats.lineCount),
          label: s.corridorPendingLabel,
        },
  ];

  return (
    <section id="top" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 pb-16 pt-16 md:pb-24 md:pt-24">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.hero.kicker}</p>
        <h1 className="display mt-5 max-w-[880px] text-[52px] md:text-[84px]">{t.hero.title}</h1>
        <p className="mt-6 max-w-[680px] text-[19px] leading-relaxed text-ink/70 md:text-[21px]">{t.hero.sub}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a href="#map" className="rounded-full bg-canada px-7 py-3.5 text-[16px] font-semibold text-white hover:bg-canada-dark">
            {t.hero.cta1}
          </a>
          <a href="#methodology" className="rounded-full border border-line px-7 py-3.5 text-[16px] font-semibold hover:border-ink">
            {t.hero.cta2}
          </a>
        </div>
        <div className="mt-16 grid gap-px overflow-hidden rounded-[24px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="bg-paper p-7">
              <p className="display text-[44px] text-canada">{tile.value}</p>
              <p className="mt-2 text-[15px] leading-snug text-ink/65">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

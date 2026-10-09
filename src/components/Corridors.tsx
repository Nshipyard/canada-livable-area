"use client";

import { useLang, fmtKm2 } from "@/i18n";
import { rankCorridors } from "@/lib/geo";
import type { Marginal, ProposedLine } from "@/lib/geo";

interface Props {
  marginal: Marginal | null;
  lines: ProposedLine[];
}

export default function Corridors({ marginal, lines }: Props) {
  const { t, lang } = useLang();
  const c = t.corridors;
  const lineName = (name: string, nameFr: string) => (lang === "fr" ? nameFr : name.split(" / ")[0]);
  const statusOf = (s: string) => c.statusMap[s] ?? s;
  const budgetOf = (b: number | null) => (b == null ? "…" : lang === "fr" ? b.toFixed(1).replace(".", ",") : b.toFixed(1));

  if (marginal) {
    const rows = rankCorridors(marginal);
    return (
      <div>
        <p className="mt-5 max-w-[760px] text-[18px] leading-relaxed text-ink/70">{c.body}</p>
        <p className="mt-4 text-[15px] font-medium text-ink/75">
          {c.base.replace("{km2}", fmtKm2(marginal.base_km2_30min, lang))}
        </p>
        <div className="mt-8 overflow-x-auto rounded-[24px] border border-line">
          <table className="w-full min-w-[760px] border-collapse bg-paper text-left">
            <thead>
              <tr className="border-b border-line bg-paper-warm text-[13px] uppercase tracking-[0.08em] text-ink/55">
                <th className="px-6 py-4 font-semibold">{c.rank}</th>
                <th className="px-6 py-4 font-semibold">{c.corridor}</th>
                <th className="px-6 py-4 font-semibold">{c.addedKm2}</th>
                <th className="px-6 py-4 font-semibold">{c.budget}</th>
                <th className="px-6 py-4 font-semibold">{c.perB}</th>
                <th className="px-6 py-4 font-semibold">{c.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper-warm">
                  <td className="display px-6 py-5 text-[26px] text-canada">{i + 1}</td>
                  <td className="px-6 py-5 text-[16px] font-semibold">{lineName(r.name, r.name_fr)}</td>
                  <td className="px-6 py-5 font-mono text-[15px]">{fmtKm2(r.marginal_km2, lang)}</td>
                  <td className="px-6 py-5 font-mono text-[15px]" title={lang === "fr" ? r.budget_label_fr : r.budget_label}>
                    {budgetOf(r.budget_cad_b)}
                  </td>
                  <td className="px-6 py-5 font-mono text-[15px] font-semibold text-canada">
                    {r.km2_per_bcad == null ? "…" : fmtKm2(r.km2_per_bcad, lang)}
                  </td>
                  <td className="px-6 py-5 text-[15px] text-ink/70">{statusOf(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mt-5 max-w-[760px] text-[18px] leading-relaxed text-ink/70">{c.body}</p>
      <p className="mt-4 max-w-[760px] rounded-[16px] border border-line bg-paper-warm px-5 py-4 text-[15px] leading-relaxed text-ink/70">
        {c.pending}
      </p>
      <div className="mt-8 overflow-x-auto rounded-[24px] border border-line">
        <table className="w-full min-w-[640px] border-collapse bg-paper text-left">
          <thead>
            <tr className="border-b border-line bg-paper-warm text-[13px] uppercase tracking-[0.08em] text-ink/55">
              <th className="px-6 py-4 font-semibold">{c.corridor}</th>
              <th className="px-6 py-4 font-semibold">{c.budget}</th>
              <th className="px-6 py-4 font-semibold">{c.status}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0 hover:bg-paper-warm">
                <td className="px-6 py-5 text-[16px] font-semibold">{lineName(l.name, l.name_fr)}</td>
                <td className="px-6 py-5 font-mono text-[15px]" title={lang === "fr" ? l.budget_label_fr : l.budget_label}>
                  {budgetOf(l.budget_cad_b)}
                </td>
                <td className="px-6 py-5 text-[15px] text-ink/70">{statusOf(l.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

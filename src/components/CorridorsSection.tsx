"use client";

import { useLang } from "@/i18n";
import Corridors from "./Corridors";
import type { Marginal, ProposedLine } from "@/lib/geo";

export default function CorridorsSection({ marginal, lines }: { marginal: Marginal | null; lines: ProposedLine[] }) {
  const { t } = useLang();
  return (
    <section id="corridors" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.corridors.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.corridors.title}</h2>
        <div className="mt-2">
          <Corridors marginal={marginal} lines={lines} />
        </div>
      </div>
    </section>
  );
}

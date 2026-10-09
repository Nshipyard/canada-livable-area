"use client";

import { useLang } from "@/i18n";
import IsochroneMap from "./IsochroneMap";
import type { IsoData, ProposedLine } from "@/lib/geo";

export default function MapSection({ iso, lines }: { iso: IsoData; lines: ProposedLine[] }) {
  const { t } = useLang();
  return (
    <section id="map" className="bg-paper-warm">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.map.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.map.title}</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-ink/70">{t.map.body}</p>
        <div className="mt-10">
          <IsochroneMap iso={iso} lines={lines} />
        </div>
      </div>
    </section>
  );
}

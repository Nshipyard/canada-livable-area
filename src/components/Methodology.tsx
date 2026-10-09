"use client";

import { useLang } from "@/i18n";

export default function Methodology() {
  const { t } = useLang();
  return (
    <section id="methodology" className="bg-paper-warm">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.methodology.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.methodology.title}</h2>
        <ol className="mt-10 max-w-[800px] space-y-5">
          {t.methodology.items.map((item, i) => (
            <li key={i} className="flex gap-5">
              <span className="display shrink-0 text-[28px] text-canada">{String(i + 1).padStart(2, "0")}</span>
              <p className="pt-1 text-[16px] leading-relaxed text-ink/75">{item}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

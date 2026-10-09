"use client";

import { useLang } from "@/i18n";

export default function Downloads({ files }: { files: string[] }) {
  const { t } = useLang();
  const descs: Record<string, string> = {
    "isochrones.json": t.downloads.files[0].desc,
    "proposed_lines.json": t.downloads.files[1].desc,
    "marginal.json": t.downloads.marginal.desc,
  };
  return (
    <section id="data" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.downloads.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.downloads.title}</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-ink/70">{t.downloads.body}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {files.map((name) => (
            <div key={name} className="flex items-center justify-between gap-4 rounded-[24px] border border-line bg-paper-warm p-6">
              <div>
                <code className="font-mono text-[15px] font-medium">{name}</code>
                <p className="mt-1 text-[14px] text-ink/60">{descs[name] ?? ""}</p>
              </div>
              <a href={`/data/${name}`} download className="shrink-0 rounded-full border border-line px-5 py-2.5 text-[15px] font-semibold hover:border-ink">
                {t.downloads.download}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

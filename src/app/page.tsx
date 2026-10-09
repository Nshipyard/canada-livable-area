import { Banner, Nav, Footer } from "@/components/chrome";
import Hero from "@/components/Hero";
import MapSection from "@/components/MapSection";
import CorridorsSection from "@/components/CorridorsSection";
import Methodology from "@/components/Methodology";
import Developers from "@/components/Developers";
import Downloads from "@/components/Downloads";
import {
  readIsochrones,
  readMarginal,
  readProposedLines,
  dataFileExists,
  topCorridor,
  rankCorridors,
} from "@/lib/livable";

export default function Home() {
  const iso = readIsochrones();
  const marginal = readMarginal();
  const lines = readProposedLines();

  const transit30 = iso?.modes?.transit?.["30"] ?? null;
  const car30 = iso?.modes?.car?.["30"] ?? null;
  const top = marginal ? topCorridor(marginal) : null;

  const heroStats = {
    transitKm2: transit30?.km2 ?? null,
    carKm2: car30?.km2 ?? null,
    population: transit30?.population ?? null,
    top:
      top && top.km2_per_bcad != null
        ? { name: top.name, name_fr: top.name_fr, km2PerBcad: top.km2_per_bcad }
        : null,
    lineCount: lines.length,
  };

  const downloadFiles = ["isochrones.json", "proposed_lines.json"];
  if (dataFileExists("marginal.json")) downloadFiles.push("marginal.json");

  const topRanked = marginal ? rankCorridors(marginal)[0] : null;
  const sample = transit30
    ? {
        mode: "transit",
        minutes: 30,
        km2: transit30.km2,
        population: transit30.population ?? null,
        baseKm2: marginal?.base_km2_30min ?? null,
        marginalReady: marginal != null,
        topRow: topRanked
          ? { id: topRanked.id, marginal_km2: topRanked.marginal_km2, km2_per_bcad: topRanked.km2_per_bcad }
          : null,
      }
    : null;

  return (
    <>
      <Banner />
      <Nav />
      <main className="flex-1">
        <Hero stats={heroStats} />
        {iso ? (
          <MapSection iso={iso} lines={lines} />
        ) : (
          <section id="map" className="bg-paper-warm">
            <div className="mx-auto max-w-[1392px] px-6 py-20">
              <p className="text-[16px] text-ink/70">Isochrone data is not available yet.</p>
            </div>
          </section>
        )}
        <CorridorsSection marginal={marginal} lines={lines} />
        <Methodology />
        <Developers sample={sample} />
        <Downloads files={downloadFiles} />
      </main>
      <Footer />
    </>
  );
}

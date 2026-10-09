import { NextResponse } from "next/server";
import { readIsochrones } from "@/lib/livable";

// GET /api/v1/isochrone?mode=transit&minutes=30
// Returns one modeled isochrone from Union Station: km2, population
// (when computed), and the polygon rings.
export async function GET(req: Request) {
  const iso = readIsochrones();
  if (!iso) {
    return NextResponse.json({ error: "isochrone data not available" }, { status: 500 });
  }
  const url = new URL(req.url);
  const modes = Object.keys(iso.modes);
  const mode = (url.searchParams.get("mode") ?? modes[0] ?? "transit").toLowerCase();
  const minutes = parseInt(url.searchParams.get("minutes") ?? "30", 10);
  const thresholds = iso.meta.thresholds_min;

  if (!iso.modes[mode]) {
    return NextResponse.json(
      { error: `unknown mode "${mode}"`, available_modes: modes },
      { status: 400 }
    );
  }
  if (!thresholds.includes(minutes)) {
    return NextResponse.json(
      { error: `minutes must be one of ${thresholds.join(", ")}`, available_minutes: thresholds },
      { status: 400 }
    );
  }
  const t = iso.modes[mode][String(minutes)];
  return NextResponse.json({
    mode,
    minutes,
    km2: t.km2,
    population: t.population ?? null,
    rings: t.rings,
    bbox: iso.meta.bbox,
    origin: iso.meta.origin,
    estimate: "modeled estimate",
  });
}

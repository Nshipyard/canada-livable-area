import fs from "node:fs";
import path from "node:path";
import type { IsoData, Marginal, ProposedLine } from "./geo";

export type { IsoData, Marginal, ProposedLine } from "./geo";
export { rankCorridors, topCorridor, type RankedLine } from "./geo";

const PUB = path.join(process.cwd(), "public", "data");

function readJson<T>(name: string): T | null {
  try {
    const p = path.join(PUB, name);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

export function dataFileExists(name: string): boolean {
  try {
    return fs.existsSync(path.join(PUB, name));
  } catch {
    return false;
  }
}

export function readIsochrones(): IsoData | null {
  const d = readJson<IsoData>("isochrones.json");
  if (!d || !d.modes || typeof d.modes !== "object") return null;
  return d;
}

export function readMarginal(): Marginal | null {
  const d = readJson<Marginal>("marginal.json");
  if (!d || !d.lines || typeof d.lines !== "object") return null;
  return d;
}

export function readProposedLines(): ProposedLine[] {
  const d = readJson<{ lines: ProposedLine[] }>("proposed_lines.json");
  if (!d || !Array.isArray(d.lines)) return [];
  return d.lines;
}

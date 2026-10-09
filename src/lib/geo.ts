// Pure data helpers: no node imports, safe to use in client components.

export interface IsoThreshold {
  km2: number;
  population: number | null;
  rings: number[][][];
}

export interface IsoMeta {
  cell_km: number;
  bbox: [number, number, number, number];
  origin: { lat: number; lon: number; name: string };
  thresholds_min: number[];
  walk_speed_kmh: number;
}

export interface IsoData {
  meta: IsoMeta;
  modes: Record<string, Record<string, IsoThreshold>>;
}

export interface LineStation {
  name: string;
  lat: number;
  lon: number;
}

export interface ProposedLine {
  id: string;
  name: string;
  name_fr: string;
  mode: string;
  length_km: number | null;
  budget_cad_b: number | null;
  budget_label: string;
  budget_label_fr: string;
  status: string;
  description: string;
  description_fr: string;
  stations: LineStation[] | null;
}

export interface MarginalLine {
  name: string;
  name_fr: string;
  budget_cad_b: number | null;
  budget_label: string;
  budget_label_fr: string;
  km2_30min: number;
  marginal_km2: number;
  km2_per_bcad: number | null;
  status: string;
}

export interface Marginal {
  base_km2_30min: number;
  lines: Record<string, MarginalLine>;
}

export interface RankedLine extends MarginalLine {
  id: string;
}

export function rankCorridors(m: Marginal): RankedLine[] {
  const rows: RankedLine[] = Object.entries(m.lines).map(([id, l]) => ({ id, ...l }));
  rows.sort((a, b) => (b.km2_per_bcad ?? -1) - (a.km2_per_bcad ?? -1));
  return rows;
}

export function topCorridor(m: Marginal): RankedLine | null {
  const rows = rankCorridors(m);
  return rows.length > 0 ? rows[0] : null;
}

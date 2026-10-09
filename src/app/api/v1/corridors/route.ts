import { NextResponse } from "next/server";
import { readMarginal, readProposedLines, rankCorridors } from "@/lib/livable";

// GET /api/v1/corridors
// Proposed transit lines ranked by added 30-minute km² per billion
// dollars of budget. While the marginal analysis job is still running,
// returns status "computing" with the line metadata.
export async function GET() {
  const marginal = readMarginal();
  const lines = readProposedLines();
  if (!marginal) {
    return NextResponse.json({
      status: "computing",
      note: "Marginal km² analysis is still computing. Line metadata with published budgets below.",
      lines: lines.map((l) => ({
        id: l.id,
        name: l.name,
        name_fr: l.name_fr,
        mode: l.mode,
        length_km: l.length_km,
        budget_cad_b: l.budget_cad_b,
        budget_label: l.budget_label,
        budget_label_fr: l.budget_label_fr,
        status: l.status,
      })),
    });
  }
  return NextResponse.json({
    status: "ready",
    base_km2_30min: marginal.base_km2_30min,
    estimate: "modeled estimates",
    ranking: rankCorridors(marginal),
  });
}

import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Livable Area API",
    version: "1.0.0",
    description:
      "Modeled 30-minute travel-time isochrones from Union Station, Toronto, by transit and car, plus marginal analysis of proposed transit lines ranked by added km² per billion dollars of budget. All figures are modeled estimates. Source data: TTC and GO Transit GTFS, OpenStreetMap, 2021 Census (StatCan table 98-10-0015), published Metrolinx alignments and budgets. MIT licensed.",
  },
  servers: [{ url: "https://livable.canada.nshipyard.com/api/v1" }],
  paths: {
    "/isochrone": {
      get: {
        summary: "One modeled isochrone: mode, minutes, km², population when computed, polygon rings",
        parameters: [
          { name: "mode", in: "query", required: false, schema: { type: "string", default: "transit" }, description: "One of the available modes; car is still computing" },
          { name: "minutes", in: "query", required: false, schema: { type: "integer", default: 30, enum: [15, 30, 45, 60] } },
        ],
        responses: {
          "200": { description: "Isochrone record with rings as lists of [lon, lat]" },
          "400": { description: "Unknown mode or threshold" },
        },
      },
    },
    "/corridors": {
      get: {
        summary: "Proposed lines ranked by added 30-minute km² per billion dollars; fallback line metadata while computing",
        responses: { "200": { description: "status ready|computing plus ranking or line metadata" } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}

import { NextResponse } from "next/server";
import { readIsochrones, readMarginal, rankCorridors } from "@/lib/livable";

// Minimal MCP server over streamable HTTP (JSON-RPC 2.0 via POST).
// Supports: initialize, tools/list, tools/call. Stateless.

const SERVER = { name: "livable-area", version: "1.0.0" };

const TOOLS = [
  {
    name: "get_isochrone",
    description:
      "Modeled travel-time isochrone from Union Station, Toronto: km², population when computed, and polygon rings as [lon, lat] lists. All figures are modeled estimates. Car mode is still computing; transit is available.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", description: "transit (car still computing)", default: "transit" },
        minutes: { type: "integer", description: "threshold in minutes, one of 15, 30, 45, 60", default: 30 },
      },
    },
  },
  {
    name: "rank_corridors",
    description:
      "Proposed Toronto transit lines ranked by added 30-minute km² per billion dollars of budget (marginal isochrone analysis). Falls back to line metadata with published budgets while the marginal job computes. All figures are modeled estimates.",
    inputSchema: { type: "object", properties: {} },
  },
];

function ok(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function err(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function textResult(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function handle(msg: any) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return err(msg?.id ?? null, -32600, "Invalid Request");
  }
  const id = msg.id ?? null;
  switch (msg.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER,
      });
    case "notifications/initialized":
      return null;
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const { name, arguments: args } = msg.params ?? {};
      try {
        if (name === "get_isochrone") {
          const iso = readIsochrones();
          if (!iso) return err(id, -32000, "isochrone data not available");
          const modes = Object.keys(iso.modes);
          const mode = String(args.mode ?? modes[0] ?? "transit").toLowerCase();
          const minutes = parseInt(String(args.minutes ?? "30"), 10);
          if (!iso.modes[mode]) return err(id, -32602, `unknown mode "${mode}"; available: ${modes.join(", ")}`);
          if (!iso.meta.thresholds_min.includes(minutes))
            return err(id, -32602, `minutes must be one of ${iso.meta.thresholds_min.join(", ")}`);
          const t = iso.modes[mode][String(minutes)];
          return ok(
            id,
            textResult({ mode, minutes, km2: t.km2, population: t.population ?? null, rings: t.rings, estimate: "modeled estimate" })
          );
        }
        if (name === "rank_corridors") {
          const marginal = readMarginal();
          if (!marginal) return ok(id, textResult({ status: "computing", note: "Marginal km² analysis is still computing." }));
          return ok(
            id,
            textResult({
              status: "ready",
              base_km2_30min: marginal.base_km2_30min,
              estimate: "modeled estimates",
              ranking: rankCorridors(marginal),
            })
          );
        }
        return err(id, -32602, `Unknown tool ${name}`);
      } catch (e) {
        return err(id, -32000, `Tool error: ${(e as Error).message}`);
      }
    }
    default:
      return err(id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(err(null, -32700, "Parse error"), { status: 400 });
  }
  if (Array.isArray(body)) {
    const out = body.map(handle).filter((r) => r !== null);
    return NextResponse.json(out);
  }
  const out = handle(body);
  if (out === null) return new NextResponse(null, { status: 202 });
  return NextResponse.json(out);
}

export async function GET() {
  return NextResponse.json(
    { error: "This MCP server accepts JSON-RPC 2.0 via POST only." },
    { status: 405 }
  );
}

export async function DELETE() {
  return new NextResponse(null, { status: 405 });
}

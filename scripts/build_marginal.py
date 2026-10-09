"""
Step 4: Marginal analysis for proposed transit lines.

For each proposed line in data/proposed_lines.json:
- Add its stations as new stops with modeled ride edges
  (inter-station distance / assumed speed + dwell, from the JSON meta).
- Add walk-transfer edges from new stations to existing stops within 400 m.
- Re-run Dijkstra from Union Station; recompute the 30-min isochrone.
- Marginal km2, marginal population, km2 per $B of budget.

GO Expansion is a scenario, not new track: wait-per-boarding on GO boardings
drops from 4 to 2 minutes (documented in proposed_lines.json); all other
agencies keep the 4-minute wait. Base ride edges have the baked-in wait
stripped so each boarding is charged exactly once (parity with the main
transit graph).

Output: data/processed/marginal.json
"""
import json, math, os, sys
from collections import defaultdict
import heapq

sys.path.insert(0, os.path.dirname(__file__))
from build_transit_graph import hav_m, read_csv, pick_weekday_service, parse_feed, WALK_M_PER_MIN, TRANSFER_RADIUS_M, WAIT_MIN
from build_isochrones import compute_grid, grid_dims, marching_squares, CELL_KM

BASE = os.path.join(os.path.dirname(__file__), "..")
PROC = os.path.join(BASE, "data", "processed")
RAW = os.path.join(BASE, "data", "raw", "gtfs")

def build_base():
    all_stops, idmap, edges = {}, {}, {}
    for agency, sub in [("TTC", "ttc"), ("GO", "go")]:
        d = os.path.join(RAW, sub)
        stops, ed, sid = parse_feed(d, agency)
        for s, (lat, lon, name) in stops.items():
            gid = f"{agency}:{s}"
            idmap[(agency, s)] = gid
            all_stops[gid] = (lat, lon, name, agency)
        # parse_feed edges carry WAIT_MIN baked in; strip to pure in-vehicle
        # so wait is charged exactly once per boarding on arrive->board.
        for (a, b), w in ed.items():
            edges[(idmap[(agency, a)], idmap[(agency, b)])] = w - WAIT_MIN
    return all_stops, edges

def add_line(all_stops, edges, line, wait_min):
    """Add a proposed line's stations/edges. Returns (new_stops, new_edges)."""
    speeds = {"subway": 32.0, "lrt": 28.0}
    speed = speeds.get(line["mode"], 30.0)
    dwell = 0.5
    gid_of = {}
    for i, st in enumerate(line["stations"]):
        gid = f"NEW:{line['id']}:{i}"
        gid_of[i] = gid
        all_stops[gid] = (st["lat"], st["lon"], st["name"] + " (proposed)", "NEW")
    for i in range(len(line["stations"]) - 1):
        a, b = gid_of[i], gid_of[i+1]
        alat, alon = all_stops[a][0], all_stops[a][1]
        blat, blon = all_stops[b][0], all_stops[b][1]
        dkm = hav_m(alat, alon, blat, blon) / 1000.0
        t = dkm / speed * 60.0 + dwell
        edges[(a, b)] = t
        edges[(b, a)] = t
    return gid_of

def dijkstra(all_stops, edges, go_wait_min, origin):
    # wait per boarding: 2 min on GO-originating boardings under the
    # go-expansion scenario, 4 min everywhere else (incl. proposed stations).
    # Two-layer model: arrive->board pays the wait (one per vehicle
    # boarding); ride edges run board->board so staying aboard is free;
    # board->arrive is free (alighting); walk transfers run arrive->arrive.
    adj = defaultdict(list)
    for gid in all_stops:
        agency = all_stops[gid][3]
        wm = go_wait_min if agency == "GO" else WAIT_MIN
        adj[f"{gid}:arr"].append((f"{gid}:brd", wm))
        adj[f"{gid}:brd"].append((f"{gid}:arr", 0.0))
    for (a, b), w in edges.items():
        adj[f"{a}:brd"].append((f"{b}:brd", w))
    # transfers
    cell = 0.01
    grid = defaultdict(list)
    for gid, (lat, lon, _, _) in all_stops.items():
        grid[(int(lat/cell), int(lon/cell))].append(gid)
    for gid, (lat, lon, _, _) in all_stops.items():
        cx, cy = int(lat/cell), int(lon/cell)
        seen = set()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for o in grid.get((cx+dx, cy+dy), []):
                    if o == gid or o in seen:
                        continue
                    seen.add(o)
                    olat, olon, _, _ = all_stops[o]
                    d = hav_m(lat, lon, olat, olon)
                    if d <= TRANSFER_RADIUS_M:
                        adj[f"{gid}:arr"].append((f"{o}:arr", d / WALK_M_PER_MIN))
    INF = float("inf")
    dist = defaultdict(lambda: INF)
    start = f"{origin}:arr"
    dist[start] = 0.0
    pq = [(0.0, start)]
    while pq:
        du, u = heapq.heappop(pq)
        if du > dist[u]:
            continue
        for v, w in adj[u]:
            nd = du + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return {g: dist.get(f"{g}:arr", INF) for g in all_stops}

def iso_km2(all_stops, dist, thresholds=(30, 45)):
    pts = [(all_stops[g][0], all_stops[g][1], dist[g]) for g in all_stops if dist[g] < float("inf")]
    grid = compute_grid(pts, 1500, 0.0)
    nx, ny = grid_dims()
    out = {}
    for th in thresholds:
        cells = sum(1 for j in range(ny) for i in range(nx) if grid[j][i] is not None and grid[j][i] <= th)
        out[th] = round(cells * CELL_KM * CELL_KM, 1)
    return out

def main():
    print("building base graph...", flush=True)
    all_stops, edges = build_base()
    olat, olon = 43.6453, -79.3806
    origin = min(all_stops, key=lambda g: hav_m(olat, olon, all_stops[g][0], all_stops[g][1]))
    print("base dijkstra...", flush=True)
    base_dist = dijkstra(all_stops, edges, WAIT_MIN, origin)
    base = iso_km2(all_stops, base_dist)
    print(f"BASE 30-min: {base[30]} km2, 45-min: {base[45]} km2", flush=True)

    lines = json.load(open(os.path.join(BASE, "data", "proposed_lines.json")))["lines"]
    results = {"base_km2_30min": base[30], "base_km2_45min": base[45], "lines": {}}
    for line in lines:
        print(f"--- {line['id']} ---", flush=True)
        s2 = dict(all_stops); e2 = dict(edges)
        go_wm = 2.0 if line["id"] == "go-expansion" else WAIT_MIN
        if line["id"] != "go-expansion":
            add_line(s2, e2, line, WAIT_MIN)
        dist = dijkstra(s2, e2, go_wm, origin)
        km2 = iso_km2(s2, dist)
        marg30 = round(km2[30] - base[30], 1)
        marg45 = round(km2[45] - base[45], 1)
        b = line["budget_cad_b"]
        per_b = round(marg30 / b, 2) if b else None
        per_b45 = round(marg45 / b, 2) if b else None
        print(f"  {line['id']}: 30min {km2[30]} km2 (+{marg30}), 45min {km2[45]} km2 (+{marg45}), {per_b} km2/$B", flush=True)
        results["lines"][line["id"]] = {
            "name": line["name"], "name_fr": line["name_fr"],
            "budget_cad_b": b, "budget_label": line["budget_label"],
            "budget_label_fr": line["budget_label_fr"],
            "km2_30min": km2[30], "marginal_km2": marg30,
            "km2_per_bcad": per_b,
            "km2_45min": km2[45], "marginal_km2_45": marg45,
            "km2_per_bcad_45": per_b45, "status": line["status"],
        }
    json.dump(results, open(os.path.join(PROC, "marginal.json"), "w"), indent=1)
    print("wrote marginal.json", flush=True)

if __name__ == "__main__":
    main()

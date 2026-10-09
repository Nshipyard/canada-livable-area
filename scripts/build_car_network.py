"""
Step 2: OSM road network for the GTA, car travel times from Union Station.

Method (documented in docs/methodology.md):
- Drivable OSM network via osmnx for the Greater Toronto bbox.
- Speeds per highway class, rush-hour scenario: free-flow speed reduced by
  a congestion factor. Documented assumptions below (SPEEDS).
- Dijkstra from the network node nearest Union Station (43.6453, -79.3806).
- Output: data/processed/car_node_times.json
  { node_id: {lat, lon, time_min}, ... } plus meta.

Congestion scenario: weekday AM peak. Factors are explicit assumptions,
chosen so downtown-average speeds land near observed rush-hour conditions
(Toronto Transportation Services reports ~15-25 km/h on downtown arterials
at peak; the essay under test claims 15 km/h). Sensitivity: the page shows
what changes under free-flow too (documented as scenario B in the app).
"""
import json, os, sys
import osmnx as ox

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
os.makedirs(OUT, exist_ok=True)

# bbox as (west, south, east, north) per osmnx graph_from_bbox convention.
# Covers the 60-min car shed around Union Station.
BBOX = (-80.0, 43.25, -78.85, 44.05)  # west, south, east, north

# free-flow km/h by OSM highway class, then a peak congestion factor.
# Documented assumptions; sensitivity scenario in the app.
SPEEDS = {
    "motorway": 100, "motorway_link": 60,
    "trunk": 80, "trunk_link": 50,
    "primary": 60, "primary_link": 40,
    "secondary": 50, "secondary_link": 35,
    "tertiary": 45, "tertiary_link": 30,
    "unclassified": 40, "residential": 35, "living_street": 20,
    "service": 25,
}
CONGESTION = 0.55  # peak factor: effective speed = free_flow * factor

def main():
    ox.settings.use_cache = True
    # overpass-api.de rate-limits aggressively; kumi.systems is a public mirror.
    ox.settings.overpass_endpoint = "https://overpass.kumi.systems/api/interpreter"
    # ~625 km2 per sub-query: small enough for reliable Overpass responses
    # over dense GTA road network, large enough to keep the query count low.
    ox.settings.max_query_area_size = 625_000_000
    print("downloading OSM network (this takes a while)...", flush=True)
    G = ox.graph_from_bbox(BBOX, network_type="drive", simplify=True)
    print(f"graph: {len(G.nodes)} nodes, {len(G.edges)} edges", flush=True)
    # assign travel-time weights
    for u, v, k, d in G.edges(keys=True, data=True):
        hw = d.get("highway", "unclassified")
        if isinstance(hw, list):
            hw = hw[0]
        v_kmh = SPEEDS.get(hw, 35) * CONGESTION
        length_m = d.get("length", 1.0)
        d["time_min"] = length_m / 1000.0 / v_kmh * 60.0
    orig = ox.distance.nearest_nodes(G, -79.3806, 43.6453)
    print("origin node:", orig, flush=True)
    import heapq
    INF = float("inf")
    dist = {n: INF for n in G.nodes}
    dist[orig] = 0.0
    pq = [(0.0, orig)]
    while pq:
        du, u = heapq.heappop(pq)
        if du > dist[u]:
            continue
        for v, ed in G[u].items():
            w = min(e.get("time_min", INF) for e in ed.values())
            nd = du + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    out = {"meta": {
        "bbox": {"west": BBOX[0], "south": BBOX[1], "east": BBOX[2], "north": BBOX[3]},
        "origin": {"lat": 43.6453, "lon": -79.3806},
        "speeds_kmh": SPEEDS, "congestion_factor": CONGESTION,
        "scenario": "weekday AM peak (assumed)",
        "method": "Dijkstra over OSM drivable network, per-class speeds x congestion factor",
    }, "origin_node": orig,
        "nodes": {str(n): {"lat": round(G.nodes[n]["y"], 6), "lon": round(G.nodes[n]["x"], 6),
                            "time_min": round(dist[n], 2) if dist[n] < INF else None}
                  for n in G.nodes}}
    p = os.path.join(OUT, "car_node_times.json")
    # write compactly; file will be large
    json.dump(out, open(p, "w"), separators=(",", ":"))
    import os as _os
    print("wrote", p, round(_os.path.getsize(p)/1e6, 1), "MB", flush=True)

if __name__ == "__main__":
    main()

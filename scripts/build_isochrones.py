"""
Step 3: Grid-based isochrone computation.

Inputs:
- data/processed/transit_stop_times.json (per-stop minutes from Union Station)
- data/processed/car_node_times.json (per-node minutes, when ready)
- data/raw/da_geoms_gta.geojson + da_population_ont.json (population)

Method:
- 500 m grid over the study bbox. Each cell gets the minimum travel time:
  transit: min over stops within 1.5 km of (stop_time + walk cell<-stop at 4.8 km/h)
  car:     min over network nodes within 1.0 km of (node_time + 2 min access)
- Isochrone polygons via marching squares at 15/30/45/60 min.
- Area = cells within threshold x 0.25 km2. Population = DA centroids
  inside the 30-min polygon x DA population (uniform within DA).

Outputs (data/processed/):
- isochrones.json: {mode: {threshold_min: {km2, population, polygon:[[[lon,lat]...]]}}}
- grid_transit.json / grid_car.json: downsampled cell arrays for the app map
"""
import json, math, os, sys
from collections import defaultdict

BASE = os.path.join(os.path.dirname(__file__), "..")
PROC = os.path.join(BASE, "data", "processed")
RAW = os.path.join(BASE, "data", "raw")

LON0, LON1 = -80.0, -78.85
LAT0, LAT1 = 43.25, 44.05
CELL_KM = 0.5
WALK_M_PER_MIN = 80.0

def hav_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2-lat1); dl = math.radians(lon2-lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))

def cell_center(i, j):
    # i: lon index, j: lat index
    km_per_deg_lon = 111.32 * math.cos(math.radians(43.65))
    lon = LON0 + (i + 0.5) * CELL_KM / km_per_deg_lon
    lat = LAT0 + (j + 0.5) * CELL_KM / 111.32
    return lat, lon

def grid_dims():
    km_per_deg_lon = 111.32 * math.cos(math.radians(43.65))
    nx = int((LON1 - LON0) * km_per_deg_lon / CELL_KM)
    ny = int((LAT1 - LAT0) * 111.32 / CELL_KM)
    return nx, ny

def spatial_hash(points, cell_deg=0.02):
    """points: list of (lat, lon, idx). returns grid dict."""
    g = defaultdict(list)
    for lat, lon, idx in points:
        g[(int(lat/cell_deg), int(lon/cell_deg))].append((lat, lon, idx))
    return g

def nearby(hashg, lat, lon, radius_deg=0.02):
    cx, cy = int(lat/0.02), int(lon/0.02)
    out = []
    r = int(radius_deg/0.02) + 1
    for dx in range(-r, r+1):
        for dy in range(-r, r+1):
            out.extend(hashg.get((cx+dx, cy+dy), []))
    return out

def marching_squares(grid, nx, ny, threshold):
    """Extract contour polygons at threshold from a grid of values (inf = outside).
    Returns list of polygons, each a list of [lon, lat] rings."""
    # binary inside/outside
    inside = [[False]*nx for _ in range(ny)]
    for j in range(ny):
        row = grid[j]
        for i in range(nx):
            v = row[i]
            inside[j][i] = (v is not None and v <= threshold)
    # trace boundary edges, then chain into polygons
    # edge key: ((x1,y1),(x2,y2)) in grid coords; walk keeping inside on left
    from collections import defaultdict
    edges = defaultdict(list)  # point -> list of next points
    def pt(i, j):
        lat, lon = cell_center(i - 0.5, j - 0.5)  # corner coords
        return (round(lon, 6), round(lat, 6))
    for j in range(ny):
        for i in range(nx):
            if not inside[j][i]:
                continue
            # for each of 4 sides, if neighbor outside, add boundary edge
            # neighbor coords: left (i-1,j), right (i+1,j), down (i,j-1), up (i,j+1)
            # walk counterclockwise keeping inside on the left
            if i == 0 or not inside[j][i-1]:      # left edge: from bottom-left to top-left
                edges[pt(i, j)].append(pt(i, j+1))
            if i == nx-1 or not inside[j][i+1]:   # right edge: top-right to bottom-right
                edges[pt(i+1, j+1)].append(pt(i+1, j))
            if j == 0 or not inside[j-1][i]:      # bottom edge: bottom-right to bottom-left
                edges[pt(i+1, j)].append(pt(i, j))
            if j == ny-1 or not inside[j+1][i]:   # top edge: top-left to top-right
                edges[pt(i, j+1)].append(pt(i+1, j+1))
    # chain edges into rings
    rings = []
    while edges:
        start = next(iter(edges))
        ring = [start]
        cur = start
        while True:
            nxts = edges.get(cur)
            if not nxts:
                break
            nxt = nxts.pop(0)
            if not nxts:
                del edges[cur]
            if nxt == start:
                ring.append(nxt)
                break
            ring.append(nxt)
            cur = nxt
            if len(ring) > 200000:  # safety
                break
        if len(ring) >= 4:
            rings.append(ring)
    return rings

def compute_grid(stop_times, max_dist_m, access_min=0.0):
    """stop_times: list of (lat, lon, minutes). Returns grid of min minutes."""
    nx, ny = grid_dims()
    print(f"grid {nx}x{ny} = {nx*ny} cells", flush=True)
    hg = spatial_hash([(la, lo, k) for k, (la, lo, _) in enumerate(stop_times)])
    grid = [[None]*nx for _ in range(ny)]
    rdeg = max_dist_m / 111320.0 * 1.6
    for j in range(ny):
        if j % 40 == 0:
            print(f"  row {j}/{ny}", flush=True)
        for i in range(nx):
            lat, lon = cell_center(i, j)
            best = None
            for sla, slo, k in nearby(hg, lat, lon, rdeg):
                d = hav_m(lat, lon, sla, slo)
                if d <= max_dist_m:
                    t = stop_times[k][2] + d / WALK_M_PER_MIN + access_min
                    if best is None or t < best:
                        best = t
            grid[j][i] = best
    return grid

def main():
    modes = {}
    # transit
    t = json.load(open(os.path.join(PROC, "transit_stop_times.json")))
    tstops = [(s["lat"], s["lon"], s["time_min"]) for s in t["stops"].values() if s["time_min"] is not None]
    print(f"transit stops with times: {len(tstops)}", flush=True)
    modes["transit"] = (tstops, 1500, 0.0)
    # car (if ready)
    cp = os.path.join(PROC, "car_node_times.json")
    if os.path.exists(cp):
        c = json.load(open(cp))
        cnodes = [(n["lat"], n["lon"], n["time_min"]) for n in c["nodes"].values() if n["time_min"] is not None]
        print(f"car nodes with times: {len(cnodes)}", flush=True)
        modes["car"] = (cnodes, 1000, 2.0)
    else:
        print("car data not ready, skipping", flush=True)

    nx, ny = grid_dims()
    results = {"meta": {
        "cell_km": CELL_KM, "bbox": [LON0, LAT0, LON1, LAT1],
        "origin": {"lat": 43.6453, "lon": -79.3806, "name": "Union Station, Toronto"},
        "thresholds_min": [15, 30, 45, 60],
        "walk_speed_kmh": 4.8,
    }, "modes": {}}
    for mode, (pts, maxd, acc) in modes.items():
        print(f"=== {mode} ===", flush=True)
        grid = compute_grid(pts, maxd, acc)
        mres = {}
        for th in [15, 30, 45, 60]:
            cells_in = sum(1 for j in range(ny) for i in range(nx)
                           if grid[j][i] is not None and grid[j][i] <= th)
            km2 = round(cells_in * CELL_KM * CELL_KM, 1)
            print(f"  {th} min: {cells_in} cells = {km2} km2", flush=True)
            rings = marching_squares(grid, nx, ny, th)
            print(f"  {th} min: {len(rings)} rings", flush=True)
            mres[str(th)] = {"km2": km2, "rings": rings}
        # downsampled grid for the app map (only cells <= 75 min)
        small = []
        for j in range(0, ny, 2):
            for i in range(0, nx, 2):
                v = grid[j][i]
                if v is not None and v <= 75:
                    lat, lon = cell_center(i, j)
                    small.append([round(lon, 4), round(lat, 4), round(v, 1)])
        results["modes"][mode] = mres
        json.dump({"cells": small, "cell_km": CELL_KM*2},
                  open(os.path.join(PROC, f"grid_{mode}.json"), "w"))
        print(f"  wrote grid_{mode}.json ({len(small)} cells)", flush=True)
    json.dump(results, open(os.path.join(PROC, "isochrones.json"), "w"))
    print("wrote isochrones.json", flush=True)

if __name__ == "__main__":
    main()

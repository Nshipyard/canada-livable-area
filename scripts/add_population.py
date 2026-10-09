"""Step 3b: attribute 2021 Census population to isochrones.

For each mode/threshold polygon in data/processed/isochrones.json, sum the
2021 Census population of dissemination areas (DAs) whose centroid falls
inside the polygon (even-odd rule). Population comes from StatCan table
98-10-0015 (data/raw/da_population_ont.json, DAUID -> persons);
geometries from the cartographic boundary file (data/raw/da_geoms_gta.geojson).

Uniform-within-DA assumption is documented in docs/methodology.md.
Writes population back into isochrones.json in place.
"""
import json, os, sys

BASE = os.path.join(os.path.dirname(__file__), "..")
PROC = os.path.join(BASE, "data", "processed")
RAW = os.path.join(BASE, "data", "raw")

def centroid(geom):
    # average of exterior-ring vertices; cheap and fine for small DAs
    t = geom["type"]
    if t == "Polygon":
        ring = geom["coordinates"][0]
    else:  # MultiPolygon: first polygon's exterior ring
        ring = geom["coordinates"][0][0]
    xs = [c[0] for c in ring]; ys = [c[1] for c in ring]
    return sum(xs) / len(xs), sum(ys) / len(ys)

def ring_bbox(ring):
    xs = [c[0] for c in ring]; ys = [c[1] for c in ring]
    return min(xs), min(ys), max(xs), max(ys)

def point_in_ring(x, y, ring):
    # ray casting, even-odd
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside

def main():
    iso = json.load(open(os.path.join(PROC, "isochrones.json")))
    pop = json.load(open(os.path.join(RAW, "da_population_ont.json")))
    geo = json.load(open(os.path.join(RAW, "da_geoms_gta.geojson")))
    print(f"DAs with geometry: {len(geo['features'])}", flush=True)

    das = []  # (lon, lat, pop)
    missing = 0
    for f in geo["features"]:
        dauid = str(f["properties"].get("DAUID", ""))
        p = pop.get(dauid)
        if p is None:
            missing += 1
            continue
        lon, lat = centroid(f["geometry"])
        das.append((lon, lat, p))
    print(f"DAs joined to population: {len(das)} (no pop record: {missing})", flush=True)
    tot_pop = sum(p for _, _, p in das)
    print(f"total population in tiled DAs: {tot_pop:,}", flush=True)

    for mode, ths in iso["modes"].items():
        for th, entry in ths.items():
            rings = entry["rings"]
            rbs = [(ring_bbox(r), r) for r in rings]
            s = 0
            for lon, lat, p in das:
                if p == 0:
                    continue
                hits = 0
                for (x0, y0, x1, y1), r in rbs:
                    if x0 <= lon <= x1 and y0 <= lat <= y1 and point_in_ring(lon, lat, r):
                        hits += 1
                if hits % 2 == 1:
                    s += p
            entry["population"] = s
            print(f"  {mode} {th} min: {s:,} people", flush=True)
    json.dump(iso, open(os.path.join(PROC, "isochrones.json"), "w"))
    print("wrote isochrones.json with population", flush=True)

if __name__ == "__main__":
    main()

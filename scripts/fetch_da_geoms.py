"""Fetch 2021 Census DA boundaries for the study bbox from StatCan's
ArcGIS REST cartographic boundary service (MapServer layer 12), tiled so
no tile hits the server's 6000-record cap.

Source: https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/12
Output: data/raw/da_geoms_gta.geojson (DAUID -> Polygon/MultiPolygon)

Resumable: progress is checkpointed to data/raw/da_geoms_checkpoint.json
after each tile, so a failed run can be re-run to fill gaps.
The geo.statcan.gc.ca host 500s intermittently (roughly 1 in 3-5 calls),
so each tile retries with exponential backoff.
"""
import json, os, time, urllib.parse, urllib.request

BASE = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(BASE, "data", "raw")
OUT = os.path.join(RAW, "da_geoms_gta.geojson")
CKPT = os.path.join(RAW, "da_geoms_checkpoint.json")

LON0, LON1 = -80.0, -78.85
LAT0, LAT1 = 43.25, 44.05
TILES = 8  # 8x8 = 64 tiles, each ~115 km2, well under the 6000-record cap
URL = "https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/12/query"

def fetch(url, tries=12):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; open-data-research)"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except Exception as e:
            last = e
            wait = min(5 * 2 ** i, 120)
            print(f"  retry {i+1}/{tries} after {wait}s: {e}", flush=True)
            time.sleep(wait)
    raise RuntimeError(f"failed after {tries} tries: {last}")

def tile_params(x0, y0, x1, y1):
    pad = 0.002
    geom = {"xmin": x0 - pad, "ymin": y0 - pad, "xmax": x1 + pad, "ymax": y1 + pad,
            "spatialReference": {"wkid": 4326}}
    return {
        "where": "1=1",
        "geometry": json.dumps(geom),
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "DAUID",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
        "resultRecordCount": 6000,
    }

def main():
    seen = {}
    done_tiles = set()
    if os.path.exists(CKPT):
        ck = json.load(open(CKPT))
        seen = ck.get("features", {})
        done_tiles = set(ck.get("done_tiles", []))
        print(f"resuming: {len(seen)} DAs, {len(done_tiles)} tiles done", flush=True)
    dlon = (LON1 - LON0) / TILES
    dlat = (LAT1 - LAT0) / TILES
    failed = []
    for ix in range(TILES):
        for iy in range(TILES):
            tid = f"{ix},{iy}"
            if tid in done_tiles:
                continue
            x0, x1 = LON0 + ix * dlon, LON0 + (ix + 1) * dlon
            y0, y1 = LAT0 + iy * dlat, LAT0 + (iy + 1) * dlat
            try:
                data = fetch(URL + "?" + urllib.parse.urlencode(tile_params(x0, y0, x1, y1)))
            except RuntimeError as e:
                print(f"  TILE {tid} FAILED: {e}", flush=True)
                failed.append(tid)
                continue
            feats = data.get("features", [])
            if len(feats) >= 6000:
                print(f"  WARNING tile {tid} hit record cap; increase TILES", flush=True)
            for f in feats:
                dauid = str(f["properties"].get("DAUID", ""))
                if dauid and dauid not in seen:
                    seen[dauid] = {"type": "Feature",
                                   "properties": {"DAUID": dauid},
                                   "geometry": f["geometry"]}
            done_tiles.add(tid)
            json.dump({"features": seen, "done_tiles": sorted(done_tiles)}, open(CKPT, "w"))
            n = len(done_tiles)
            if n % 8 == 0:
                print(f"  {n}/64 tiles, {len(seen)} DAs", flush=True)
            time.sleep(1)
    print(f"done: {len(seen)} DAs, failed tiles: {failed}", flush=True)
    if not failed:
        fc = {"type": "FeatureCollection", "features": list(seen.values())}
        json.dump(fc, open(OUT, "w"))
        print(f"wrote {OUT}", flush=True)
        os.remove(CKPT)
    else:
        print("re-run to retry failed tiles", flush=True)

if __name__ == "__main__":
    main()

"""
Step 1: Parse TTC + GO GTFS feeds, build a transit travel-time graph,
run Dijkstra from Union Station, and emit per-stop travel times.

Method (documented in docs/methodology.md):
- Representative service: the weekday service_id with the most trips.
- Ride edges: for each consecutive stop pair on a trip, weight = median
  scheduled travel time across trips of that service.
- Transfer edges: stops within 400 m walking distance get bidirectional
  edges at 4.8 km/h walking speed.
- Boarding/wait: the graph has two layers per stop (ARRIVE and BOARD).
  arrive->board costs WAIT_MIN: one wait per vehicle boarding. Ride edges
  run board->board (staying aboard through intermediate stops costs no
  extra wait); board->arrive is free (alighting); walk transfers run
  arrive->arrive. The origin starts at ARRIVE, so the first boarding pays
  the wait like every other boarding. Documented assumption, applied
  uniformly.
- Origin: nearest stop to Union Station (43.6453, -79.3806).

Output: data/processed/transit_stop_times.json
  { stop_id: {lat, lon, time_min, agency}, ... }
  plus meta with feed dates, service ids, assumption record.
"""
import csv, json, math, os, sys
from collections import defaultdict
import heapq

RAW = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "gtfs")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
os.makedirs(OUT, exist_ok=True)

WALK_M_PER_MIN = 80.0  # 4.8 km/h
TRANSFER_RADIUS_M = 400.0
WAIT_MIN = 4.0

def hav_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1); dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))

def t2min(t):
    # GTFS times can exceed 24:00
    h, m, s = t.split(":")
    return int(h)*60 + int(m) + int(s)/60.0

def read_csv(path):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def pick_weekday_service(feed_dir):
    trips = read_csv(os.path.join(feed_dir, "trips.txt"))
    cal_path = os.path.join(feed_dir, "calendar.txt")
    if os.path.exists(cal_path):
        cal = read_csv(cal_path)
        monday_sids = {r["service_id"] for r in cal if r["monday"] == "1"}
    else:
        # fall back to calendar_dates.txt: pick a Monday date present in feed
        cds = read_csv(os.path.join(feed_dir, "calendar_dates.txt"))
        import datetime
        mondays = defaultdict(int)
        for r in cds:
            if r["exception_type"] != "1":
                continue
            d = r["date"]
            try:
                dt = datetime.date(int(d[:4]), int(d[4:6]), int(d[6:8]))
            except ValueError:
                continue
            if dt.weekday() == 0:
                mondays[r["service_id"]] += 1
        # service active on the most Mondays
        if not mondays:
            # last resort: most common service_id in calendar_dates
            for r in cds:
                if r["exception_type"] == "1":
                    mondays[r["service_id"]] += 1
        anchor = max(mondays, key=mondays.get)
        monday_sids = {anchor}
    counts = defaultdict(int)
    for t in trips:
        if t["service_id"] in monday_sids:
            counts[t["service_id"]] += 1
    sid = max(counts, key=counts.get)
    return sid, counts[sid]

def parse_feed(feed_dir, agency):
    print(f"[{agency}] parsing...", flush=True)
    sid, n = pick_weekday_service(feed_dir)
    print(f"[{agency}] weekday service {sid} with {n} trips", flush=True)
    stops = {}
    for r in read_csv(os.path.join(feed_dir, "stops.txt")):
        try:
            lat, lon = float(r["stop_lat"]), float(r["stop_lon"])
        except ValueError:
            continue
        stops[r["stop_id"]] = (lat, lon, r.get("stop_name",""))
    trips = read_csv(os.path.join(feed_dir, "trips.txt"))
    trip_ids = {t["trip_id"] for t in trips if t["service_id"] == sid}
    print(f"[{agency}] {len(stops)} stops, {len(trip_ids)} weekday trips", flush=True)
    # ride edges: (a,b) -> list of travel minutes
    # NOTE: GTFS files are not guaranteed sorted; sort by trip then sequence.
    ride = defaultdict(list)
    print(f"[{agency}] reading stop_times...", flush=True)
    st_rows = []
    with open(os.path.join(feed_dir, "stop_times.txt"), encoding="utf-8-sig") as f:
        rd = csv.DictReader(f)
        for r in rd:
            if r["trip_id"] not in trip_ids:
                continue
            try:
                seq = int(r["stop_sequence"])
                t = t2min(r["arrival_time"])
            except (ValueError, KeyError):
                continue
            st_rows.append((r["trip_id"], seq, r["stop_id"], t))
    st_rows.sort(key=lambda x: (x[0], x[1]))
    last_trip, last_stop, last_t = None, None, None
    for tid, seq, s, t in st_rows:
        if tid == last_trip and s != last_stop and last_t is not None:
            dt = t - last_t
            if 0 < dt < 180:
                ride[(last_stop, s)].append(dt)
        last_trip, last_stop, last_t = tid, s, t
    edges = {}
    for (a, b), times in ride.items():
        if a in stops and b in stops:
            times.sort()
            edges[(a, b)] = times[len(times)//2] + WAIT_MIN
    print(f"[{agency}] {len(edges)} ride edges", flush=True)
    return stops, edges, sid

def main():
    all_stops = {}   # gid -> (lat, lon, name, agency)
    adj = defaultdict(list)
    meta = {"feeds": {}, "assumptions": {
        "walk_speed_kmh": 4.8, "transfer_radius_m": TRANSFER_RADIUS_M,
        "wait_per_boarding_min": WAIT_MIN,
        "origin": "nearest stop to Union Station 43.6453,-79.3806",
        "service": "weekday service_id with most trips per feed",
        "edge_weight": "median scheduled in-vehicle minutes; one wait charged per boarding via arrive/board node layers",
    }}
    for agency, sub in [("TTC", "ttc"), ("GO", "go")]:
        d = os.path.join(RAW, sub)
        if not os.path.isdir(d):
            print(f"[{agency}] missing, skipping", flush=True)
            continue
        stops, edges, sid = parse_feed(d, agency)
        meta["feeds"][agency] = {"service_id": sid, "dir": sub}
        idmap = {}
        for s, (lat, lon, name) in stops.items():
            gid = f"{agency}:{s}"
            idmap[s] = gid
            all_stops[gid] = (lat, lon, name, agency)
        # Two-layer graph: each stop has an ARRIVE node and a BOARD node.
        # arrive -> board costs WAIT_MIN: exactly one wait per vehicle
        # boarding. Ride edges run board -> board, so staying aboard through
        # intermediate stops costs no extra wait; board -> arrive is free
        # (alighting); walk transfers run arrive -> arrive.
        for gid in all_stops:
            adj[f"{gid}:arr"].append((f"{gid}:brd", WAIT_MIN))
            adj[f"{gid}:brd"].append((f"{gid}:arr", 0.0))
        for (a, b), w in edges.items():
            adj[f"{idmap[a]}:brd"].append((f"{idmap[b]}:brd", w - WAIT_MIN))
    # transfer edges via spatial grid
    print("building transfer edges...", flush=True)
    cell = 0.01
    grid = defaultdict(list)
    for gid, (lat, lon, _, _) in all_stops.items():
        grid[(int(lat/cell), int(lon/cell))].append(gid)
    n_transfer = 0
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
                        w = d / WALK_M_PER_MIN
                        adj[f"{gid}:arr"].append((f"{o}:arr", w))
                        n_transfer += 1
    print(f"{n_transfer} transfer edges", flush=True)
    # origin: nearest stop to Union Station; start at its ARRIVE node so the
    # first boarding pays the wait like every other boarding.
    olat, olon = 43.6453, -79.3806
    origin = min(all_stops, key=lambda g: hav_m(olat, olon, all_stops[g][0], all_stops[g][1]))
    print("origin:", origin, all_stops[origin][2], flush=True)
    # Dijkstra over layered nodes
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
    # collapse to per-stop times (arrive layer)
    stop_dist = {}
    for g in all_stops:
        stop_dist[g] = dist.get(f"{g}:arr", INF)
    reached = sum(1 for v in stop_dist.values() if v < INF)
    print(f"reached {reached}/{len(all_stops)} stops", flush=True)
    out = {"meta": meta, "origin": {"stop": origin, "lat": olat, "lon": olon},
           "stops": {g: {"lat": round(all_stops[g][0], 6), "lon": round(all_stops[g][1], 6),
                          "name": all_stops[g][2], "agency": all_stops[g][3],
                          "time_min": round(stop_dist[g], 2) if stop_dist[g] < INF else None}
                     for g in all_stops}}
    p = os.path.join(OUT, "transit_stop_times.json")
    json.dump(out, open(p, "w"))
    print("wrote", p, flush=True)

if __name__ == "__main__":
    main()

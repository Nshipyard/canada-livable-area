# Methodology: Livable Area

Every figure on this site is a **modeled estimate**, not a measurement. The pipeline builds travel-time
surfaces from published schedules and modeled road speeds, draws isochrone polygons at 15/30/45/60 minutes,
and compares proposed transit lines by how much 30-minute land each billion dollars buys.

## 1. Transit graph (scripts/build_transit_graph.py)

- GTFS, the schedule data format transit agencies publish. Feeds: TTC and GO Transit; GO Transit is run by
  Metrolinx, Ontario's regional transit agency.
- Representative service: the weekday service_id with the most trips in each feed.
- Ride edges: between consecutive stops on a trip, weight = median scheduled in-vehicle minutes across trips
  of that service.
- Transfer edges: stops within 400 m walking distance get bidirectional edges at 4.8 km/h walking speed.
- Boarding wait: the graph has two layers per stop (ARRIVE and BOARD). arrive->board costs 4 minutes: one wait
  per vehicle boarding. Ride edges run board->board, so staying aboard through intermediate stops costs no extra
  wait; board->arrive is free (alighting); walk transfers run arrive->arrive. The origin starts at ARRIVE, so the
  first boarding pays the wait like every other boarding. Documented assumption, applied uniformly. (Earlier
  versions of this build charged the wait at every intermediate stop; that bug is fixed.)
- Origin: the stop nearest Union Station (43.6453, -79.3806). Shortest paths from it are computed with Dijkstra.

Output: `data/processed/transit_stop_times.json` (per-stop minutes from Union Station, plus a meta record with
feed dates, service ids, and the assumption record).

## 2. Car network (scripts/build_car_network.py)

- OSM, the OpenStreetMap drivable road network for the Greater Toronto bbox (lat 43.25-44.05, lon -80.0 to -78.85).
- Rush-hour speeds per highway class, free-flow km/h then multiplied by a 0.55 congestion factor:
  motorway 100, motorway_link 60, trunk 80, trunk_link 50, primary 60, primary_link 40, secondary 50,
  secondary_link 35, tertiary 45, tertiary_link 30, unclassified 40, residential 35, living_street 20, service 25.
- Effective speed = free-flow × 0.55 (weekday AM peak scenario). The factor is an explicit assumption, chosen
  so downtown-average speeds land near observed rush-hour conditions (Toronto Transportation Services reports
  ~15-25 km/h on downtown arterials at peak).
- Dijkstra from the network node nearest Union Station.
- Output: `data/processed/car_node_times.json` (per-node minutes from Union Station, plus meta).

## 3. Isochrones (scripts/build_isochrones.py)

- 500 m grid over the study bbox (lon -80.0 to -78.85, lat 43.25 to 44.05).
- Each cell gets the minimum travel time:
  - transit: minimum over stops within 1.5 km of (stop_time + walk time from cell to stop at 4.8 km/h);
  - car: minimum over network nodes within 1.0 km of (node_time + 2 minutes access).
- Isochrone polygons via marching squares at 15, 30, 45, and 60 minutes.
- Area = number of cells within the threshold × 0.25 km².
- Population = sum of 2021 Census DA populations for dissemination areas (DAs, StatCan's smallest census
  geography) whose centroid falls inside the 30-minute polygon (even-odd rule), assuming population is uniform
  within each DA. DA populations come from StatCan table 98-10-0015; geometries from StatCan's cartographic
  boundary service (MapServer layer 12, tiled to stay under the 6,000-record cap). See scripts/fetch_da_geoms.py
  and scripts/add_population.py.

Outputs: `data/processed/isochrones.json` (`{mode: {threshold_min: {km2, population, rings}}}` where rings are
lists of `[lon, lat]` polygons), plus downsampled `grid_transit.json` / `grid_car.json` cell arrays.

## 4. Marginal analysis (scripts/build_marginal.py)

For each proposed line in `data/proposed_lines.json`:

- Its stations are added to the transit graph as new stops with modeled ride edges: inter-station distance
  divided by assumed average speed (32 km/h subway, 28 km/h LRT, from the JSON meta) plus 0.5 minute dwell
  per station.
- Walk-transfer edges are added from new stations to existing stops within 400 m.
- Dijkstra is re-run from Union Station and the 30-minute isochrone re-measured.
- Marginal km² = with-line 30-min km² minus base 30-min km²; km² per $B = marginal km² divided by the line's
  budget in billions of Canadian dollars.
- GO Expansion is a scenario, not new track: the wait per boarding on GO boardings drops from 4 to 2 minutes;
  all other agencies keep the 4-minute wait. Each boarding is charged exactly once, in parity with the main
  transit graph's two-layer design.
- Station coordinates are approximate (nearest major intersection, ±300 m) from published Metrolinx alignments.
- Budgets are publicly reported figures with source and date, labeled per line; definitions vary (build-only
  vs build plus 30-year operate).

Output: `data/processed/marginal.json` (`{base_km2_30min, lines: {id: {name, name_fr, budget_cad_b,
budget_label, budget_label_fr, km2_30min, marginal_km2, km2_per_bcad, status}}}`).

## 5. Limitations

- Schedules change; congestion varies; station positions are approximate. Treat km² figures as
  order-of-magnitude comparisons between corridors, not measurements of anything built.
- The 4-minute per-boarding wait is a uniform documented assumption, not observed headways per line.
- The 0.55 congestion factor is a scenario choice, not a measurement of a particular day's traffic.
- Population attribution assumes uniform density within each dissemination area.
- Budgets use each line's published definition and are not normalized across lines.

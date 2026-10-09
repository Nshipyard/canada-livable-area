# Livable Area

How much of Toronto is within 30 minutes? This project draws modeled travel-time isochrones from
Union Station, Toronto, by transit and by car, then ranks the proposed transit lines by how much
30-minute land each billion dollars buys.

Live: https://livable.canada.nshipyard.com

## Headline numbers (filled from `public/data/*.json` at build time; all are modeled estimates)

<!-- BUILD-TIME NUMBERS: refreshed from the JSON data files on every build. Do not hand-edit. -->

- **30-minute transit isochrone:** 82.5 km² (Union Station, modeled estimate)
- **30-minute car isochrone:** 339.5 km², rush-hour scenario (Union Station, modeled estimate)
- **Population inside the 30-minute isochrone:** 707,122 by transit, 1,766,576 by car (2021 Census, StatCan table 98-10-0015)
- **Top corridor by added 30-minute km² per billion dollars:** GO Expansion (frequency uplift): 1.31 km²/$B, +17.7 km² on a C$13.5B budget (modeled estimates)

## Screenshots

![Hero and stats](screenshots/desktop-en.png)
![Interactive isochrone map](screenshots/desktop-en.png)
![Mobile view](screenshots/mobile-en.png)

## Data sources

- **Transit:** TTC and GO Transit GTFS schedule feeds (representative weekday service). GO Transit is run by
  Metrolinx, Ontario's regional transit agency.
- **Roads:** OpenStreetMap drivable network for the Greater Toronto bbox, with rush-hour speeds per highway
  class multiplied by a 0.55 congestion factor.
- **Population:** 2021 Census dissemination areas (DAs, StatCan's smallest census geography), StatCan table
  98-10-0015, DA boundaries via geo.statcan.gc.ca.
- **Proposed lines:** published Metrolinx alignments (station coordinates approximate, ±300 m) and
  per-line budget figures with sources, labeled in `public/data/proposed_lines.json`.

## Method

1. Build a transit travel-time graph from GTFS: median scheduled in-vehicle minutes between consecutive stops,
   400 m walk transfers at 4.8 km/h, and a two-layer arrive/board graph so the 4-minute wait is charged once per
   vehicle boarding (staying aboard through intermediate stops is free). Dijkstra from Union Station.
2. Build a car network from OSM with per-class rush-hour speeds and a 0.55 congestion factor. Dijkstra from the
   network node nearest Union Station.
3. 500 m grid over the study bbox; each cell takes the minimum cell time (transit: stop time + walk; car: node
   time + 2-minute access). Marching squares at 15/30/45/60 minutes gives the polygons; area = cells × 0.25 km².
4. For each proposed line, add its stations with modeled ride times, re-run routing, and re-measure the 30-minute
   isochrone. Marginal km² ÷ budget in billions of dollars gives the km²-per-$B ranking. GO Expansion is a
   frequency scenario, not new track: the per-boarding wait on GO boardings drops from 4 to 2 minutes.

Full detail: [docs/methodology.md](docs/methodology.md). Everything on the site is a modeled estimate.

## API

- `GET /api/v1/isochrone?mode=transit&minutes=30`: one modeled isochrone: mode, minutes, km², population
  when computed, and the polygon rings as `[lon, lat]` lists.
- `GET /api/v1/corridors`: proposed lines ranked by added 30-minute km² per billion dollars, with the base
  isochrone. Returns line metadata with a `"computing"` status while the marginal job runs.
- `GET /api/openapi.json`: OpenAPI 3.1 spec.
- `POST /mcp`: MCP server (streamable HTTP, JSON-RPC 2.0) with tools `get_isochrone`, `rank_corridors`.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npx tsc --noEmit
npm run build
```

## Data pipeline

The scripts in `scripts/` rebuild the data files; outputs land in `data/processed/` and are copied to
`public/data/`:

```bash
python3 scripts/build_transit_graph.py   # GTFS -> per-stop minutes from Union Station
python3 scripts/build_car_network.py     # OSM -> per-node car minutes (long download)
python3 scripts/build_isochrones.py      # grid + marching squares -> isochrones.json
python3 scripts/build_marginal.py        # proposed lines -> marginal.json
python3 scripts/add_population.py        # DA centroids -> population in isochrones.json
```

## Author

Built by Richardson Dackam · [X](https://x.com/richardsondx) · [GitHub](https://github.com/Nshipyard)

## License

MIT. An open-source civic project, not affiliated with the Government of Canada or the City of Toronto.

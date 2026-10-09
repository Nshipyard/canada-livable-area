"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "en" | "fr";

const en = {
  banner: {
    line: "An open-source civic project. Not affiliated with the Government of Canada or the City of Toronto.",
    badge: "Open source",
  },
  nav: {
    map: "Map",
    corridors: "Corridors",
    methodology: "Methodology",
    developers: "Developers",
    data: "Data",
    back: "All projects",
  },
  brand: { eyebrow: "Open Nshipyard", title: "Livable Area" },
  hero: {
    kicker: "Open Nshipyard Canada",
    title: "How much of Toronto is within 30 minutes?",
    sub: "Affordability is a geometry problem: a home only counts if you can get to work from it. These modeled isochrones measure the square kilometres of the Toronto area reachable from Union Station within 15, 30, 45, or 60 minutes by transit or by car, then rank the proposed transit lines by how much 30-minute land each billion dollars buys.",
    cta1: "See the map",
    cta2: "Read the methodology",
  },
  stats: {
    km2Label: "km² reachable within 30 min of Union Station by {mode} (modeled estimate)",
    populationLabel: "people inside the 30-min {mode} isochrone, 2021 Census (modeled estimate)",
    computingLabel: "{name} isochrones are still computing; the download updates when they land.",
    corridorLabel: "added 30-min km² per $B of budget for {name} (modeled estimate)",
    corridorPendingLabel: "proposed lines whose marginal km² analysis is still computing",
  },
  map: {
    kicker: "Map",
    title: "Draw the city you can reach.",
    body: "Pick a mode and a time budget. The red shape is the modeled isochrone: the land from which Union Station is reachable within that time. Toggle the proposed lines to see where their stations would land.",
    mode: "Mode",
    modes: { transit: "Transit", car: "Car" },
    carComputing: "Car isochrones are still computing.",
    minutes: "Travel time",
    min: "min",
    lines: "Proposed lines",
    linesToggle: "Proposed lines",
    legendKm2: "km² inside",
    legendPop: "population inside",
    origin: "Union Station",
    station: "proposed station",
    estimated: "Modeled estimate",
    note: "Rings are modeled estimates from scheduled GTFS times and modeled road speeds, not measurements of a real trip.",
  },
  corridors: {
    kicker: "Corridors",
    title: "Which proposed line buys the most livable land?",
    body: "For each proposed line, the build adds its stations to the transit graph with modeled ride times, re-runs routing from Union Station, and re-measures the 30-minute isochrone. Marginal km² divided by budget in billions of dollars gives the ranking. Every figure is a modeled estimate; budgets use each line's published definition.",
    rank: "Rank",
    corridor: "Corridor",
    addedKm2: "Added 30-min km²",
    budget: "Budget (C$B)",
    perB: "km² per $B",
    status: "Status",
    base: "Base 30-min isochrone: {km2} km² by transit (modeled estimate).",
    pending:
      "Marginal km² analysis is still computing. The table below lists the proposed lines with their published budgets; the ranking appears when the background job finishes.",
    statusMap: { "under construction": "Under construction", "phased delivery": "Phased delivery" } as Record<string, string>,
  },
  methodology: {
    kicker: "Methodology",
    title: "How the isochrones were built, and where they are weak.",
    items: [
      "Transit travel times come from GTFS, the schedule data format transit agencies publish. The build uses the TTC and GO Transit feeds; GO Transit is run by Metrolinx, Ontario's regional transit agency. Service is the weekday service_id with the most trips in each feed, the representative weekday. Between consecutive stops, edges use median scheduled in-vehicle minutes across trips of that service.",
      "Transfers: stops within 400 metres are connected with walk edges at 4.8 km/h. The graph has two layers per stop (arrive and board): arriving then boarding a vehicle costs one 4-minute wait, staying aboard through intermediate stops costs no extra wait, alighting is free, and walk transfers run arrive to arrive. The origin starts at arrive, so the first boarding pays the wait like every other boarding.",
      "Car travel times come from OSM, the OpenStreetMap drivable road network for the Greater Toronto bbox, with rush-hour speeds per highway class (motorway 100 down to service 25 km/h free-flow) multiplied by a 0.55 congestion factor. Routing is Dijkstra from the network node nearest Union Station.",
      "The grid: 500 m cells over lon -80.0 to -78.85, lat 43.25 to 44.05. Each cell takes the minimum of stop time plus walk (transit, 1.5 km catchment) or node time plus 2-minute access (car, 1.0 km catchment). Isochrone polygons come from marching squares at 15, 30, 45, and 60 minutes; area equals cells inside the threshold times 0.25 km².",
      "Population comes from DA centroids: DA means dissemination area, StatCan's smallest census geography. 2021 Census counts (StatCan table 98-10-0015) are summed for DAs whose centroid falls inside the 30-minute polygon, assuming population is uniform within each DA.",
      "Proposed lines: station coordinates are approximate (nearest major intersection, ±300 m). Travel times are modeled as inter-station distance divided by assumed speed (32 km/h subway, 28 km/h LRT) plus 0.5 minute dwell per station. GO Expansion is a scenario, not new track: the per-boarding wait on GO boardings drops from 4 to 2 minutes. Budgets are publicly reported figures with source and date; definitions vary (build-only vs build plus 30-year operate) and are labeled per line.",
      "Everything on this page is a modeled estimate. Schedules change, congestion varies, station positions are approximate. Treat the km² figures as order-of-magnitude comparisons between corridors, not measurements of anything built.",
    ],
  },
  developers: {
    kicker: "For developers",
    title: "Query it from code, or from an agent.",
    body: "Three consumption paths, same modeled data. REST for applications, OpenAPI for integration, MCP tools over streamable HTTP for AI agents.",
    endpoints: "Endpoints",
    tryIt: "Try it",
    openapi: "OpenAPI spec",
    mcpTitle: "MCP server",
    mcpBody: "One streamable-HTTP endpoint. Tools: get_isochrone, rank_corridors.",
  },
  mcp: {
    kicker: "Connect your agent",
    title: "Put this data to work inside your AI tools.",
    body: "Pick your harness, copy the prompt, send it to your agent. Your agent runs the setup itself.",
    tabs: { chatgpt: "ChatGPT", claude: "Claude", claudecode: "Claude Code", cli: "CLI", other: "Other" },
    cardTitle: "Copy and send this to {tab}",
    copy: "Copy",
    copied: "Copied",
    chatgptNote: "ChatGPT connects through the documented REST API rather than MCP directly.",
    pChatgpt:
      "I want to use the {displayName} through its API.\n- OpenAPI spec: {origin}/api/openapi.json\n- REST base: {origin}/api/v1\nFirst tell me in two sentences what this API offers, then {exampleLower}, and show me the result.",
    pClaude:
      "In Claude (claude.ai), open Settings, then Connectors, and add a custom connector:\n- Name: {displayName}\n- URL: {origin}/mcp\nThen list the available tools, {exampleLower}, and show me the result.",
    pClaudeCode:
      "Set up the {displayName} MCP server so I can query it from here.\n1. Run: claude mcp add --transport http {slug} {origin}/mcp\n2. Run `claude mcp list` to confirm it connected.\n3. {example}, and show me the result.",
    pCli:
      "# MCP endpoint (streamable HTTP)\n{origin}/mcp\n\n# List the available tools\ncurl -s -X POST {origin}/mcp -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
    otherTitle: "Everything else",
    otherBody: "Any harness that speaks MCP over streamable HTTP, or plain REST.",
    mcpEndpoint: "MCP endpoint",
    openapiSpec: "OpenAPI spec",
    restBase: "REST base",
  },
  downloads: {
    kicker: "Data",
    title: "Take the files.",
    body: "The modeled isochrones, proposed-line stations, and marginal km² analysis, MIT licensed, as JSON.",
    files: [
      { name: "isochrones.json", desc: "Modeled isochrone polygons by mode and threshold (15/30/45/60 min), with km² and population" },
      { name: "proposed_lines.json", desc: "Four proposed transit lines: stations, modeled speeds, published budgets with sources" },
    ],
    marginal: { name: "marginal.json", desc: "Per-line marginal 30-minute km² and km² per billion dollars" },
    download: "Download",
  },
  footer: {
    line: "An open-source civic project. Not affiliated with the Government of Canada or the City of Toronto.",
    sources:
      "Transit: TTC and GO Transit GTFS schedule feeds. Roads: OpenStreetMap drivable network. Population: 2021 Census, StatCan table 98-10-0015, dissemination-area boundaries via geo.statcan.gc.ca. Proposed lines and budgets: published Metrolinx alignments and per-line budget sources, labeled in the data files.",
    builtBy: "Built by Richardson Dackam",
  },
};

export type Dict = typeof en;

const fr: Dict = {
  banner: {
    line: "Un projet civique à code source ouvert. Sans affiliation avec le gouvernement du Canada ni la Ville de Toronto.",
    badge: "Code source ouvert",
  },
  nav: {
    map: "Carte",
    corridors: "Corridors",
    methodology: "Méthodologie",
    developers: "Développeurs",
    data: "Données",
    back: "Tous les projets",
  },
  brand: { eyebrow: "Open Nshipyard", title: "Livable Area" },
  hero: {
    kicker: "Open Nshipyard Canada",
    title: "Combien de Toronto tient en 30 minutes ?",
    sub: "L'abordabilité est un problème de géométrie : un logement ne compte que si l'on peut se rendre au travail depuis chez soi. Ces isochrones modélisées mesurent les kilomètres carrés de la région de Toronto accessibles depuis la gare Union en 15, 30, 45 ou 60 minutes en transport en commun ou en voiture, puis classent les lignes de transport en commun proposées selon les kilomètres carrés de 30 minutes que chaque milliard de dollars achète.",
    cta1: "Voir la carte",
    cta2: "Lire la méthodologie",
  },
  stats: {
    km2Label: "km² accessibles en 30 min depuis la gare Union en {mode} (estimation modélisée)",
    populationLabel: "personnes dans l'isochrone de 30 min en {mode}, recensement 2021 (estimation modélisée)",
    computingLabel: "Les isochrones {name} sont en cours de calcul; le téléchargement sera mis à jour à leur arrivée.",
    corridorLabel: "km² de 30 min ajoutés par G$ de budget pour {name} (estimation modélisée)",
    corridorPendingLabel: "lignes proposées dont l'analyse marginale en km² est en cours de calcul",
  },
  map: {
    kicker: "Carte",
    title: "Dessinez la ville que vous pouvez atteindre.",
    body: "Choisissez un mode et un budget de temps. La forme rouge est l'isochrone modélisée : le terrain d'où la gare Union est accessible dans ce délai. Activez les lignes proposées pour voir où leurs stations se trouveraient.",
    mode: "Mode",
    modes: { transit: "Transport en commun", car: "Voiture" },
    carComputing: "Les isochrones en voiture sont en cours de calcul.",
    minutes: "Temps de trajet",
    min: "min",
    lines: "Lignes proposées",
    linesToggle: "Lignes proposées",
    legendKm2: "km² à l'intérieur",
    legendPop: "population à l'intérieur",
    origin: "Gare Union",
    station: "station proposée",
    estimated: "Estimation modélisée",
    note: "Les anneaux sont des estimations modélisées à partir des horaires GTFS et de vitesses routières modélisées, pas des mesures d'un trajet réel.",
  },
  corridors: {
    kicker: "Corridors",
    title: "Quelle ligne proposée achète le plus de terrain vivable ?",
    body: "Pour chaque ligne proposée, la construction ajoute ses stations au graphe de transport avec des temps de parcours modélisés, relance le routage depuis la gare Union et remesure l'isochrone de 30 minutes. Les km² marginaux divisés par le budget en milliards de dollars donnent le classement. Tous les chiffres sont des estimations modélisées; les budgets utilisent la définition publiée de chaque ligne.",
    rank: "Rang",
    corridor: "Corridor",
    addedKm2: "km² de 30 min ajoutés",
    budget: "Budget (G$ CA)",
    perB: "km² par G$",
    status: "Statut",
    base: "Isochrone de base de 30 min : {km2} km² en transport en commun (estimation modélisée).",
    pending:
      "L'analyse des km² marginaux est en cours de calcul. Le tableau ci-dessous liste les lignes proposées avec leurs budgets publiés; le classement paraîtra quand le calcul de fond sera terminé.",
    statusMap: { "under construction": "En construction", "phased delivery": "Livraison par phases" } as Record<string, string>,
  },
  methodology: {
    kicker: "Méthodologie",
    title: "Comment les isochrones ont été construites, et où elles sont faibles.",
    items: [
      "Les temps de trajet en transport en commun viennent de GTFS, le format de données d'horaires que publient les sociétés de transport. La construction utilise les flux de la TTC et de GO Transit; GO Transit est exploité par Metrolinx, l'agence régionale de transport de l'Ontario. Le service retenu est le service_id de semaine comptant le plus de voyages dans chaque flux, la semaine représentative. Entre deux arrêts consécutifs, les arêtes utilisent la médiane des minutes de parcours prévues sur les voyages de ce service.",
      "Correspondances : les arrêts distants de 400 mètres ou moins sont reliés par des arêtes de marche à 4,8 km/h. Le graphe a deux couches par arrêt (arrivée et montée) : arriver puis monter dans un véhicule coûte une attente de 4 minutes, rester à bord aux arrêts intermédiaires ne coûte aucune attente supplémentaire, la descente est gratuite, et les correspondances à pied relient arrivée à arrivée. L'origine commence à arrivée : la première montée paie donc l'attente comme toute autre montée.",
      "Les temps de trajet en voiture viennent d'OSM, le réseau routier d'OpenStreetMap pour le grand Toronto, avec des vitesses d'heure de pointe par classe de route (autoroute 100 jusqu'à voie de desserte 25 km/h en vitesse libre) multipliées par un facteur de congestion de 0,55. Le routage est un Dijkstra depuis le nœud du réseau le plus proche de la gare Union.",
      "La grille : des cellules de 500 m sur lon -80,0 à -78,85, lat 43,25 à 44,05. Chaque cellule prend le minimum du temps d'arrêt plus la marche (transport en commun, rayon de 1,5 km) ou du temps de nœud plus 2 minutes d'accès (voiture, rayon de 1,0 km). Les polygones d'isochrones viennent des carrés marchants à 15, 30, 45 et 60 minutes; la superficie égale les cellules sous le seuil multipliées par 0,25 km².",
      "La population vient des centroïdes d'AD : AD signifie aire de diffusion, la plus petite géographie de recensement de StatCan. Les chiffres du recensement 2021 (tableau 98-10-0015 de StatCan) sont additionnés pour les AD dont le centroïde tombe dans le polygone de 30 minutes, en supposant une population uniforme dans chaque AD.",
      "Lignes proposées : les coordonnées des stations sont approximatives (intersection principale la plus proche, ±300 m). Les temps de parcours sont modélisés comme la distance entre stations divisée par une vitesse supposée (32 km/h métro, 28 km/h TLR) plus 0,5 minute de battement par station. L'expansion de GO est un scénario, pas une nouvelle voie : l'attente par montée sur les montées GO passe de 4 à 2 minutes. Les budgets sont des chiffres publiés avec source et date; les définitions varient (construction seule contre construction plus 30 ans d'exploitation) et sont indiquées par ligne.",
      "Tout sur cette page est une estimation modélisée. Les horaires changent, la congestion varie, les positions des stations sont approximatives. Traitez les chiffres en km² comme des comparaisons d'ordre de grandeur entre corridors, pas comme des mesures de quoi que ce soit de construit.",
    ],
  },
  developers: {
    kicker: "Pour les développeurs",
    title: "Interrogez-la depuis du code, ou depuis un agent.",
    body: "Trois façons de consommer les mêmes données modélisées. REST pour les applications, OpenAPI pour l'intégration, outils MCP en HTTP continu pour les agents IA.",
    endpoints: "Points de terminaison",
    tryIt: "Essayer",
    openapi: "Spécification OpenAPI",
    mcpTitle: "Serveur MCP",
    mcpBody: "Un point de terminaison HTTP continu. Outils : get_isochrone, rank_corridors.",
  },
  mcp: {
    kicker: "Connectez votre agent",
    title: "Exploitez ces données dans vos outils d'IA.",
    body: "Choisissez votre plateforme, copiez l'invite, envoyez-la à votre agent. Votre agent exécute la configuration lui-même.",
    tabs: { chatgpt: "ChatGPT", claude: "Claude", claudecode: "Claude Code", cli: "CLI", other: "Autre" },
    cardTitle: "Copiez et envoyez ceci à {tab}",
    copy: "Copier",
    copied: "Copié",
    chatgptNote: "ChatGPT se connecte via l'API REST documentée plutôt que directement en MCP.",
    pChatgpt:
      "Je veux utiliser {displayName} via son API.\n- Spécification OpenAPI : {origin}/api/openapi.json\n- Base REST : {origin}/api/v1\nD'abord, dis-moi en deux phrases ce que cette API offre, puis {exampleLower}, et montre-moi le résultat.",
    pClaude:
      "Dans Claude (claude.ai), ouvre les paramètres, puis Connecteurs, et ajoute un connecteur personnalisé :\n- Nom : {displayName}\n- URL : {origin}/mcp\nEnsuite, liste les outils disponibles, {exampleLower}, et montre-moi le résultat.",
    pClaudeCode:
      "Configure le serveur MCP {displayName} pour que je puisse l'interroger d'ici.\n1. Exécute : claude mcp add --transport http {slug} {origin}/mcp\n2. Exécute `claude mcp list` pour confirmer la connexion.\n3. {example}, et montre-moi le résultat.",
    pCli:
      "# Point de terminaison MCP (HTTP continu)\n{origin}/mcp\n\n# Lister les outils disponibles\ncurl -s -X POST {origin}/mcp -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
    otherTitle: "Tout le reste",
    otherBody: "Toute plateforme qui parle MCP en HTTP continu, ou REST tout court.",
    mcpEndpoint: "Point de terminaison MCP",
    openapiSpec: "Spécification OpenAPI",
    restBase: "Base REST",
  },
  downloads: {
    kicker: "Données",
    title: "Prenez les fichiers.",
    body: "Les isochrones modélisées, les stations des lignes proposées et l'analyse des km² marginaux, sous licence MIT, en JSON.",
    files: [
      { name: "isochrones.json", desc: "Polygones d'isochrones modélisées par mode et seuil (15/30/45/60 min), avec km² et population" },
      { name: "proposed_lines.json", desc: "Quatre lignes de transport proposées : stations, vitesses modélisées, budgets publiés avec sources" },
    ],
    marginal: { name: "marginal.json", desc: "Km² marginaux de 30 min par ligne et km² par milliard de dollars" },
    download: "Télécharger",
  },
  footer: {
    line: "Un projet civique à code source ouvert. Sans affiliation avec le gouvernement du Canada ni la Ville de Toronto.",
    sources:
      "Transport : flux d'horaires GTFS de la TTC et de GO Transit. Routes : réseau routier d'OpenStreetMap. Population : recensement 2021, tableau 98-10-0015 de StatCan, limites des aires de diffusion via geo.statcan.gc.ca. Lignes proposées et budgets : tracés publiés de Metrolinx et sources budgétaires par ligne, indiquées dans les fichiers de données.",
    builtBy: "Built by Richardson Dackam",
  },
};

const dicts: Record<Lang, Dict> = { en, fr };

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Dict }>({
  lang: "en",
  setLang: () => {},
  t: en,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t: dicts[lang] }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

export function fmtKm2(n: number, lang: Lang): string {
  const s = n.toFixed(1);
  return lang === "fr" ? s.replace(".", ",") : s;
}

export function fmtInt(n: number, lang: Lang): string {
  const rounded = Math.round(n);
  if (lang === "fr") {
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  }
  return rounded.toLocaleString("en-US");
}

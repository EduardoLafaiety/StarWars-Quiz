// Baixa a SWAPI e grava data/galaxy.js, a copia local usada quando a API esta fora do ar.
// Uso: node scripts/sync-swapi.mjs
import { writeFile, mkdir } from "node:fs/promises";

const API = "https://swapi.info/api";
const FIELDS = {
  people: ["name", "height", "mass", "birth_year", "homeworld", "films", "species", "starships", "url"],
  planets: ["name", "diameter", "population", "climate", "terrain", "films", "url"],
  films: ["title", "episode_id", "director", "release_date", "url"],
  starships: ["name", "model", "manufacturer", "length", "crew", "hyperdrive_rating", "starship_class", "pilots", "films", "url"],
  species: ["name", "url"],
};

const pick = (item, keys) => Object.fromEntries(keys.map((key) => [key, item[key]]));

const snapshot = { syncedAt: new Date().toISOString().slice(0, 10) };
for (const [resource, keys] of Object.entries(FIELDS)) {
  const response = await fetch(`${API}/${resource}`);
  if (!response.ok) throw new Error(`${resource}: HTTP ${response.status}`);
  const items = await response.json();
  snapshot[resource] = items.map((item) => pick(item, keys));
  console.log(`${resource}: ${items.length}`);
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../data/galaxy.js", import.meta.url),
  `window.GALAXY_SNAPSHOT = ${JSON.stringify(snapshot)};\n`
);

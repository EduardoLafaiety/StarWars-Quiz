// Busca na Wookieepedia a imagem principal de cada personagem, nave, planeta e filme da SWAPI
// e grava data/images.js so com os links (nenhuma imagem fica no repositorio).
// Uso: node scripts/sync-images.mjs
import { readFile, writeFile } from "node:fs/promises";

const WIKI = "https://starwars.fandom.com/api.php";
const WIDTH = 900;

// Nome na SWAPI -> titulo da pagina na Wookieepedia (ou "File:..." para escolher uma imagem especifica).
const TITLES = {
  "Darth Vader": "File:Darth_Vader.jpg",
  "Anakin Skywalker": "Anakin Skywalker",
  "Palpatine": "Sheev Palpatine",
  "Ackbar": "Gial Ackbar",
  "Beru Whitesun lars": "Beru Whitesun Lars",
  "Wicket Systri Warrick": "Wicket Wystri Warrick",
  "Ayla Secura": "Aayla Secura",
  "Ratts Tyerel": "Ratts Tyerell",
  "Aleen Minor": "Aleen",
  "X-wing": "T-65B X-wing starfighter",
  "Y-wing": "BTL Y-wing starfighter",
  "A-wing": "RZ-1 A-wing interceptor",
  "B-wing": "A/SF-01 B-wing starfighter",
  "Star Destroyer": "File:Star_Destroyer_SWCT.png",
  "Death Star": "DS-1 Death Star Mobile Battle Station",
  "Slave 1": "Slave I",
  "Imperial shuttle": "Lambda-class T-4a shuttle",
  "Rebel transport": "GR-75 medium transport",
  "Calamari Cruiser": "MC80 Liberty type Star Cruiser",
  "Naboo fighter": "N-1 starfighter",
  "Jedi starfighter": "Delta-7 Aethersprite-class light interceptor",
  "Republic Cruiser": "Consular-class cruiser",
  "Droid control ship": "Lucrehulk-class Droid Control Ship",
  "Naboo Royal Starship": "J-type 327 Nubian royal starship",
  "Republic Assault ship": "Acclamator I-class assault ship",
  "Solar Sailer": "Punworcca 116-class interstellar sloop",
  "Trade Federation cruiser": "Providence-class carrier/destroyer",
  "Republic attack cruiser": "Venator-class Star Destroyer",
  "Naboo star skiff": "J-type star skiff",
  "Jedi Interceptor": "Eta-2 Actis-class light interceptor",
  "arc-170": "Aggressive ReConnaissance-170 starfighter",
  "Banking clan frigte": "Munificent-class star frigate",
  "V-wing": "Alpha-3 Nimbus-class V-wing starfighter",
  "Scimitar": "Scimitar",
  "A New Hope": "Star Wars: Episode IV A New Hope",
  "The Empire Strikes Back": "Star Wars: Episode V The Empire Strikes Back",
  "Return of the Jedi": "Star Wars: Episode VI Return of the Jedi",
  "The Phantom Menace": "Star Wars: Episode I The Phantom Menace",
  "Attack of the Clones": "Star Wars: Episode II Attack of the Clones",
  "Revenge of the Sith": "Star Wars: Episode III Revenge of the Sith",
};

// Cenas grandes usadas na interface (telas de abertura, resultado e salto para o hiperespaco).
const SCENES = {
  light: "Millennium_Falcon_vs_TIE_fighters.png",
  dark: "Vader-IVBG.png",
  lightWin: "Battle_of_Yavin.png",
  darkWin: "Vader-Wingmen-ANH.png",
  deathStar: "DeathStar1-SWE.png",
  hyperspace: "Falcon_Hyperspace_TROS.jpg",
  falcon: "Millennium_Falcon_DICE.png",
  xwing: "X-wing_SWB.png",
};

// Na wiki, a imagem destes planetas e so um recorte de mapa; o jogo usa o planeta desenhado.
const SKIP = new Set(["Iktotch", "Quermia", "Dorin", "Champala", "Mirial", "Ojom", "Skako", "Muunilinst", "Shili", "Zolan", "Polis Massa"]);

const source = await readFile(new URL("../data/galaxy.js", import.meta.url), "utf8");
const galaxy = JSON.parse(source.replace(/^window\.GALAXY_SNAPSHOT = /, "").replace(/;\s*$/, ""));
const names = [
  ...galaxy.people.map((p) => p.name),
  ...galaxy.starships.map((s) => s.name),
  ...galaxy.planets.map((p) => p.name).filter((n) => n !== "unknown" && !SKIP.has(n)),
  ...galaxy.films.map((f) => f.title),
];

async function wiki(params) {
  const url = `${WIKI}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const response = await fetch(url, { headers: { "User-Agent": "StarWarsQuiz/1.0 (projeto de fa)" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Tira o redimensionamento da URL e pede a largura desejada.
const sized = (url, width = WIDTH) => url.replace(/\/revision\/latest.*?(\?|$)/, `/revision/latest/scale-to-width-down/${width}$1`);

const images = {};
const missing = [];
const pages = names.filter((n) => !(TITLES[n] || "").startsWith("File:"));
for (let i = 0; i < pages.length; i += 40) {
  const batch = pages.slice(i, i + 40);
  const titleOf = (n) => TITLES[n] || n;
  const data = await wiki({
    action: "query", prop: "pageimages", piprop: "original", redirects: "1",
    titles: batch.map(titleOf).join("|"),
  });
  const q = data.query;
  const resolve = (t) => {
    (q.normalized || []).forEach((r) => { if (r.from === t) t = r.to; });
    (q.redirects || []).forEach((r) => { if (r.from === t) t = r.to; });
    return t;
  };
  batch.forEach((name) => {
    const page = q.pages.find((p) => p.title === resolve(titleOf(name)));
    if (page && page.original) images[name] = sized(page.original.source);
    else missing.push(name);
  });
}

const files = names.filter((n) => (TITLES[n] || "").startsWith("File:"));
for (const name of files) {
  const data = await wiki({ action: "query", prop: "imageinfo", iiprop: "url", titles: TITLES[name] });
  const info = data.query.pages[0].imageinfo;
  if (info) images[name] = sized(info[0].url); else missing.push(name);
}

const scenes = {};
const sceneData = await wiki({
  action: "query", prop: "imageinfo", iiprop: "url", titles: Object.values(SCENES).map((f) => `File:${f}`).join("|"),
});
for (const [key, file] of Object.entries(SCENES)) {
  const page = sceneData.query.pages.find((p) => p.title === `File:${file.replace(/_/g, " ")}`);
  if (page && page.imageinfo) scenes[key] = sized(page.imageinfo[0].url, 1600); else missing.push(file);
}

await writeFile(
  new URL("../data/images.js", import.meta.url),
  `// Gerado por scripts/sync-images.mjs. Imagens: Wookieepedia (starwars.fandom.com), carregadas direto de la.\n` +
  `window.GALAXY_IMAGES = ${JSON.stringify(images, null, 1)};\n` +
  `window.GALAXY_SCENES = ${JSON.stringify(scenes, null, 1)};\n`
);
console.log(`${Object.keys(images).length} imagens, sem imagem: ${missing.join(", ") || "nenhum"}`);

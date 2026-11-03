// Holocron: uma wiki dentro do jogo. Personagens, naves, planetas e filmes têm uma ficha,
// montada com os dados da SWAPI, e tudo que aparece numa ficha é link para outra.
(function (root) {
  const { QuizEngine: Quiz, StarArt: Art } = root;

  const idOf = (url) => {
    const match = /\/(\w+)\/(\d+)\/?$/.exec(url || "");
    return match ? `${match[1]}/${match[2]}` : "";
  };
  const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const known = (value) => value !== undefined && value !== null && value !== "" && !["unknown", "n/a", "none", "indefinite"].includes(String(value).toLowerCase());
  const num = (value) => {
    const parsed = parseFloat(String(value).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const measure = (value, unit) => (known(value) && num(value) !== null ? `${Quiz.formatNumber(num(value))}${unit ? ` ${unit}` : ""}` : "Desconhecido");
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // A SWAPI fala inglês; os termos mais comuns ganham tradução.
  const DICT = {
    climate: {
      arid: "árido", temperate: "temperado", tropical: "tropical", frozen: "congelado", murky: "pantanoso", hot: "quente",
      humid: "úmido", moist: "úmido", windy: "ventoso", frigid: "gélido", polluted: "poluído", superheated: "superaquecido",
      "artificial temperate": "temperado artificial", subartic: "subártico", artic: "ártico", rocky: "rochoso",
    },
    terrain: {
      desert: "deserto", grasslands: "campos", mountains: "montanhas", jungle: "selva", jungles: "selvas", rainforests: "florestas tropicais",
      tundra: "tundra", "ice caves": "cavernas de gelo", "mountain ranges": "cordilheiras", swamp: "pântano", swamps: "pântanos",
      "gas giant": "gigante gasoso", forests: "florestas", lakes: "lagos", "grassy hills": "colinas verdes", cityscape: "cidade-planeta",
      ocean: "oceano", oceans: "oceanos", rock: "rocha", barren: "árido", volcanoes: "vulcões", "lava rivers": "rios de lava", caves: "cavernas",
      plains: "planícies", urban: "urbano", sinkholes: "dolinas", seas: "mares", islands: "ilhas", cliffs: "penhascos", canyons: "cânions",
      savannas: "savanas", hills: "colinas", "rocky islands": "ilhas rochosas", glaciers: "geleiras", "ice canyons": "cânions de gelo",
      "fungus forests": "florestas de fungos", rivers: "rios", valleys: "vales", "airless asteroid": "asteroide sem ar", plateaus: "planaltos",
      "toxic cloudsea": "mar de nuvens tóxicas", verdant: "verdejante", rocky: "rochoso", mesas: "mesetas", reefs: "recifes",
      mountain: "montanha", scrublands: "matagais", savanna: "savana", savannahs: "savanas", fields: "campos", "rock arches": "arcos de pedra",
      grass: "relva", bogs: "brejos", deserts: "desertos", "rocky deserts": "desertos rochosos", ash: "cinzas", "rocky canyons": "cânions rochosos",
      "acid pools": "poças de ácido", vines: "trepadeiras", cities: "cidades",
    },
    starship_class: {
      starfighter: "caça estelar", corvette: "corveta", "star destroyer": "destróier estelar", "deep space mobile battlestation": "estação de batalha móvel",
      "light freighter": "cargueiro leve", "assault starfighter": "caça de assalto", "star dreadnought": "couraçado estelar",
      "medium transport": "transporte médio", "patrol craft": "nave de patrulha", "armed government transport": "transporte armado do governo",
      "escort ship": "nave de escolta", "star cruiser": "cruzador estelar", "landing craft": "nave de desembarque", "space cruiser": "cruzador espacial",
      "droid control ship": "nave de controle de droides", yacht: "iate", "assault ship": "nave de assalto", "space transport": "transporte espacial",
      "diplomatic barge": "barca diplomática", freighter: "cargueiro", "capital ship": "nave capital", transport: "transporte", "star frigate": "fragata estelar",
      cruiser: "cruzador",
    },
    species: {
      human: "Humano", droid: "Droide", wookie: "Wookiee", rodian: "Rodiano", hutt: "Hutt", "yoda's species": "Espécie do Yoda",
      trandoshan: "Trandoshano", "mon calamari": "Mon Calamari", ewok: "Ewok", sullustan: "Sullustano", neimodian: "Neimoidiano",
      gungan: "Gungan", toydarian: "Toydariano", dug: "Dug", "twi'lek": "Twi'lek", zabrak: "Zabrak", kaminoan: "Kaminoano",
      cerean: "Cereano", geonosian: "Geonosiano", mirialan: "Mirialano", nautolan: "Nautolano", tholothian: "Tholothiano",
      quermian: "Quermiano", chagrian: "Chagriano",
    },
  };
  const translate = (value, dict) => String(value || "").split(",").map((part) => part.trim()).filter(known)
    .map((part) => DICT[dict][part.toLowerCase()] || part).join(", ");
  const birth = (value) => (known(value) ? String(value).replace(/(\d)BBY$/i, "$1 ABY").replace(/(\d)ABY$/i, "$1 DBY") : "Desconhecido");
  const date = (value) => (value ? value.split("-").reverse().join("/") : "Desconhecido");

  const TYPES = {
    people: { label: "Personagem", kind: "person" },
    starships: { label: "Nave", kind: "ship" },
    planets: { label: "Planeta", kind: "planet" },
    films: { label: "Filme", kind: "poster" },
  };

  let getIndex = () => null;
  let sound = () => {};
  let dialog;
  let body;
  let backButton;
  const trail = [];

  const nameOf = (id, item) => (id.startsWith("films/") ? Quiz.FILM_PT[item.episode_id] || item.title : item.name);
  const lookup = (url) => {
    const id = idOf(url);
    const item = getIndex().byId[id];
    return item ? { id, item, name: nameOf(id, item) } : null;
  };
  const linkTo = (entry) => `<button type="button" class="wiki-link" data-go="${esc(entry.id)}">${Art.thumb(entry.name)}<span>${esc(entry.name)}</span></button>`;
  const section = (title, entries) => (entries.length
    ? `<section class="wiki-section"><h3>${esc(title)} <small>${entries.length}</small></h3><div class="wiki-links">${entries.map(linkTo).join("")}</div></section>`
    : "");
  const fact = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
  const byFilm = (list) => list.slice().sort((a, b) => a.item.episode_id - b.item.episode_id);

  // Monta a ficha de uma entrada: foto, resumo, dados e as listas de links.
  function page(id) {
    const index = getIndex();
    const item = index.byId[id];
    if (!item) return "";
    const type = id.split("/")[0];
    const name = nameOf(id, item);
    const films = byFilm((item.films || []).map(lookup).filter(Boolean));
    const raw = index.raw;
    let facts = "";
    let summary = "";
    let sections = "";
    let extra = "";

    if (type === "people") {
      const home = lookup(item.homeworld);
      const species = (item.species || []).map((url) => getIndex().byId[idOf(url)]).filter(Boolean).map((s) => DICT.species[s.name.toLowerCase()] || s.name);
      const ships = (item.starships || []).map(lookup).filter(Boolean);
      facts = [
        fact("Planeta natal", home && known(home.name) ? linkTo(home) : "Desconhecido"),
        fact("Espécie", esc(species.join(", ") || "Humano")),
        fact("Altura", esc(measure(item.height, "cm"))),
        fact("Peso", esc(measure(item.mass, "kg"))),
        fact("Nascimento", esc(birth(item.birth_year))),
      ].join("");
      summary = [
        home && known(home.name) ? `${name} vem de ${home.name}` : `${name} tem origem desconhecida`,
        ` e aparece em ${plural(films.length, "filme", "filmes")}`,
        ships.length ? `. Pilotou ${plural(ships.length, "nave registrada", "naves registradas")} no holocron.` : ".",
      ].join("");
      sections = section("Aparece em", films) + section("Naves que pilotou", ships);
    } else if (type === "starships") {
      const pilots = (item.pilots || []).map(lookup).filter(Boolean);
      facts = [
        fact("Modelo", esc(item.model || "Desconhecido")),
        fact("Classe", esc(translate(item.starship_class, "starship_class") || "Desconhecida")),
        fact("Fabricante", esc(item.manufacturer || "Desconhecido")),
        fact("Comprimento", esc(measure(item.length, "m"))),
        fact("Tripulação", esc(known(item.crew) ? item.crew : "Desconhecida")),
        fact("Hiperpropulsor", esc(known(item.hyperdrive_rating) ? `Classe ${Quiz.formatNumber(num(item.hyperdrive_rating))}` : "Nenhum")),
      ].join("");
      summary = `${name} mede ${measure(item.length, "metros").toLowerCase()} e aparece em ${plural(films.length, "filme", "filmes")}.`
        + (pilots.length ? ` Pilotos conhecidos: ${pilots.map((p) => p.name).join(", ")}.` : "");
      sections = section("Pilotos", pilots) + section("Aparece em", films);
    } else if (type === "planets") {
      const natives = raw.people.filter((p) => idOf(p.homeworld) === id).map((p) => lookup(p.url)).filter(Boolean);
      facts = [
        fact("Clima", esc(translate(item.climate, "climate") || "Desconhecido")),
        fact("Terreno", esc(translate(item.terrain, "terrain") || "Desconhecido")),
        fact("Diâmetro", esc(measure(item.diameter, "km"))),
        fact("População", esc(measure(item.population, "habitantes"))),
      ].join("");
      summary = `${name} tem clima ${translate(item.climate, "climate") || "desconhecido"} e aparece em ${plural(films.length, "filme", "filmes")}.`
        + (natives.length ? ` ${plural(natives.length, "personagem nasceu", "personagens nasceram")} aqui.` : "");
      sections = section("Nasceram aqui", natives) + section("Aparece em", films);
    } else if (type === "films") {
      const inFilm = (list) => list.filter((entry) => (entry.films || []).some((url) => idOf(url) === id)).map((entry) => lookup(entry.url)).filter(Boolean);
      facts = [
        fact("Episódio", esc(Quiz.ROMAN[item.episode_id] || "?")),
        fact("Título original", esc(item.title)),
        fact("Direção", esc(item.director || "Desconhecida")),
        fact("Estreia", esc(date(item.release_date))),
      ].join("");
      summary = `Episódio ${Quiz.ROMAN[item.episode_id]}, dirigido por ${item.director}, estreou em ${String(item.release_date).slice(0, 4)}.`;
      if (item.opening_crawl) {
        extra = `<section class="wiki-section"><h3>Texto de abertura <small>original em inglês</small></h3>`
          + `<blockquote class="wiki-crawl">${esc(item.opening_crawl.replace(/\s+/g, " ").trim())}</blockquote></section>`;
      }
      sections = section("Personagens", inFilm(raw.people)) + section("Naves", inFilm(raw.starships)) + section("Planetas", inFilm(raw.planets));
    }

    const photoName = type === "films" ? item.title : item.name;
    return `
      <header class="wiki-head" data-type="${type}">
        ${Art.photo(photoName, { kind: TYPES[type].kind, cls: "wiki-photo", eager: true })}
        <div class="wiki-intro">
          <p class="eyebrow">${TYPES[type].label}</p>
          <h2 id="wiki-title" tabindex="-1">${esc(name)}</h2>
          <p class="wiki-summary">${esc(summary)}</p>
          <dl class="wiki-facts">${facts}</dl>
        </div>
      </header>
      ${extra}
      ${sections}`;
  }

  function show(id) {
    body.innerHTML = page(id);
    body.scrollTop = 0;
    backButton.hidden = trail.length < 2;
    sound();
    const title = document.getElementById("wiki-title");
    if (title) title.focus({ preventScroll: true });
  }

  function open(id) {
    if (!getIndex().byId[id]) return;
    trail.length = 0;
    trail.push(id);
    show(id);
    if (!dialog.open) dialog.showModal();
  }

  function go(id) {
    trail.push(id);
    show(id);
  }

  function back() {
    if (trail.length < 2) return;
    trail.pop();
    show(trail[trail.length - 1]);
  }

  // Procura a ficha pelo nome, para os cards da galeria.
  function idFor(name) {
    const { raw } = getIndex();
    for (const type of ["people", "starships", "planets"]) {
      const found = raw[type].find((item) => item.name === name);
      if (found) return idOf(found.url);
    }
    const film = raw.films.find((f) => f.title === name || Quiz.FILM_PT[f.episode_id] === name);
    return film ? idOf(film.url) : "";
  }

  function init(options) {
    getIndex = options.index;
    sound = options.sound || sound;
    dialog = document.getElementById("wiki");
    body = document.getElementById("wiki-body");
    backButton = document.getElementById("wiki-back");
    document.addEventListener("click", (event) => {
      const card = event.target.closest("[data-wiki]");
      if (card) { open(card.dataset.wiki); return; }
      const link = event.target.closest("[data-go]");
      if (link && dialog.contains(link)) go(link.dataset.go);
    });
    backButton.addEventListener("click", back);
    document.getElementById("wiki-close").addEventListener("click", () => dialog.close());
    // Clique fora da caixa fecha.
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  }

  root.Wiki = { init, open, idFor };
})(window);

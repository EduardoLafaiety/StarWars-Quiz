// Motor do quiz: transforma os dados da SWAPI em perguntas. Sem DOM, para rodar tambem no Node.
(function (root) {
  const RESOURCES = ["people", "planets", "films", "starships", "species"];

  const FILM_PT = {
    1: "A Ameaça Fantasma",
    2: "Ataque dos Clones",
    3: "A Vingança dos Sith",
    4: "Uma Nova Esperança",
    5: "O Império Contra-Ataca",
    6: "O Retorno de Jedi",
  };
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  const FAMOUS_PEOPLE = [
    "Luke Skywalker", "C-3PO", "R2-D2", "Darth Vader", "Leia Organa", "Obi-Wan Kenobi", "Anakin Skywalker",
    "Chewbacca", "Han Solo", "Jabba Desilijic Tiure", "Yoda", "Palpatine", "Boba Fett", "Lando Calrissian",
    "Ackbar", "Qui-Gon Jinn", "Padmé Amidala", "Jar Jar Binks", "Darth Maul", "Mace Windu", "Dooku", "Grievous",
    "Owen Lars", "Wedge Antilles", "Jango Fett", "Nute Gunray", "Sebulba", "Wicket Systri Warrick",
  ];
  const FAMOUS_SHIPS = [
    "X-wing", "Y-wing", "A-wing", "TIE Advanced x1", "Millennium Falcon", "Star Destroyer", "Death Star",
    "Executor", "Slave 1", "Imperial shuttle", "Naboo fighter", "Rebel transport", "CR90 corvette",
    "Jedi starfighter", "Sentinel-class landing craft", "Calamari Cruiser",
  ];
  const FAMOUS_PLANETS = [
    "Tatooine", "Alderaan", "Yavin IV", "Hoth", "Dagobah", "Bespin", "Endor", "Naboo", "Coruscant", "Kamino",
    "Geonosis", "Utapau", "Mustafar", "Kashyyyk",
  ];

  const CATEGORIES = {
    all: "Galáxia inteira",
    people: "Personagens",
    starships: "Naves",
    planets: "Planetas",
    films: "Filmes",
  };

  const idOf = (url) => {
    const match = /\/(\w+)\/(\d+)\/?$/.exec(url || "");
    return match ? `${match[1]}/${match[2]}` : "";
  };

  // A SWAPI grava numeros como texto ("1,600", "unknown", "n/a").
  const num = (value) => {
    const parsed = parseFloat(String(value).replace(/,/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const formatNumber = (value) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  function buildIndex(raw) {
    const byId = {};
    RESOURCES.forEach((resource) => {
      (raw[resource] || []).forEach((item) => {
        byId[idOf(item.url)] = item;
      });
    });
    const film = (url) => byId[idOf(url)];
    const filmsOf = (item) => (item.films || []).map(film).filter(Boolean);
    const known = (list, names) => list.filter((item) => names.includes(item.name));
    return {
      raw,
      byId,
      film,
      filmsOf,
      famousPeople: known(raw.people, FAMOUS_PEOPLE),
      famousShips: known(raw.starships, FAMOUS_SHIPS),
      famousPlanets: known(raw.planets, FAMOUS_PLANETS),
    };
  }

  const filmLabel = (film) => FILM_PT[film.episode_id] || film.title;
  const filmFull = (film) => `Episódio ${ROMAN[film.episode_id]}: ${filmLabel(film)}`;

  function randomTools(rng) {
    const shuffle = (list) => {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };
    const one = (list) => list[Math.floor(rng() * list.length)];
    const take = (list, count) => shuffle(list).slice(0, count);
    return { shuffle, one, take };
  }

  // Monta a pergunta com as alternativas embaralhadas e guarda o indice da correta.
  function assemble(tools, base, correct, wrong) {
    const options = tools.shuffle([correct].concat(wrong));
    return Object.assign({}, base, { options, answer: options.indexOf(correct) });
  }

  // Perguntas de "qual e o maior": sorteia itens com valores bem diferentes entre si.
  function superlative(tools, pool, valueOf) {
    const seen = [];
    tools.shuffle(pool).forEach((item) => {
      const value = valueOf(item);
      if (value !== null && seen.length < 4 && seen.every((other) => Math.abs(other.value / value - 1) > 0.02)) {
        seen.push({ item, value });
      }
    });
    return seen.length === 4 ? seen : null;
  }

  const SCALE = (rows, unit) => rows.map(({ item, value }) => ({ label: item.name, value, unit }));

  function makeGenerators(index, tools) {
    const { raw, byId, filmsOf } = index;
    const { one, take } = tools;
    const pickFrom = (famous, all) => (Math.random() < 0.8 && famous.length ? one(famous) : one(all));
    const allFilms = raw.films;

    const inFilmQuestion = (item, cat, art, source, label) => {
      const inFilms = filmsOf(item);
      const outFilms = allFilms.filter((film) => !inFilms.includes(film));
      if (inFilms.length && outFilms.length >= 3) {
        return assemble(tools, {
          key: `film:${item.url}`, cat, art, source,
          prompt: `Em qual destes filmes ${label} aparece?`,
          fact: `Pela SWAPI, ${label} aparece em: ${inFilms.map(filmLabel).join(", ")}.`,
        }, filmLabel(one(inFilms)), take(outFilms, 3).map(filmLabel));
      }
      if (inFilms.length >= 3 && outFilms.length >= 1) {
        return assemble(tools, {
          key: `nofilm:${item.url}`, cat, art, source,
          prompt: `Em qual destes filmes ${label} não aparece?`,
          fact: `Pela SWAPI, ${label} aparece em: ${inFilms.map(filmLabel).join(", ")}.`,
        }, filmLabel(one(outFilms)), take(inFilms, 3).map(filmLabel));
      }
      return null;
    };

    const people = [
      function homeworld() {
        const person = pickFrom(index.famousPeople, raw.people);
        const home = byId[idOf(person.homeworld)];
        if (!home || home.name === "unknown") return null;
        const wrong = take(raw.planets.filter((p) => p !== home && p.name !== "unknown" && FAMOUS_PLANETS.includes(p.name)), 3);
        return assemble(tools, {
          key: `home:${person.url}`, cat: "people", art: { type: "person", name: person.name }, source: idOf(person.url),
          prompt: `De qual planeta vem ${person.name}?`,
          fact: `${person.name} nasceu em ${home.name}.`,
        }, home.name, wrong.map((p) => p.name));
      },
      function appearsIn() {
        const person = pickFrom(index.famousPeople, raw.people);
        return inFilmQuestion(person, "people", { type: "person", name: person.name }, idOf(person.url), person.name);
      },
      function tallest() {
        const rows = superlative(tools, index.famousPeople, (p) => num(p.height));
        if (!rows) return null;
        const top = rows.reduce((a, b) => (b.value > a.value ? b : a));
        return assemble(tools, {
          key: `tall:${top.item.url}`, cat: "people", art: { type: "person", name: top.item.name }, source: "people",
          prompt: "Quem é o mais alto destes quatro?",
          fact: `${top.item.name} tem ${formatNumber(top.value)} cm de altura.`,
          scale: SCALE(rows, "cm"),
        }, top.item.name, rows.filter((r) => r !== top).map((r) => r.item.name));
      },
      function flewShip() {
        const pilots = raw.people.filter((p) => (p.starships || []).length && FAMOUS_PEOPLE.includes(p.name));
        const person = one(pilots);
        const flown = person.starships.map((url) => byId[idOf(url)]).filter(Boolean);
        const others = raw.starships.filter((ship) => !flown.includes(ship) && FAMOUS_SHIPS.includes(ship.name));
        if (!flown.length || others.length < 3) return null;
        const ship = one(flown);
        return assemble(tools, {
          key: `flew:${person.url}`, cat: "people", art: { type: "person", name: person.name }, source: idOf(person.url),
          prompt: `Qual destas naves ${person.name} pilotou?`,
          fact: `Naves de ${person.name} na SWAPI: ${flown.map((s) => s.name).join(", ")}.`,
        }, ship.name, take(others, 3).map((s) => s.name));
      },
    ];

    const starships = [
      function longest() {
        const rows = superlative(tools, Math.random() < 0.7 ? index.famousShips : raw.starships, (s) => num(s.length));
        if (!rows) return null;
        const top = rows.reduce((a, b) => (b.value > a.value ? b : a));
        return assemble(tools, {
          key: `long:${top.item.url}`, cat: "starships", art: { type: "ship", name: top.item.name }, source: "starships",
          prompt: "Qual destas naves é a mais comprida?",
          fact: `${top.item.name} mede ${formatNumber(top.value)} metros. As barras abaixo estão em escala real.`,
          scale: SCALE(rows, "m"),
        }, top.item.name, rows.filter((r) => r !== top).map((r) => r.item.name));
      },
      function fastest() {
        const rows = superlative(tools, raw.starships, (s) => num(s.hyperdrive_rating));
        if (!rows) return null;
        const top = rows.reduce((a, b) => (b.value < a.value ? b : a));
        return assemble(tools, {
          key: `hyper:${top.item.url}`, cat: "starships", art: { type: "ship", name: top.item.name }, source: "starships",
          prompt: "Qual destas naves tem o hiperpropulsor mais rápido?",
          fact: `Quanto menor a classe, mais rápido o salto. ${top.item.name} é classe ${formatNumber(top.value)}.`,
          scale: SCALE(rows, "classe"),
        }, top.item.name, rows.filter((r) => r !== top).map((r) => r.item.name));
      },
      function pilotOf() {
        const ships = raw.starships.filter((s) => (s.pilots || []).length);
        const ship = one(ships);
        const pilots = ship.pilots.map((url) => byId[idOf(url)]).filter(Boolean);
        const others = index.famousPeople.filter((p) => !pilots.includes(p));
        if (!pilots.length) return null;
        return assemble(tools, {
          key: `pilot:${ship.url}`, cat: "starships", art: { type: "ship", name: ship.name }, source: idOf(ship.url),
          prompt: `Quem pilotou a nave ${ship.name}?`,
          fact: `Pilotos de ${ship.name} na SWAPI: ${pilots.map((p) => p.name).join(", ")}.`,
        }, one(pilots).name, take(others, 3).map((p) => p.name));
      },
      function maker() {
        const firstMaker = (ship) => String(ship.manufacturer).split(",")[0].trim();
        const ship = pickFrom(index.famousShips, raw.starships);
        const correct = firstMaker(ship);
        const others = Array.from(new Set(raw.starships.map(firstMaker))).filter(
          (name) => name && name !== "unknown" && !ship.manufacturer.includes(name)
        );
        if (others.length < 3) return null;
        return assemble(tools, {
          key: `maker:${ship.url}`, cat: "starships", art: { type: "ship", name: ship.name }, source: idOf(ship.url),
          prompt: `Quem fabricou a nave ${ship.name}?`,
          fact: `Fabricante na SWAPI: ${ship.manufacturer}.`,
        }, correct, take(others, 3));
      },
      function shipFilm() {
        const ship = pickFrom(index.famousShips, raw.starships);
        return inFilmQuestion(ship, "starships", { type: "ship", name: ship.name }, idOf(ship.url), `a nave ${ship.name}`);
      },
    ];

    const planets = [
      function populated() {
        const rows = superlative(tools, raw.planets, (p) => num(p.population));
        if (!rows) return null;
        const top = rows.reduce((a, b) => (b.value > a.value ? b : a));
        return assemble(tools, {
          key: `pop:${top.item.url}`, cat: "planets", art: { type: "planet", name: top.item.name, climate: top.item.climate }, source: "planets",
          prompt: "Qual destes planetas tem mais habitantes?",
          fact: `${top.item.name} tem ${formatNumber(top.value)} habitantes.`,
          scale: SCALE(rows, "hab."),
        }, top.item.name, rows.filter((r) => r !== top).map((r) => r.item.name));
      },
      function largest() {
        const rows = superlative(tools, raw.planets, (p) => num(p.diameter));
        if (!rows) return null;
        const top = rows.reduce((a, b) => (b.value > a.value ? b : a));
        return assemble(tools, {
          key: `diam:${top.item.url}`, cat: "planets", art: { type: "planet", name: top.item.name, climate: top.item.climate }, source: "planets",
          prompt: "Qual destes planetas tem o maior diâmetro?",
          fact: `${top.item.name} tem ${formatNumber(top.value)} km de diâmetro.`,
          scale: SCALE(rows, "km"),
        }, top.item.name, rows.filter((r) => r !== top).map((r) => r.item.name));
      },
      function planetFilm() {
        const planet = pickFrom(index.famousPlanets, raw.planets);
        return inFilmQuestion(planet, "planets", { type: "planet", name: planet.name, climate: planet.climate }, idOf(planet.url), `o planeta ${planet.name}`);
      },
      function nativeOf() {
        const planet = one(index.famousPlanets);
        const natives = raw.people.filter((p) => idOf(p.homeworld) === idOf(planet.url));
        const others = index.famousPeople.filter((p) => idOf(p.homeworld) !== idOf(planet.url));
        if (!natives.length) return null;
        const famousNatives = natives.filter((p) => FAMOUS_PEOPLE.includes(p.name));
        return assemble(tools, {
          key: `native:${planet.url}`, cat: "planets", art: { type: "planet", name: planet.name, climate: planet.climate }, source: idOf(planet.url),
          prompt: `Quem nasceu em ${planet.name}?`,
          fact: `Nascidos em ${planet.name} na SWAPI: ${natives.slice(0, 6).map((p) => p.name).join(", ")}.`,
        }, one(famousNatives.length ? famousNatives : natives).name, take(others, 3).map((p) => p.name));
      },
    ];

    const films = [
      function year() {
        const film = one(allFilms);
        const yearOf = (f) => f.release_date.slice(0, 4);
        return assemble(tools, {
          key: `year:${film.url}`, cat: "films", art: { type: "film", episode: ROMAN[film.episode_id], title: film.title, name: filmLabel(film) }, source: idOf(film.url),
          prompt: `Em que ano ${filmFull(film)} estreou?`,
          fact: `${filmLabel(film)} estreou em ${film.release_date.split("-").reverse().join("/")}.`,
        }, yearOf(film), take(allFilms.filter((f) => f !== film), 3).map(yearOf));
      },
      function director() {
        const film = one(allFilms);
        const directors = Array.from(new Set(allFilms.map((f) => f.director)));
        return assemble(tools, {
          key: `dir:${film.url}`, cat: "films", art: { type: "film", episode: ROMAN[film.episode_id], title: film.title, name: filmLabel(film) }, source: idOf(film.url),
          prompt: `Quem dirigiu ${filmFull(film)}?`,
          fact: `${filmLabel(film)} foi dirigido por ${film.director}.`,
        }, film.director, directors.filter((d) => d !== film.director));
      },
      function episode() {
        const film = one(allFilms);
        const others = allFilms.filter((f) => f !== film);
        return assemble(tools, {
          key: `ep:${film.url}`, cat: "films", art: { type: "film", episode: "?" }, source: idOf(film.url),
          prompt: `Qual é o número do episódio de ${filmLabel(film)}?`,
          fact: `${filmLabel(film)} é o Episódio ${ROMAN[film.episode_id]}.`,
        }, `Episódio ${ROMAN[film.episode_id]}`, take(others, 3).map((f) => `Episódio ${ROMAN[f.episode_id]}`));
      },
      function firstReleased() {
        const sample = take(allFilms, 4);
        const first = sample.reduce((a, b) => (b.release_date < a.release_date ? b : a));
        return assemble(tools, {
          key: `first:${sample.map((f) => f.episode_id).sort().join("")}`, cat: "films", art: { type: "film", episode: ROMAN[first.episode_id], title: first.title, name: filmLabel(first) }, source: "films",
          prompt: "Qual destes filmes chegou primeiro aos cinemas?",
          fact: `${filmLabel(first)} estreou em ${first.release_date.slice(0, 4)}. A numeração dos episódios não segue a ordem de estreia.`,
        }, filmLabel(first), sample.filter((f) => f !== first).map(filmLabel));
      },
    ];

    return { people, starships, planets, films };
  }

  function generate(index, { category = "all", count = 10, rng = Math.random } = {}) {
    const tools = randomTools(rng);
    const generators = makeGenerators(index, tools);
    const groups = category === "all" ? Object.keys(generators) : [category];
    const used = new Set();
    const uses = new Map();
    const questions = [];
    let attempts = 0;
    while (questions.length < count && attempts < count * 60) {
      attempts++;
      const list = generators[groups[questions.length % groups.length]];
      // Sorteia entre os tipos menos usados, para a partida nao repetir o mesmo formato.
      const least = Math.min(...list.map((generator) => uses.get(generator) || 0));
      const generator = tools.one(list.filter((candidate) => (uses.get(candidate) || 0) === least));
      uses.set(generator, least + 1);
      const question = generator();
      if (question && !used.has(question.key)) {
        used.add(question.key);
        questions.push(question);
      }
    }
    return tools.shuffle(questions);
  }

  // Dois acertos seguidos sobem o multiplicador em 0,5x, ate 3x.
  function pointsFor({ timeLeft, timeTotal, streak }) {
    const multiplier = Math.min(3, 1 + Math.floor(streak / 2) * 0.5);
    return { points: Math.round((100 + 50 * (timeLeft / timeTotal)) * multiplier), multiplier };
  }

  const RANKS = {
    light: ["Youngling", "Padawan", "Cavaleiro Jedi", "Mestre Jedi"],
    dark: ["Acólito", "Aprendiz Sith", "Lorde Sith", "Lorde Sombrio"],
  };

  function rankFor(side, correct, total) {
    const ratio = total ? correct / total : 0;
    const tier = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio >= 0.3 ? 1 : 0;
    return { tier, name: RANKS[side][tier] };
  }

  // Duelo: cada acerto tira vida do outro jogador. Se os dois acertam, o mais rapido causa dano extra.
  const DUEL = { hp: 100, hit: 25, speedBonus: 10, maxRounds: 15 };

  function resolveDuelRound(answer, picks) {
    const right = picks.map((pick) => Boolean(pick) && pick.choice === answer);
    let fastest = -1;
    if (right[0] && right[1] && picks[0].time !== picks[1].time) {
      fastest = picks[0].time < picks[1].time ? 0 : 1;
    }
    // damage[i] e o dano que o jogador i recebe.
    const dealt = right.map((isRight, i) => (isRight ? DUEL.hit + (i === fastest ? DUEL.speedBonus : 0) : 0));
    return { right, fastest, damage: [dealt[1], dealt[0]] };
  }

  function duelOutcome(hp, roundsPlayed) {
    const over = hp.some((value) => value <= 0) || roundsPlayed >= DUEL.maxRounds;
    const winner = hp[0] === hp[1] ? -1 : hp[0] > hp[1] ? 0 : 1;
    return { over, winner };
  }

  const api = {
    CATEGORIES, ROMAN, FILM_PT, RESOURCES, DUEL, buildIndex, generate, pointsFor, rankFor, formatNumber, resolveDuelRound, duelOutcome,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.QuizEngine = api;
})(typeof window !== "undefined" ? window : globalThis);

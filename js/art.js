// Fotos reais vindas da Wookieepedia (data/images.js), com as ilustracoes em SVG como reserva se a imagem nao carregar.
(function (root) {
  const svg = (viewBox, body, extra = "") =>
    `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ${extra}>${body}</svg>`;

  const xwing = () => svg("0 0 120 80", `
    <g fill="currentColor">
      <path d="M2 40 L62 34.5 L104 33 L110 36 L110 44 L104 47 L62 45.5 Z"/>
      <path d="M72 34 L88 7 L99 7 L100 34 Z" opacity=".85"/>
      <path d="M72 46 L88 73 L99 73 L100 46 Z" opacity=".85"/>
      <rect x="22" y="5" width="77" height="2.6" rx="1"/>
      <rect x="22" y="72.4" width="77" height="2.6" rx="1"/>
      <rect x="92" y="25" width="20" height="7" rx="2.5"/>
      <rect x="92" y="48" width="20" height="7" rx="2.5"/>
    </g>
    <path d="M44 36.5 L58 35.5 L58 44.5 L44 43.5 Z" fill="#05060c" opacity=".6"/>`);

  const tie = () => svg("0 0 120 90", `
    <g fill="currentColor">
      <path d="M6 45 L16 8 L24 8 L24 82 L16 82 Z"/>
      <path d="M114 45 L104 8 L96 8 L96 82 L104 82 Z"/>
      <rect x="24" y="40" width="20" height="10"/>
      <rect x="76" y="40" width="20" height="10"/>
      <circle cx="60" cy="45" r="19"/>
    </g>
    <circle cx="60" cy="45" r="11" fill="#05060c"/>
    <g stroke="currentColor" stroke-width="1.4" fill="none">
      <path d="M49 45 H71 M60 34 V56 M52.5 37.5 L67.5 52.5 M67.5 37.5 L52.5 52.5"/>
    </g>
    <g stroke="#05060c" stroke-width="1" opacity=".55" fill="none">
      <path d="M8 45 H24 M12 30 H24 M12 60 H24 M96 45 H112 M96 30 H108 M96 60 H108"/>
    </g>`);

  const destroyer = () => svg("0 0 240 90", `
    <g fill="currentColor">
      <path d="M2 62 L190 28 L228 34 L232 62 L190 72 Z"/>
      <path d="M150 35 L176 19 L204 19 L208 32 Z" opacity=".9"/>
      <rect x="182" y="8" width="26" height="9" rx="1"/>
      <circle cx="183" cy="7" r="3"/><circle cx="207" cy="7" r="3"/>
    </g>
    <path d="M12 62 L232 58" stroke="#05060c" stroke-width="1.2" opacity=".5"/>
    <path d="M40 58 L190 40 M80 60 L200 50" stroke="#05060c" stroke-width=".8" opacity=".45"/>`);

  const deathStar = () => svg("0 0 100 100", `
    <circle cx="50" cy="50" r="46" fill="currentColor"/>
    <path d="M4.5 53 H95.5" stroke="#05060c" stroke-width="2.2" opacity=".65"/>
    <circle cx="34" cy="31" r="13" fill="#05060c" opacity=".45"/>
    <circle cx="34" cy="31" r="4" fill="#05060c" opacity=".7"/>
    <path d="M62 14 H82 M70 22 H90 M58 66 H84 M16 66 H44 M24 76 H70 M34 86 H62" stroke="#05060c" stroke-width="1.2" opacity=".35"/>`);

  const falcon = () => svg("0 0 120 110", `
    <g fill="currentColor">
      <circle cx="60" cy="62" r="40"/>
      <path d="M38 34 L46 2 L58 2 L58 28 Z"/>
      <path d="M82 34 L74 2 L62 2 L62 28 Z"/>
      <path d="M92 48 L114 40 L118 48 L96 62 Z"/>
    </g>
    <circle cx="114" cy="44" r="5" fill="currentColor"/>
    <circle cx="60" cy="62" r="11" fill="#05060c" opacity=".55"/>
    <circle cx="60" cy="62" r="5" fill="currentColor"/>
    <path d="M22 76 A40 40 0 0 0 98 76" stroke="#05060c" stroke-width="5" fill="none" opacity=".45"/>`);

  const fighter = () => svg("0 0 120 80", `
    <g fill="currentColor">
      <path d="M4 40 L74 28 L108 22 L112 40 L108 58 L74 52 Z"/>
      <path d="M60 30 L96 4 L104 6 L88 30 Z" opacity=".85"/>
      <path d="M60 50 L96 76 L104 74 L88 50 Z" opacity=".85"/>
    </g>
    <path d="M30 37 L48 34 L48 46 L30 43 Z" fill="#05060c" opacity=".55"/>`);

  const vader = () => svg("0 0 400 430", `
    <defs>
      <linearGradient id="vaderShell" x1="0" y1="0" x2="1" y2="0.2">
        <stop offset="0" stop-color="#0a0a10"/><stop offset=".62" stop-color="#121219"/><stop offset="1" stop-color="#2b1317"/>
      </linearGradient>
      <linearGradient id="vaderLens" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#090609"/><stop offset=".7" stop-color="#2a0a10"/><stop offset="1" stop-color="#ff3b3b"/>
      </linearGradient>
      <linearGradient id="vaderRim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#5a5a68" stop-opacity=".5"/><stop offset=".55" stop-color="#3a2a30"/><stop offset="1" stop-color="#ff2d2d"/>
      </linearGradient>
    </defs>
    <path d="M200 14 C286 14 332 72 336 152 L340 214 C344 262 368 330 398 394 C352 414 308 424 276 426 L124 426 C92 424 48 414 2 394 C32 330 56 262 60 214 L64 152 C68 72 114 14 200 14 Z"
      fill="url(#vaderShell)" stroke="url(#vaderRim)" stroke-width="3"/>
    <path d="M200 14 L200 150" stroke="#2f2f3a" stroke-width="3"/>
    <path d="M66 158 C110 138 160 134 200 150 C240 134 290 138 334 158" fill="none" stroke="#3b3b48" stroke-width="4"/>
    <path d="M120 44 C100 70 92 104 90 136" fill="none" stroke="#51515f" stroke-width="5" stroke-linecap="round" opacity=".6"/>
    <path d="M280 44 C300 70 308 104 310 136" fill="none" stroke="#ff4a4a" stroke-width="4" stroke-linecap="round" opacity=".55"/>
    <path d="M206 172 C236 158 288 162 318 190 C314 224 268 244 232 226 C216 218 208 196 206 172 Z" fill="url(#vaderLens)" stroke="#000" stroke-width="3"/>
    <path d="M194 172 C164 158 112 162 82 190 C86 224 132 244 168 226 C184 218 192 196 194 172 Z" fill="url(#vaderLens)" stroke="#000" stroke-width="3"/>
    <path d="M200 172 L226 268 L174 268 Z" fill="#17171f" stroke="#3b3b48" stroke-width="2"/>
    <path d="M200 278 L262 346 L232 412 L168 412 L138 346 Z" fill="#08080c" stroke="#3a3a46" stroke-width="3"/>
    <g stroke="#55555f" stroke-width="3">
      <path d="M176 322 V392 M188 308 V402 M200 296 V406 M212 308 V402 M224 322 V392"/>
    </g>
    <path d="M238 252 L318 300 L346 382" fill="none" stroke="#33333e" stroke-width="5"/>
    <path d="M162 252 L82 300 L54 382" fill="none" stroke="#27272f" stroke-width="5"/>
    <g fill="#ff3535" opacity=".85">
      <rect x="284" y="296" width="20" height="4" transform="rotate(30 284 296)"/>
      <rect x="276" y="312" width="20" height="4" transform="rotate(30 276 312)"/>
    </g>`, 'class="vader-art"');

  // Silhueta de costas, com capa e sabre em punho.
  const luke = () => svg("0 0 90 150", `
    <g fill="#120b16">
      <circle cx="45" cy="34" r="9"/>
      <path d="M33 46 C38 42 52 42 57 46 L62 86 L68 142 L50 142 L46 100 L42 142 L22 142 L28 86 Z"/>
      <path d="M57 48 L79 42 L80 47 L60 60 Z"/>
    </g>`);

  const twinSuns = () => `
    <defs>
      <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#231a4e"/><stop offset=".42" stop-color="#7c2f5b"/>
        <stop offset=".68" stop-color="#f06a3a"/><stop offset=".86" stop-color="#ffc56b"/>
      </linearGradient>
      <radialGradient id="sunGlow"><stop offset="0" stop-color="#fff4c9"/><stop offset=".3" stop-color="#ffd68a"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></radialGradient>
    </defs>`;

  // Cena do Lado da Luz: por do sol duplo em Tatooine, com Luke olhando o horizonte.
  const lightScene = () => svg("0 0 800 800", `
    ${twinSuns()}
    <rect width="800" height="800" fill="url(#dusk)"/>
    <circle cx="300" cy="430" r="150" fill="url(#sunGlow)"/>
    <circle cx="470" cy="500" r="110" fill="url(#sunGlow)"/>
    <circle cx="300" cy="430" r="38" fill="#fff6d8"/>
    <circle cx="470" cy="500" r="26" fill="#fff0c0"/>
    <path d="M0 590 C160 540 300 610 460 570 C600 536 700 570 800 548 V800 H0 Z" fill="#8c3d33"/>
    <path d="M0 650 C180 610 340 680 520 636 C640 606 720 640 800 620 V800 H0 Z" fill="#4c1f2b"/>
    <path d="M0 720 C200 680 420 740 800 690 V800 H0 Z" fill="#1d0f1c"/>
    <g fill="#120b16">
      <rect x="182" y="590" width="6" height="70"/>
      <path d="M170 610 H200 V617 H170 Z M176 596 H194 V601 H176 Z"/>
    </g>
    <svg x="470" y="520" width="108" height="180" viewBox="0 0 90 150">
      <g fill="#120b16">
        <circle cx="45" cy="34" r="9"/>
        <path d="M33 46 C38 42 52 42 57 46 L62 86 L68 142 L50 142 L46 100 L42 142 L22 142 L28 86 Z"/>
        <path d="M57 48 L79 42 L80 47 L60 60 Z"/>
      </g>
    </svg>
    <g class="saber-small" transform="translate(-100 0)">
      <rect x="664" y="436" width="7" height="130" rx="3.5" fill="#7dff8f" transform="rotate(14 668 566)" filter="blur(7px)"/>
      <rect x="665" y="436" width="4" height="130" rx="2" fill="#efffef" transform="rotate(14 668 566)"/>
    </g>`, 'preserveAspectRatio="xMidYMax slice" class="scene"');

  // Cena do Lado Sombrio: a frota imperial acima do vazio.
  const darkScene = () => svg("0 0 800 800", `
    <defs>
      <radialGradient id="redHaze" cx=".6" cy=".78" r=".65">
        <stop offset="0" stop-color="#6f0c16"/><stop offset=".55" stop-color="#23060c"/><stop offset="1" stop-color="#05040a"/>
      </radialGradient>
    </defs>
    <rect width="800" height="800" fill="url(#redHaze)"/>
    <g fill="#ffffff" opacity=".7">
      <circle cx="60" cy="70" r="1.3"/><circle cx="210" cy="30" r="1"/><circle cx="330" cy="120" r="1.5"/><circle cx="470" cy="40" r="1"/>
      <circle cx="640" cy="90" r="1.4"/><circle cx="740" cy="30" r="1"/><circle cx="120" cy="190" r="1"/><circle cx="560" cy="200" r="1.2"/>
      <circle cx="30" cy="290" r="1.4"/><circle cx="760" cy="250" r="1.3"/><circle cx="410" cy="240" r="1"/><circle cx="110" cy="390" r="1"/>
    </g>`, 'preserveAspectRatio="xMidYMax slice" class="scene"');

  const SHIP_ART = {
    "X-wing": xwing, "TIE Advanced x1": tie, "Millennium Falcon": falcon,
    "Star Destroyer": destroyer, "Executor": destroyer, "Death Star": deathStar,
  };
  const ship = (name) => (SHIP_ART[name] || fighter)();

  const bust = () => svg("0 0 120 130", `
    <g fill="currentColor">
      <circle cx="60" cy="42" r="26"/>
      <path d="M14 126 C14 88 34 74 60 74 C86 74 106 88 106 126 Z"/>
    </g>`);

  const PERSON_ART = { "Darth Vader": vader };
  const person = (name) => (PERSON_ART[name] || bust)();

  // Cor do planeta vem do clima informado pela SWAPI.
  const PALETTES = [
    [/ice|frozen|frigid/, ["#eaf6ff", "#9cc6e0"]],
    [/arid|hot|desert|superheated/, ["#f4c67a", "#a86a33"]],
    [/murky|swamp/, ["#7d9b63", "#34512f"]],
    [/polluted|artificial/, ["#c7bba6", "#5d5a60"]],
    [/moist|tropical|rainforest|humid/, ["#6fd08c", "#1f6f58"]],
    [/temperate/, ["#6fb6ef", "#2a5d9f"]],
  ];
  const planet = (name, climate) => {
    const found = PALETTES.find(([pattern]) => pattern.test(climate || ""));
    const [light, dark] = found ? found[1] : ["#b9a5d8", "#57427c"];
    let seed = 0;
    for (const char of name) seed = (seed * 31 + char.charCodeAt(0)) % 997;
    const gid = `planet${seed}`;
    const bands = [0, 1, 2, 3].map((i) => {
      const y = 28 + ((seed * (i + 3)) % 46);
      return `<path d="M6 ${y} C30 ${y - 6} 66 ${y + 7} 94 ${y - 2}" stroke="${dark}" stroke-width="${2 + (seed + i) % 5}" fill="none" opacity=".4"/>`;
    }).join("");
    return svg("0 0 100 100", `
      <defs>
        <radialGradient id="${gid}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
        <clipPath id="${gid}c"><circle cx="50" cy="50" r="42"/></clipPath>
      </defs>
      <circle cx="50" cy="50" r="42" fill="url(#${gid})"/>
      <g clip-path="url(#${gid}c)">${bands}</g>
      <path d="M50 8 A42 42 0 0 1 50 92 A62 62 0 0 0 50 8 Z" fill="#05060c" opacity=".42"/>`);
  };

  const film = (episode) => `<span class="film-plate"><span>Episódio</span><b>${episode}</b></span>`;

  function forQuestion(art) {
    if (art.type === "ship") return ship(art.name);
    if (art.type === "person") return person(art.name);
    if (art.type === "planet") return planet(art.name, art.climate);
    return film(art.episode);
  }

  /* ---------- Fotos reais ---------- */
  const IMAGES = root.GALAXY_IMAGES || {};
  const SCENES = root.GALAXY_SCENES || {};
  const SNAPSHOT = root.GALAXY_SNAPSHOT || {};
  const FILM_PT = (root.QuizEngine && root.QuizEngine.FILM_PT) || {};

  // Nome mostrado no quiz -> tipo de imagem e nome usado no mapa de fotos.
  const KIND = {};
  const ALIAS = {};
  const CLIMATE = {};
  (SNAPSHOT.people || []).forEach((p) => { KIND[p.name] = "person"; });
  (SNAPSHOT.starships || []).forEach((s) => { KIND[s.name] = "ship"; });
  (SNAPSHOT.planets || []).forEach((p) => { KIND[p.name] = "planet"; CLIMATE[p.name] = p.climate; });
  (SNAPSHOT.films || []).forEach((f) => {
    KIND[f.title] = "poster";
    const label = FILM_PT[f.episode_id];
    if (label) { KIND[label] = "poster"; ALIAS[label] = f.title; }
  });

  const srcOf = (name) => IMAGES[ALIAS[name] || name] || null;
  const kindOf = (name) => KIND[name] || null;
  const isKnown = (name) => Boolean(KIND[name]);

  const fallbackFor = (name, kind) => {
    if (kind === "ship") return ship(name);
    if (kind === "planet") return planet(name, CLIMATE[name]);
    if (kind === "poster") return film("★");
    return bust();
  };

  // Moldura com a foto por cima do desenho: se a foto falhar, o desenho aparece.
  function photo(name, { kind, cls = "", eager = false, src: forced } = {}) {
    const type = kind || kindOf(name) || "person";
    const src = forced || srcOf(name);
    const fallback = `<span class="photo-fallback">${fallbackFor(name, type)}</span>`;
    if (!src) return `<span class="photo is-fallback ${cls}" data-kind="${type}">${fallback}</span>`;
    return `<span class="photo ${cls}" data-kind="${type}">${fallback}<img src="${src}" alt="" decoding="async" referrerpolicy="no-referrer"${eager ? "" : ' loading="lazy"'}></span>`;
  }

  // Miniatura so para nomes conhecidos (pessoas, naves, planetas, filmes); anos e fabricantes ficam sem.
  const thumb = (name) => (isKnown(name) ? photo(name, { cls: "thumb" }) : "");

  const sceneImg = (key, cls = "") => (SCENES[key]
    ? `<img class="scene-photo ${cls}" src="${SCENES[key]}" alt="" decoding="async" referrerpolicy="no-referrer" data-drop-on-error>`
    : "");

  // Imagem da pergunta. Se a foto entregaria a resposta, mostra os candidatos lado a lado.
  function holoFor(question) {
    const art = question.art;
    const answerText = question.options[question.answer];
    const spoils = Boolean(question.scale) || (art.name && art.name === answerText);
    if (spoils) {
      const known = question.options.filter(isKnown);
      if (known.length >= 2) {
        return {
          html: `<span class="mosaic" data-count="${question.options.length}">${question.options.map((o) => photo(o, { eager: true })).join("")}</span>`,
          caption: "Compare os candidatos",
          kind: "mosaic",
        };
      }
      return { html: forQuestion(art), caption: "Arquivo confidencial", kind: "art" };
    }
    if (art.type === "film") {
      if (!art.title) return { html: film(art.episode), caption: "Arquivo de filme", kind: "art" };
      return { html: photo(art.title, { kind: "poster", eager: true }), caption: art.name || art.title, kind: "poster", src: srcOf(art.title) };
    }
    const kind = { person: "person", ship: "ship", planet: "planet" }[art.type];
    return { html: photo(art.name, { kind, eager: true }), caption: art.name, kind, src: srcOf(art.name) };
  }

  // Lista de URLs de uma pergunta, para pre-carregar a proxima.
  const sourcesFor = (question) => [question.art.name, question.art.title].concat(question.options)
    .map((name) => name && srcOf(name)).filter(Boolean);

  // Se a foto falhar (sem internet, link fora do ar), cai para o desenho ou some.
  if (typeof document !== "undefined") {
    document.addEventListener("error", (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      const frame = img.closest(".photo");
      if (frame) frame.classList.add("is-fallback");
      if (frame || img.hasAttribute("data-drop-on-error")) img.remove();
    }, true);
    document.addEventListener("load", (event) => {
      const img = event.target;
      if (img instanceof HTMLImageElement) img.classList.add("is-loaded");
    }, true);
  }

  root.StarArt = {
    xwing, tie, destroyer, deathStar, vader, luke, lightScene, darkScene, ship, planet, forQuestion,
    photo, thumb, sceneImg, holoFor, sourcesFor, srcOf, isKnown, SCENES,
  };
})(window);

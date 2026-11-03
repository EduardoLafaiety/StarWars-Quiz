// Interface do jogo: telas, cronometro, campo de estrelas, sons e dados ao vivo.
(function () {
  const { QuizEngine: Quiz, StarArt: Art, Pixel, Wiki, GALAXY_SNAPSHOT: SNAPSHOT } = window;
  const $ = (id) => document.getElementById(id);
  const QUESTION_TIME = 20;
  const QUESTION_COUNT = 10;
  const API = "https://swapi.info/api";

  const SIDES = {
    light: {
      label: "Lado da Luz",
      ship: () => Pixel.sprite("xwing"),
      flip: false,
      target: () => Art.photo("Death Star", { kind: "planet", src: Art.SCENES.deathStar, eager: true }),
      win: "A Estrela da Morte explodiu e a Rebelião comemora.",
      lose: "A Estrela da Morte segue inteira, e o treino recomeça em Dagobah.",
      crawlLine: "O esquadrão rebelde mergulha na trincheira.",
      scenes: { win: "lightWin", lose: "deathStar" },
    },
    dark: {
      label: "Lado Sombrio",
      ship: () => Pixel.sprite("tie"),
      flip: false,
      target: () => Art.photo("Yavin IV", { eager: true }),
      win: "A base rebelde foi encontrada e a frota imperial já está em órbita.",
      lose: "A base rebelde escapou, e o Imperador não gostou de saber.",
      crawlLine: "A frota imperial varre a Orla Exterior.",
      scenes: { win: "darkWin", lose: "falcon" },
    },
  };

  const PLAY_MODES = { solo: "Solo", duel: "Duelo · 2 jogadores" };
  const DUEL_KEYS = [["1", "2", "3", "4"], ["7", "8", "9", "0"]];
  const LETTERS = ["A", "B", "C", "D"];

  const state = {
    index: Quiz.buildIndex(SNAPSHOT),
    mode: "solo",
    names: ["", ""],
    hp: [Quiz.DUEL.hp, Quiz.DUEL.hp],
    picks: [null, null],
    duelCorrect: [0, 0],
    side: null,
    category: "all",
    questions: [],
    spares: [],
    position: 0,
    score: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    answered: false,
    timeLeft: QUESTION_TIME,
    timer: null,
    forceLeft: 1,
    jumpLeft: 1,
    misses: [],
    soundOn: true,
  };

  // Armazenamento pode estar bloqueado; o jogo funciona sem ele.
  const store = {
    get(key, fallback) {
      try { return window.localStorage.getItem(`swquiz:${key}`) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { window.localStorage.setItem(`swquiz:${key}`, value); } catch { /* segue sem salvar */ }
    },
  };

  /* ---------- Som sintetizado, iniciado por um clique ---------- */
  let audio = null;
  function tone({ from, to, duration, type = "square", gain = 0.04, delay = 0 }) {
    if (!state.soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const start = audio.currentTime + delay;
      const osc = audio.createOscillator();
      const amp = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, start);
      osc.frequency.exponentialRampToValueAtTime(to, start + duration);
      amp.gain.setValueAtTime(gain, start);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(amp).connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration);
    } catch { /* navegador sem audio */ }
  }
  const sfx = {
    ignite() { tone({ from: 70, to: 240, duration: 0.45 }); tone({ from: 110, to: 90, duration: 0.8, delay: 0.3, gain: 0.02 }); },
    right() { tone({ from: 660, to: 880, duration: 0.12, type: "square", gain: 0.03 }); tone({ from: 880, to: 1320, duration: 0.16, type: "square", gain: 0.03, delay: 0.11 }); },
    wrong() { tone({ from: 150, to: 60, duration: 0.4, type: "triangle", gain: 0.12 }); },
    jump() { tone({ from: 90, to: 1400, duration: 0.7, gain: 0.03 }); },
  };

  /* ---------- Campo de estrelas com salto para o hiperespaco ---------- */
  const starfield = (function () {
    const canvas = $("stars");
    const ctx = canvas.getContext("2d");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars = [];
    let width = 0;
    let height = 0;
    let warp = 0;
    let warpTarget = 0;

    // Desenha em um terco da resolucao e o CSS amplia sem suavizar: cada estrela vira um bloco.
    const BLOCK = 3;
    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.ceil(width / BLOCK);
      canvas.height = Math.ceil(height / BLOCK);
      ctx.setTransform(1 / BLOCK, 0, 0, 1 / BLOCK, 0, 0);
      const count = Math.round(Math.min(420, (width * height) / 3600));
      stars = Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * width,
        y: (Math.random() - 0.5) * height,
        z: Math.random(),
      }));
      if (calm) paint(0.0);
    }

    function paint(speed) {
      ctx.fillStyle = warp > 0.05 ? "rgba(0,0,0,.34)" : "#000000";
      ctx.fillRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      stars.forEach((star) => {
        const scale = 1 / (star.z + 0.08);
        const x = cx + (star.x * scale) / 3;
        const y = cy + (star.y * scale) / 3;
        star.z -= speed;
        if (star.z <= 0 || x < -50 || x > width + 50 || y < -50 || y > height + 50) {
          star.z = 1;
          star.x = (Math.random() - 0.5) * width;
          star.y = (Math.random() - 0.5) * height;
          return;
        }
        const scaleNext = 1 / (star.z + 0.08);
        const stretch = 1 + warp * 16;
        if (warp <= 0.05) {
          ctx.fillStyle = star.z < 0.35 ? "#fcfcfc" : star.z < 0.7 ? "#a4e4fc" : "#7c7c7c";
          const size = star.z < 0.2 ? BLOCK * 2 : BLOCK;
          ctx.fillRect(Math.round(x / BLOCK) * BLOCK, Math.round(y / BLOCK) * BLOCK, size, size);
          return;
        }
        ctx.strokeStyle = star.z < 0.5 ? "#fcfcfc" : "#3cbcfc";
        ctx.lineWidth = BLOCK;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(cx + ((star.x * scaleNext) / 3 - (x - cx)) * stretch + (x - cx), cy + ((star.y * scaleNext) / 3 - (y - cy)) * stretch + (y - cy));
        ctx.lineTo(x + 0.6, y + 0.6);
        ctx.stroke();
      });
    }

    function loop() {
      warp += (warpTarget - warp) * 0.09;
      paint(0.0007 + warp * 0.035);
      requestAnimationFrame(loop);
    }

    window.addEventListener("resize", resize);
    resize();
    if (!calm) loop();

    return {
      jump(ms = 750) {
        if (calm) return Promise.resolve();
        sfx.jump();
        warpTarget = 1;
        // A foto do tunel do hiperespaco cresce por cima das estrelas esticadas.
        const hyper = $("hyper");
        hyper.classList.remove("on");
        void hyper.offsetWidth;
        hyper.style.setProperty("--jump", `${ms + 500}ms`);
        hyper.classList.add("on");
        return new Promise((resolve) => {
          setTimeout(() => { warpTarget = 0; resolve(); }, ms);
        });
      },
    };
  })();

  /* ---------- Navegacao ---------- */
  function show(screen) {
    ["screen-home", "screen-quiz", "screen-result"].forEach((id) => { $(id).hidden = id !== screen; });
    document.body.dataset.screen = screen.replace("screen-", "");
    if (screen !== "screen-quiz") $("backdrop").classList.remove("on");
    window.scrollTo(0, 0);
  }

  function renderHome() {
    document.body.dataset.side = "none";
    $("best-light").textContent = store.get("best:light", "0");
    $("best-dark").textContent = store.get("best:dark", "0");
    show("screen-home");
  }

  const playerName = (i) => state.names[i].trim() || `Jogador ${i + 1}`;
  const isDuel = () => state.mode === "duel";

  function renderPlayModes() {
    $("play-modes").innerHTML = "";
    Object.entries(PLAY_MODES).forEach(([key, label]) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = label;
      chip.setAttribute("aria-pressed", String(key === state.mode));
      chip.addEventListener("click", () => {
        state.mode = key;
        store.set("mode", key);
        renderPlayModes();
      });
      $("play-modes").append(chip);
    });
    $("duel-names").hidden = !isDuel();
    // No duelo os dois lados comecam a mesma partida.
    document.querySelectorAll(".side").forEach((button) => {
      const goal = button.querySelector(".side-goal");
      const cta = button.querySelector(".side-cta");
      goal.dataset.solo = goal.dataset.solo || goal.textContent;
      cta.dataset.solo = cta.dataset.solo || cta.textContent;
      const player = button.dataset.side === "light" ? 0 : 1;
      goal.textContent = isDuel() ? `${playerName(player)} joga com as teclas ${DUEL_KEYS[player][0]} a ${DUEL_KEYS[player][3]}.` : goal.dataset.solo;
      cta.textContent = isDuel() ? "Começar duelo" : cta.dataset.solo;
    });
  }

  function renderModes() {
    $("modes").innerHTML = "";
    Object.entries(Quiz.CATEGORIES).forEach(([key, label]) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = label;
      chip.setAttribute("aria-pressed", String(key === state.category));
      chip.addEventListener("click", () => {
        state.category = key;
        store.set("category", key);
        renderModes();
      });
      $("modes").append(chip);
    });
  }

  /* ---------- Partida ---------- */
  function setDuelLayout(on) {
    $("duel-hud").hidden = !on;
    $("duel-pads").hidden = !on;
    $("track").hidden = on;
    document.querySelector(".hud-stats").hidden = on;
  }

  async function startGame(side) {
    if (isDuel()) { startDuel(); return; }
    setDuelLayout(false);
    state.side = side;
    Object.assign(state, {
      position: 0, score: 0, correct: 0, streak: 0, bestStreak: 0, forceLeft: 1, jumpLeft: 1, misses: [],
    });
    const pool = Quiz.generate(state.index, { category: state.category, count: QUESTION_COUNT + 1 });
    state.questions = pool.slice(0, QUESTION_COUNT);
    state.spares = pool.slice(QUESTION_COUNT);
    document.body.dataset.side = side;
    sfx.ignite();
    const config = SIDES[side];
    $("track-ship").innerHTML = config.ship();
    $("track-ship").classList.toggle("flip", config.flip);
    $("track-target").innerHTML = config.target();
    $("score").textContent = "0";
    $("streak").textContent = "x1";
    $("use-force").disabled = false;
    $("use-jump").disabled = false;
    await starfield.jump();
    show("screen-quiz");
    renderQuestion();
  }

  /* ---------- Duelo ---------- */
  async function startDuel() {
    setDuelLayout(true);
    state.side = "duel";
    Object.assign(state, {
      position: 0, hp: [Quiz.DUEL.hp, Quiz.DUEL.hp], duelCorrect: [0, 0], picks: [null, null], misses: [],
    });
    state.questions = Quiz.generate(state.index, { category: state.category, count: Quiz.DUEL.maxRounds });
    document.body.dataset.side = "duel";
    sfx.ignite();
    [0, 1].forEach((i) => {
      $(`hud-name-${i}`).textContent = playerName(i);
      $(`pad-name-${i}`).textContent = playerName(i);
    });
    paintLife();
    await starfield.jump();
    show("screen-quiz");
    renderDuelQuestion();
  }

  function paintLife(hits = [false, false]) {
    [0, 1].forEach((i) => {
      $(`hp-${i}`).textContent = state.hp[i];
      $(`hp-bar-${i}`).style.width = `${(state.hp[i] / Quiz.DUEL.hp) * 100}%`;
      const life = $(`hp-${i}`).closest(".life");
      life.classList.remove("hit");
      if (hits[i]) { void life.offsetWidth; life.classList.add("hit"); }
    });
  }

  function renderDuelQuestion() {
    const question = state.questions[state.position];
    state.answered = false;
    state.picks = [null, null];
    state.timeLeft = QUESTION_TIME;
    paintHolo(question);
    $("q-meta").textContent = `Rodada ${state.position + 1} · ${Quiz.CATEGORIES[question.cat]}`;
    $("q-prompt").textContent = question.prompt;
    $("reveal").hidden = true;
    $("lifelines").hidden = true;
    $("q-options").innerHTML = "";
    // As alternativas so mostram o texto; quem responde sao os paineis de cada jogador.
    question.options.forEach((text, i) => {
      const row = document.createElement("div");
      row.className = "option";
      row.dataset.index = i;
      optionBody(row, i, LETTERS[i], text);
      $("q-options").append(row);
    });
    document.querySelectorAll(".pad").forEach((pad) => {
      const player = Number(pad.dataset.player);
      pad.classList.remove("locked");
      $(`pad-status-${player}`).textContent = "Pensando";
      $(`pad-status-${player}`).classList.remove("miss");
      const keys = pad.querySelector(".pad-keys");
      keys.innerHTML = "";
      question.options.forEach((_, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-label", `${playerName(player)} responde ${LETTERS[i]}`);
        button.innerHTML = `${LETTERS[i]}<small>tecla ${DUEL_KEYS[player][i]}</small>`;
        button.addEventListener("click", () => lockIn(player, i));
        keys.append(button);
      });
    });
    paintTimer();
    clearInterval(state.timer);
    state.timer = setInterval(tick, 100);
    $("q-prompt").focus({ preventScroll: true });
  }

  function lockIn(player, choice) {
    if (state.answered || state.picks[player]) return;
    state.picks[player] = { choice, time: QUESTION_TIME - state.timeLeft };
    const pad = document.querySelector(`.pad[data-player="${player}"]`);
    pad.classList.add("locked");
    pad.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    // A escolha fica escondida ate os dois travarem.
    $(`pad-status-${player}`).textContent = "Resposta travada";
    tone({ from: player ? 330 : 440, to: player ? 300 : 520, duration: 0.1, type: "square", gain: 0.025 });
    if (state.picks[0] && state.picks[1]) resolveDuel();
  }

  function resolveDuel() {
    if (state.answered) return;
    state.answered = true;
    clearInterval(state.timer);
    const question = state.questions[state.position];
    const result = Quiz.resolveDuelRound(question.answer, state.picks);
    state.hp = state.hp.map((value, i) => Math.max(0, value - result.damage[i]));
    result.right.forEach((isRight, i) => { if (isRight) state.duelCorrect[i]++; });
    if (!result.right[0] && !result.right[1]) state.misses.push(question);

    document.querySelectorAll(".option").forEach((row) => {
      const i = Number(row.dataset.index);
      row.classList.add(i === question.answer ? "is-right" : "dim");
      state.picks.forEach((pick, player) => {
        if (pick && pick.choice === i) {
          const badge = document.createElement("span");
          badge.className = `pick-badge p${player}`;
          badge.textContent = playerName(player);
          row.append(badge);
          if (i !== question.answer) row.classList.replace("dim", "is-wrong");
        }
      });
    });
    document.querySelectorAll(".pad").forEach((pad) => {
      const player = Number(pad.dataset.player);
      pad.querySelectorAll("button").forEach((button) => { button.disabled = true; });
      const pick = state.picks[player];
      $(`pad-status-${player}`).textContent = !pick ? "Sem resposta" : result.right[player] ? "Acertou" : "Errou";
      $(`pad-status-${player}`).classList.toggle("miss", !result.right[player]);
    });

    const [a, b] = [playerName(0), playerName(1)];
    let verdict;
    if (result.right[0] && result.right[1]) {
      verdict = result.fastest === -1 ? "Os dois acertaram" : `Os dois acertaram, ${playerName(result.fastest)} foi mais rápido`;
    } else if (result.right[0] || result.right[1]) {
      verdict = `Golpe de ${result.right[0] ? a : b}`;
    } else {
      verdict = "Ninguém acertou";
    }
    const hits = result.damage.map((dmg, i) => (dmg ? `${playerName(i)} perde ${dmg} de vida` : "")).filter(Boolean);
    $("reveal-verdict").textContent = verdict;
    $("reveal-verdict").className = `verdict ${hits.length ? "good" : "bad"}`;
    $("reveal-fact").textContent = `${hits.length ? `${hits.join(" e ")}. ` : ""}${question.fact}`;
    renderScale(question);
    paintLife(result.damage.map(Boolean));
    if (hits.length) sfx.right(); else sfx.wrong();

    const { over } = Quiz.duelOutcome(state.hp, state.position + 1);
    $("next").textContent = over ? "Ver resultado do duelo" : "Próxima rodada";
    $("reveal").hidden = false;
    $("next").focus({ preventScroll: true });
    $("reveal").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function renderDuelResult() {
    clearInterval(state.timer);
    const rounds = state.position + 1;
    const { winner } = Quiz.duelOutcome(state.hp, rounds);
    document.body.dataset.side = winner === 0 ? "light" : winner === 1 ? "dark" : "duel";
    const winnerSide = winner === 0 ? "Lado da Luz" : "Lado Sombrio";
    paintHero(winner === 0 ? "lightWin" : winner === 1 ? "darkWin" : "hyperspace");
    $("result-side").textContent = `Duelo · ${rounds} ${rounds === 1 ? "rodada" : "rodadas"}`;
    $("result-rank").textContent = winner === -1 ? "Empate" : `Vitória de ${playerName(winner)}`;
    $("result-label-1").textContent = `Acertos de ${playerName(0)}`;
    $("result-correct").textContent = `${state.duelCorrect[0]}/${rounds}`;
    $("result-label-2").textContent = `Acertos de ${playerName(1)}`;
    $("result-score").textContent = `${state.duelCorrect[1]}/${rounds}`;
    $("result-label-3").textContent = "Vida restante";
    $("result-best").textContent = `${state.hp[0]} × ${state.hp[1]}`;
    const loser = winner === 0 ? 1 : 0;
    $("result-summary").textContent = winner === -1
      ? "Os sabres se cruzaram até o fim e ninguém cedeu."
      : state.hp[loser] === 0
        ? `${playerName(winner)} derrubou ${playerName(loser)} e o ${winnerSide} vence o duelo.`
        : `Depois de ${rounds} rodadas, ${playerName(winner)} terminou com mais vida e o ${winnerSide} vence.`;
    $("copy-text").hidden = true;
    $("switch-side").textContent = "Voltar ao início";

    const crawl = $("crawl");
    crawl.innerHTML = "";
    [
      { head: `Episódio ${Quiz.ROMAN[Math.min(10, Math.max(1, rounds))]}` },
      { head: winner === -1 ? "O duelo sem vencedor" : `O triunfo de ${playerName(winner)}` },
      { text: `${playerName(0)}, do Lado da Luz, e ${playerName(1)}, do Lado Sombrio, se enfrentaram em ${rounds} rodadas de perguntas sobre a galáxia.` },
      { text: $("result-summary").textContent },
      { text: "Mas toda rivalidade pede revanche, e os sabres já estão acesos de novo..." },
    ].forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line.head || line.text;
      if (line.head) p.className = "crawl-head";
      crawl.append(p);
    });

    $("review").innerHTML = "";
    state.misses.forEach((question) => {
      const item = document.createElement("li");
      const answerText = document.createElement("small");
      answerText.textContent = `Resposta: ${question.options[question.answer]}. ${question.fact}`;
      const body = document.createElement("div");
      body.textContent = question.prompt;
      body.append(answerText);
      item.innerHTML = Art.thumb(question.options[question.answer]) || Art.thumb(question.art.name || "");
      item.append(body);
      $("review").append(item);
    });
    $("review-wrap").hidden = state.misses.length === 0;
    show("screen-result");
  }

  // Foto da pergunta no holoprojetor, a mesma foto desfocada ao fundo, e a proxima ja pre-carregada.
  function paintHolo(question) {
    const holo = Art.holoFor(question);
    $("holo-media").innerHTML = holo.html;
    $("holo-caption").textContent = holo.caption;
    $("holo").dataset.kind = holo.kind;
    $("holo").classList.remove("flicker");
    void $("holo").offsetWidth;
    $("holo").classList.add("flicker");
    const backdrop = $("backdrop");
    if (holo.src) {
      Pixel.paint(backdrop, holo.src, { block: 16, dither: 20 });
      backdrop.classList.add("on");
    } else {
      backdrop.classList.remove("on");
    }
    const upcoming = state.questions[state.position + 1];
    if (upcoming) {
      Art.sourcesFor(upcoming).forEach((src) => {
        const img = new Image();
        img.referrerPolicy = "no-referrer";
        img.src = src;
      });
    }
  }

  // Alternativa com miniatura quando o texto e um personagem, nave, planeta ou filme.
  function optionBody(element, i, keyText, text) {
    const key = document.createElement("kbd");
    key.textContent = keyText;
    const label = document.createElement("span");
    label.className = "option-label";
    label.textContent = text;
    element.append(key);
    const thumb = Art.thumb(text);
    if (thumb) {
      element.insertAdjacentHTML("beforeend", thumb);
      element.classList.add("has-thumb");
    }
    element.append(label);
    element.style.setProperty("--i", i);
  }

  function renderQuestion() {
    if (isDuel()) { renderDuelQuestion(); return; }
    const question = state.questions[state.position];
    state.answered = false;
    state.timeLeft = QUESTION_TIME;
    paintHolo(question);
    $("q-meta").textContent = `Pergunta ${state.position + 1} de ${state.questions.length} · ${Quiz.CATEGORIES[question.cat]}`;
    $("q-prompt").textContent = question.prompt;
    $("track-ship").style.left = `${(state.position / state.questions.length) * 100}%`;
    $("reveal").hidden = true;
    $("lifelines").hidden = false;
    $("q-options").innerHTML = "";
    question.options.forEach((text, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.dataset.index = i;
      optionBody(button, i, i + 1, text);
      button.addEventListener("click", () => answer(i));
      $("q-options").append(button);
    });
    $("use-force").disabled = state.forceLeft === 0 || question.options.length < 4;
    $("use-jump").disabled = state.jumpLeft === 0 || !state.spares.length;
    paintTimer();
    clearInterval(state.timer);
    state.timer = setInterval(tick, 100);
    $("q-prompt").focus({ preventScroll: true });
  }

  function tick() {
    state.timeLeft = Math.max(0, state.timeLeft - 0.1);
    paintTimer();
    if (state.timeLeft === 0) {
      if (isDuel()) resolveDuel(); else answer(-1);
    }
  }

  function paintTimer() {
    $("fuel-bar").style.transform = `scaleX(${state.timeLeft / QUESTION_TIME})`;
    $("timer-readout").textContent = `${Math.ceil(state.timeLeft)}s`;
    $("duel-timer").textContent = `${Math.ceil(state.timeLeft)}s`;
  }

  function answer(choice) {
    if (state.answered) return;
    state.answered = true;
    clearInterval(state.timer);
    const question = state.questions[state.position];
    const isRight = choice === question.answer;

    document.querySelectorAll(".option").forEach((button) => {
      const i = Number(button.dataset.index);
      button.disabled = true;
      if (i === question.answer) button.classList.add("is-right");
      if (i === choice && !isRight) button.classList.add("is-wrong");
    });

    let verdict;
    if (isRight) {
      const { points, multiplier } = Quiz.pointsFor({ timeLeft: state.timeLeft, timeTotal: QUESTION_TIME, streak: state.streak });
      state.score += points;
      state.correct++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      verdict = `+${points} pontos${multiplier > 1 ? ` (x${String(multiplier).replace(".", ",")})` : ""}`;
      sfx.right();
    } else {
      state.streak = 0;
      state.misses.push(question);
      verdict = choice === -1 ? "O tempo acabou" : "Errou o alvo";
      sfx.wrong();
    }

    $("score").textContent = Quiz.formatNumber(state.score);
    const nextMultiplier = Quiz.pointsFor({ timeLeft: 0, timeTotal: 1, streak: state.streak }).multiplier;
    $("streak").textContent = `x${String(nextMultiplier).replace(".", ",")}`;
    $("reveal-verdict").textContent = verdict;
    $("reveal-verdict").className = `verdict ${isRight ? "good" : "bad"}`;
    $("reveal-fact").textContent = question.fact;
    renderScale(question);
    $("lifelines").hidden = true;
    $("reveal").hidden = false;
    $("track-ship").style.left = `${((state.position + 1) / state.questions.length) * 100}%`;
    const isLast = state.position === state.questions.length - 1;
    $("next").textContent = isLast ? "Ver resultado da missão" : "Próxima pergunta";
    $("next").focus({ preventScroll: true });
    $("reveal").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // Barras em escala real: ao lado da Estrela da Morte, um X-wing vira um risco.
  function renderScale(question) {
    const box = $("reveal-scale");
    box.innerHTML = "";
    if (!question.scale) return;
    const max = Math.max(...question.scale.map((row) => row.value));
    const correctLabel = question.options[question.answer];
    question.scale.slice().sort((a, b) => b.value - a.value).forEach((row) => {
      const wrap = document.createElement("div");
      wrap.className = `scale-row${row.label === correctLabel ? " top" : ""}`;
      const head = document.createElement("header");
      const name = document.createElement("span");
      name.className = "scale-name";
      name.insertAdjacentHTML("beforeend", Art.thumb(row.label));
      name.append(row.label);
      const value = document.createElement("span");
      value.textContent = row.unit === "classe" ? `classe ${Quiz.formatNumber(row.value)}` : `${Quiz.formatNumber(row.value)} ${row.unit}`;
      head.append(name, value);
      const bar = document.createElement("div");
      bar.className = "scale-bar";
      const fill = document.createElement("i");
      fill.style.setProperty("--w", `${(row.value / max) * 100}%`);
      bar.append(fill);
      wrap.append(head, bar);
      box.append(wrap);
    });
  }

  async function nextQuestion() {
    if (isDuel()) {
      if (Quiz.duelOutcome(state.hp, state.position + 1).over) {
        await starfield.jump(500);
        renderDuelResult();
        return;
      }
      state.position++;
      renderDuelQuestion();
      return;
    }
    if (state.position === state.questions.length - 1) {
      await starfield.jump(500);
      renderResult();
      return;
    }
    state.position++;
    renderQuestion();
  }

  function useForce() {
    if (state.forceLeft === 0 || state.answered) return;
    state.forceLeft = 0;
    $("use-force").disabled = true;
    const question = state.questions[state.position];
    const wrong = question.options.map((_, i) => i).filter((i) => i !== question.answer);
    wrong.sort(() => Math.random() - 0.5).slice(0, 2).forEach((i) => {
      document.querySelector(`.option[data-index="${i}"]`).classList.add("struck");
    });
    tone({ from: 300, to: 180, duration: 0.5, type: "sine", gain: 0.07 });
  }

  async function useJump() {
    if (state.jumpLeft === 0 || state.answered || !state.spares.length) return;
    state.jumpLeft = 0;
    clearInterval(state.timer);
    state.questions[state.position] = state.spares.shift();
    await starfield.jump(450);
    renderQuestion();
  }

  /* ---------- Resultado ---------- */
  function renderResult() {
    clearInterval(state.timer);
    const side = state.side;
    const config = SIDES[side];
    const total = state.questions.length;
    const rank = Quiz.rankFor(side, state.correct, total);
    const won = rank.tier >= 2;
    const best = Math.max(Number(store.get(`best:${side}`, "0")) || 0, state.score);
    store.set(`best:${side}`, String(best));

    paintHero(config.scenes[won ? "win" : "lose"]);
    $("result-side").textContent = config.label;
    $("result-rank").textContent = rank.name;
    $("result-label-1").textContent = "Acertos";
    $("result-label-2").textContent = "Pontos";
    $("result-label-3").textContent = "Recorde";
    $("switch-side").textContent = "Trocar de lado";
    $("result-correct").textContent = `${state.correct}/${total}`;
    $("result-score").textContent = Quiz.formatNumber(state.score);
    $("result-best").textContent = Quiz.formatNumber(best);
    $("result-summary").textContent = `${won ? config.win : config.lose} Melhor sequência: ${state.bestStreak} ${state.bestStreak === 1 ? "acerto" : "acertos"}.`;
    $("copy-text").hidden = true;

    const crawl = $("crawl");
    crawl.innerHTML = "";
    const lines = [
      { head: `Episódio ${Quiz.ROMAN[Math.max(1, state.correct)]}` },
      { head: `A ascensão de ${rank.name}` },
      { text: `${config.crawlLine} Em ${total} perguntas sobre a galáxia, o piloto acertou ${state.correct} e somou ${Quiz.formatNumber(state.score)} pontos.` },
      { text: won ? config.win : config.lose },
      { text: "Mas a galáxia é muito grande, e o próximo holocron já está à espera de quem tiver coragem de abri-lo..." },
    ];
    lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line.head || line.text;
      if (line.head) p.className = "crawl-head";
      crawl.append(p);
    });

    $("review").innerHTML = "";
    state.misses.forEach((question) => {
      const item = document.createElement("li");
      const answerText = document.createElement("small");
      answerText.textContent = `Resposta: ${question.options[question.answer]}. ${question.fact}`;
      const body = document.createElement("div");
      body.textContent = question.prompt;
      body.append(answerText);
      item.innerHTML = Art.thumb(question.options[question.answer]) || Art.thumb(question.art.name || "");
      item.append(body);
      $("review").append(item);
    });
    $("review-wrap").hidden = state.misses.length === 0;
    show("screen-result");
  }

  function paintHero(scene) {
    const src = Art.SCENES[scene];
    Pixel.paint($("result-hero"), src, { block: 5, fit: scene === "deathStar" ? "contain" : "cover" });
    $("result-hero").dataset.scene = scene;
  }

  function duelSummary() {
    const rounds = state.position + 1;
    const { winner } = Quiz.duelOutcome(state.hp, rounds);
    const score = `${playerName(0)} ${state.hp[0]} × ${state.hp[1]} ${playerName(1)}`;
    return winner === -1
      ? `Star Wars Quiz: duelo empatado em ${rounds} rodadas (${score}).`
      : `Star Wars Quiz: ${playerName(winner)} venceu o duelo em ${rounds} rodadas (${score}).`;
  }

  function copyResult() {
    const rank = isDuel() ? null : Quiz.rankFor(state.side, state.correct, state.questions.length);
    const text = isDuel()
      ? duelSummary()
      : `Star Wars Quiz: virei ${rank.name} no ${SIDES[state.side].label}, com ${state.correct}/${state.questions.length} acertos e ${Quiz.formatNumber(state.score)} pontos.`;
    const button = $("copy");
    const fallback = () => {
      $("copy-text").textContent = text;
      $("copy-text").hidden = false;
      button.textContent = "Selecione o texto abaixo";
    };
    if (!navigator.clipboard) { fallback(); return; }
    navigator.clipboard.writeText(text).then(() => { button.textContent = "Copiado"; }, fallback);
  }

  /* ---------- Dados ao vivo, com a copia local como reserva ---------- */
  async function loadLiveData() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const entries = await Promise.all(Quiz.RESOURCES.map(async (resource) => {
        const response = await fetch(`${API}/${resource}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`${resource}: ${response.status}`);
        const items = await response.json();
        if (!Array.isArray(items) || !items.length) throw new Error(`${resource}: vazio`);
        return [resource, items];
      }));
      state.index = Quiz.buildIndex(Object.fromEntries(entries));
      if (!Quiz.generate(state.index, { count: QUESTION_COUNT }).length) throw new Error("dados inesperados");
      $("data-status").textContent = "SWAPI ao vivo";
    } catch {
      state.index = Quiz.buildIndex(SNAPSHOT);
      $("data-status").textContent = `Cópia local (${SNAPSHOT.syncedAt.split("-").reverse().join("/")})`;
    } finally {
      clearTimeout(timeout);
    }
  }

  /* ---------- Eventos ---------- */
  document.querySelectorAll(".side").forEach((button) => {
    button.addEventListener("click", () => startGame(button.dataset.side));
  });
  $("next").addEventListener("click", nextQuestion);
  $("use-force").addEventListener("click", useForce);
  $("use-jump").addEventListener("click", useJump);
  $("quit").addEventListener("click", () => { clearInterval(state.timer); renderHome(); });
  $("again").addEventListener("click", () => { $("copy").textContent = "Copiar resultado"; startGame(state.side); });
  $("switch-side").addEventListener("click", () => { $("copy").textContent = "Copiar resultado"; renderHome(); });
  $("copy").addEventListener("click", copyResult);
  $("sound").addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    store.set("sound", state.soundOn ? "on" : "off");
    paintSound();
  });
  function paintSound() {
    $("sound").textContent = state.soundOn ? "Som ligado" : "Som desligado";
    $("sound").setAttribute("aria-pressed", String(state.soundOn));
  }

  document.addEventListener("keydown", (event) => {
    if ($("screen-quiz").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (isDuel()) {
      if (state.answered || event.target.matches("input")) return;
      [0, 1].forEach((player) => {
        const choice = DUEL_KEYS[player].indexOf(event.key);
        if (choice >= 0 && choice < state.questions[state.position].options.length) lockIn(player, choice);
      });
      return;
    }
    if (!state.answered && /^[1-4]$/.test(event.key)) {
      const option = document.querySelector(`.option[data-index="${Number(event.key) - 1}"]`);
      if (option && !option.classList.contains("struck")) answer(Number(event.key) - 1);
    }
  });

  /* ---------- Inicio ---------- */
  $("art-light").innerHTML = `${Art.lightScene()}`;
  $("art-dark").innerHTML = `${Art.darkScene()}
    <span class="fleet fleet-destroyer">${Art.destroyer()}</span>
    <span class="fleet fleet-tie-a">${Art.tie()}</span>
    <span class="fleet fleet-tie-b">${Art.tie()}</span>
    ${Art.vader()}`;
  const flyby = document.createElement("span");
  flyby.className = "fleet fleet-xwing";
  flyby.innerHTML = Art.xwing();
  $("art-light").append(flyby);
  $("art-light").insertAdjacentHTML("beforeend", Art.sceneImg("light"));
  $("art-dark").insertAdjacentHTML("beforeend", Art.sceneImg("dark"));
  Pixel.paint($("hyper"), Art.SCENES.hyperspace, { block: 6 });
  Pixel.clash($("clash-canvas"));

  // Galeria em loop: a lista aparece duas vezes para a rolagem nao ter emenda.
  // Cada card abre a ficha do holocron; a copia fica fora do Tab e dos leitores de tela.
  Wiki.init({
    index: () => state.index,
    sound: () => tone({ from: 520, to: 780, duration: 0.08, gain: 0.025 }),
  });
  const REELS = {
    "reel-people": ["Luke Skywalker", "Darth Vader", "Leia Organa", "Han Solo", "Chewbacca", "Yoda", "Obi-Wan Kenobi", "Palpatine",
      "R2-D2", "C-3PO", "Boba Fett", "Padmé Amidala", "Darth Maul", "Lando Calrissian", "Mace Windu", "Jabba Desilijic Tiure"],
    "reel-ships": ["Millennium Falcon", "X-wing", "TIE Advanced x1", "Star Destroyer", "Slave 1", "Y-wing", "A-wing", "Naboo fighter",
      "Jedi starfighter", "Imperial shuttle", "Republic attack cruiser", "B-wing", "Jedi Interceptor", "arc-170"],
    "reel-planets": ["Tatooine", "Alderaan", "Yavin IV", "Hoth", "Dagobah", "Bespin", "Endor", "Naboo", "Coruscant", "Kamino",
      "Geonosis", "Utapau", "Mustafar", "Kashyyyk"],
  };
  Object.entries(REELS).forEach(([id, names]) => {
    const card = (name, copy) => `<button type="button" class="card" data-wiki="${Wiki.idFor(name)}"${copy ? ' tabindex="-1" aria-hidden="true"' : ""}>`
      + `${Art.photo(name)}<span class="card-name">${name}</span></button>`;
    const visible = names.filter((name) => Art.srcOf(name) && Wiki.idFor(name));
    $(id).innerHTML = `<div class="reel-track">${visible.map((n) => card(n, false)).join("")}${visible.map((n) => card(n, true)).join("")}</div>`;
  });

  state.category = Quiz.CATEGORIES[store.get("category", "all")] ? store.get("category", "all") : "all";
  state.soundOn = store.get("sound", "on") === "on";
  state.mode = PLAY_MODES[store.get("mode", "solo")] ? store.get("mode", "solo") : "solo";
  state.names = [store.get("name:0", ""), store.get("name:1", "")];
  ["name-light", "name-dark"].forEach((id, player) => {
    $(id).value = state.names[player];
    $(id).addEventListener("input", () => {
      state.names[player] = $(id).value;
      store.set(`name:${player}`, $(id).value);
      renderPlayModes();
    });
  });
  paintSound();
  renderPlayModes();
  renderModes();
  renderHome();
  $("data-status").textContent = `Cópia local (${SNAPSHOT.syncedAt.split("-").reverse().join("/")})`;
  loadLiveData();
})();

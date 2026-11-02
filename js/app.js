// Interface do jogo: telas, cronometro, campo de estrelas, sons e dados ao vivo.
(function () {
  const { QuizEngine: Quiz, StarArt: Art, GALAXY_SNAPSHOT: SNAPSHOT } = window;
  const $ = (id) => document.getElementById(id);
  const QUESTION_TIME = 20;
  const QUESTION_COUNT = 10;
  const API = "https://swapi.info/api";

  const SIDES = {
    light: {
      label: "Lado da Luz",
      ship: Art.xwing,
      flip: true,
      target: Art.deathStar,
      win: "A Estrela da Morte explodiu e a Rebelião comemora.",
      lose: "A Estrela da Morte segue inteira, e o treino recomeça em Dagobah.",
      crawlLine: "O esquadrão rebelde mergulha na trincheira.",
    },
    dark: {
      label: "Lado Sombrio",
      ship: Art.tie,
      flip: false,
      target: Art.planet.bind(null, "Yavin IV", "temperate"),
      win: "A base rebelde foi encontrada e a frota imperial já está em órbita.",
      lose: "A base rebelde escapou, e o Imperador não gostou de saber.",
      crawlLine: "A frota imperial varre a Orla Exterior.",
    },
  };

  const state = {
    index: Quiz.buildIndex(SNAPSHOT),
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
  function tone({ from, to, duration, type = "sawtooth", gain = 0.05, delay = 0 }) {
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
    ignite() { tone({ from: 70, to: 240, duration: 0.45 }); tone({ from: 110, to: 90, duration: 0.8, delay: 0.3, gain: 0.03 }); },
    right() { tone({ from: 660, to: 880, duration: 0.12, type: "square", gain: 0.03 }); tone({ from: 880, to: 1320, duration: 0.16, type: "square", gain: 0.03, delay: 0.11 }); },
    wrong() { tone({ from: 150, to: 60, duration: 0.4, gain: 0.06 }); },
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

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(420, (width * height) / 3600));
      stars = Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * width,
        y: (Math.random() - 0.5) * height,
        z: Math.random(),
      }));
      if (calm) paint(0.0);
    }

    function paint(speed) {
      ctx.fillStyle = warp > 0.05 ? "rgba(5,6,12,.34)" : "#05060c";
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
        ctx.strokeStyle = `rgba(225,235,255,${Math.min(1, 1.15 - star.z)})`;
        ctx.lineWidth = warp > 0.05 ? 1.4 : Math.max(0.6, 1.5 - star.z);
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
        return new Promise((resolve) => {
          setTimeout(() => { warpTarget = 0; resolve(); }, ms);
        });
      },
    };
  })();

  /* ---------- Navegacao ---------- */
  function show(screen) {
    ["screen-home", "screen-quiz", "screen-result"].forEach((id) => { $(id).hidden = id !== screen; });
    window.scrollTo(0, 0);
  }

  function renderHome() {
    document.body.dataset.side = "none";
    $("best-light").textContent = store.get("best:light", "0");
    $("best-dark").textContent = store.get("best:dark", "0");
    show("screen-home");
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
  async function startGame(side) {
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

  function renderQuestion() {
    const question = state.questions[state.position];
    state.answered = false;
    state.timeLeft = QUESTION_TIME;
    $("holo").innerHTML = Art.forQuestion(question.art);
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
      const key = document.createElement("kbd");
      key.textContent = i + 1;
      const label = document.createElement("span");
      label.textContent = text;
      button.append(key, label);
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
    if (state.timeLeft === 0) answer(-1);
  }

  function paintTimer() {
    $("fuel-bar").style.transform = `scaleX(${state.timeLeft / QUESTION_TIME})`;
    $("timer-readout").textContent = `${Math.ceil(state.timeLeft)}s`;
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
      name.textContent = row.label;
      const value = document.createElement("span");
      value.textContent = row.unit === "classe" ? `classe ${Quiz.formatNumber(row.value)}` : `${Quiz.formatNumber(row.value)} ${row.unit}`;
      head.append(name, value);
      const bar = document.createElement("div");
      bar.className = "scale-bar";
      const fill = document.createElement("i");
      fill.style.width = `${(row.value / max) * 100}%`;
      bar.append(fill);
      wrap.append(head, bar);
      box.append(wrap);
    });
  }

  async function nextQuestion() {
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

    $("result-side").textContent = config.label;
    $("result-rank").textContent = rank.name;
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
      item.textContent = question.prompt;
      item.append(answerText);
      $("review").append(item);
    });
    $("review-wrap").hidden = state.misses.length === 0;
    show("screen-result");
  }

  function copyResult() {
    const rank = Quiz.rankFor(state.side, state.correct, state.questions.length);
    const text = `Star Wars Quiz: virei ${rank.name} no ${SIDES[state.side].label}, com ${state.correct}/${state.questions.length} acertos e ${Quiz.formatNumber(state.score)} pontos.`;
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

  state.category = Quiz.CATEGORIES[store.get("category", "all")] ? store.get("category", "all") : "all";
  state.soundOn = store.get("sound", "on") === "on";
  paintSound();
  renderModes();
  renderHome();
  $("data-status").textContent = `Cópia local (${SNAPSHOT.syncedAt.split("-").reverse().join("/")})`;
  loadLiveData();
})();

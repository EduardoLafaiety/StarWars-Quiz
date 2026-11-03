// Motor de pixel art: reduz cada foto a uma grade grossa, aplica a paleta do NES com pontilhado
// e redesenha sempre que o tamanho muda. Tambem desenha os sprites, o cursor e os sabres cruzados.
(function (root) {
  const calm = root.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Paleta aproximada do NES (sem os pretos repetidos), com um cinza-chumbo a mais para fotos escuras.
  const PALETTE = (
    "000000 3C3C3C 7C7C7C 0000FC 0000BC 4428BC 940084 A80020 A81000 881400 503000 007800 006800 005800 004058 " +
    "BCBCBC 0078F8 0058F8 6844FC D800CC E40058 F83800 E45C10 AC7C00 00B800 00A800 00A844 008888 " +
    "F8F8F8 3CBCFC 6888FC 9878F8 F878F8 F85898 F87858 FCA044 F8B800 B8F818 58D854 58F898 00E8D8 787878 " +
    "FCFCFC A4E4FC B8B8F8 D8B8F8 F8B8F8 F8A4C0 F0D0B0 FCE0A8 F8D878 D8F878 B8F8B8 B8F8D8 00FCFC F8D8F8"
  ).split(" ").map((hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)));

  // Matriz de Bayer 4x4: o pontilhado classico dos jogos antigos.
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

  const nearestCache = new Map();
  function nearest(r, g, b) {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const hit = nearestCache.get(key);
    if (hit !== undefined) return hit;
    let best = 0;
    let bestDistance = Infinity;
    PALETTE.forEach(([pr, pg, pb], i) => {
      const mean = (r + pr) / 2;
      const dr = r - pr;
      const dg = g - pg;
      const db = b - pb;
      const distance = (2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db;
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    });
    nearestCache.set(key, best);
    return best;
  }

  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  function quantize(ctx, w, h, strength) {
    let image;
    try { image = ctx.getImageData(0, 0, w, h); } catch { return; } // sem CORS: fica so pixelado
    const d = image.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
        const t = BAYER[(y & 3) * 4 + (x & 3)] * strength;
        const [r, g, b] = PALETTE[nearest(clamp(d[i] + t), clamp(d[i + 1] + t), clamp(d[i + 2] + t))];
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  // Tamanho do "pixel" em px de tela: miniaturas ficam com 2, fotos grandes com 5.
  const blockFor = (w, h) => Math.max(2, Math.min(5, Math.round(Math.min(w, h) / 64)));

  function paintAt(canvas, entry, block) {
    const { source, opts } = entry;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    if (!w || !h || !sw || !sh) return;
    const cw = Math.max(1, Math.round(w / block));
    const ch = Math.max(1, Math.round(h / block));
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, cw, ch);
    const pad = (opts.pad || 0) / block;
    const aw = Math.max(1, cw - pad * 2);
    const ah = Math.max(1, ch - pad * 2);
    const scale = opts.fit === "contain" ? Math.min(aw / sw, ah / sh) : Math.max(aw / sw, ah / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const [px, py] = opts.pos || [0.5, 0.5];
    // Mais contraste antes de reduzir as cores, para as formas sobreviverem a paleta curta.
    ctx.filter = opts.filter ?? "brightness(1.12) contrast(1.3) saturate(1.25)";
    ctx.drawImage(source, pad + (aw - dw) * px, pad + (ah - dh) * py, dw, dh);
    ctx.filter = "none";
    quantize(ctx, cw, ch, opts.dither ?? 22);
  }

  const managed = new WeakMap();
  function redraw(canvas) {
    const entry = managed.get(canvas);
    if (!entry) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const size = `${w}x${h}`;
    if (!w || !h || size === entry.size) return;
    const first = !entry.size;
    entry.size = size;
    const block = entry.opts.block || blockFor(w, h);
    clearTimeout(entry.timer);
    // Na primeira vez a imagem "entra em foco" em tres passos, como nos jogos antigos.
    if (first && !calm && Math.min(w, h) > 100) {
      paintAt(canvas, entry, block * 4);
      entry.timer = setTimeout(() => {
        paintAt(canvas, entry, block * 2);
        entry.timer = setTimeout(() => paintAt(canvas, entry, block), 110);
      }, 110);
    } else {
      paintAt(canvas, entry, block);
    }
  }
  const resizer = new ResizeObserver((entries) => entries.forEach((e) => redraw(e.target)));

  function mount(canvas, source, opts) {
    const old = managed.get(canvas);
    if (old) clearTimeout(old.timer);
    managed.set(canvas, { source, opts, size: "" });
    resizer.observe(canvas);
    redraw(canvas);
  }

  const parsePos = (value) => String(value || "50% 50%").split(" ").map((part) => {
    const n = parseFloat(part);
    return Number.isFinite(n) ? n / 100 : 0.5;
  }).concat([0.5, 0.5]).slice(0, 2);

  // Troca uma <img> carregada por um canvas pixelado que copia o enquadramento dela.
  function attach(img) {
    if (img.dataset.px) return;
    img.dataset.px = "1";
    const style = getComputedStyle(img);
    const canvas = document.createElement("canvas");
    canvas.className = `px ${img.className}`.replace(/\s*is-loaded/, "");
    canvas.setAttribute("aria-hidden", "true");
    img.after(canvas);
    img.classList.add("px-src");
    mount(canvas, img, {
      fit: style.objectFit === "contain" ? "contain" : "cover",
      pos: parsePos(style.objectPosition),
      pad: parseFloat(style.paddingLeft) || 0,
      block: Number(img.dataset.block) || 0,
    });
  }

  // Pinta uma foto dentro de um elemento qualquer (fundos de tela).
  function paint(el, src, opts = {}) {
    let canvas = el.querySelector(":scope > canvas.px");
    if (!src) { if (canvas) canvas.remove(); return; }
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "px";
      canvas.setAttribute("aria-hidden", "true");
      el.append(canvas);
    }
    canvas.dataset.src = src;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => { if (canvas.dataset.src === src) mount(canvas, img, { fit: "cover", ...opts }); };
    img.src = src;
  }

  // Desenhos em SVG (reserva quando a foto falha) tambem viram pixel art.
  function pixelSvg(svg) {
    if (svg.classList.contains("px-src") || !svg.isConnected) return;
    svg.classList.add("px-src");
    const clone = svg.cloneNode(true);
    const box = (svg.getAttribute("viewBox") || "0 0 100 100").split(/\s+/).map(Number);
    clone.setAttribute("width", box[2] * 4);
    clone.setAttribute("height", box[3] * 4);
    clone.style.color = getComputedStyle(svg).color;
    const img = new Image();
    const canvas = document.createElement("canvas");
    canvas.className = "px px-art";
    canvas.setAttribute("aria-hidden", "true");
    svg.after(canvas);
    img.onload = () => mount(canvas, img, { fit: "contain", dither: 10, filter: "none" });
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  }

  const SVG_TARGETS = ".photo.is-fallback .photo-fallback > svg, .holo-media > svg";
  new MutationObserver((mutations) => mutations.forEach((m) => m.addedNodes.forEach((node) => {
    if (node.nodeType !== 1) return;
    if (node.matches(SVG_TARGETS)) pixelSvg(node);
    node.querySelectorAll(SVG_TARGETS).forEach(pixelSvg);
  }))).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------- Sprites desenhados a mao ---------- */
  function spriteCanvas(rows, colors, scale = 1) {
    const canvas = document.createElement("canvas");
    canvas.width = rows[0].length * scale;
    canvas.height = rows.length * scale;
    const ctx = canvas.getContext("2d");
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (!colors[ch]) return;
      ctx.fillStyle = colors[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }));
    return canvas;
  }
  const spriteUrl = (rows, colors, scale) => spriteCanvas(rows, colors, scale).toDataURL();

  const SPRITES = {
    xwing: {
      rows: [
        "RW..............",
        "WGGG............",
        ".GGGG...........",
        "..GGGGGWWWWW....",
        "OOGGGGGGGGGRGGWW",
        "..GGGGGWWWWW....",
        ".GGGG...........",
        "WGGG............",
        "RW..............",
      ],
      colors: { W: "#fcfcfc", G: "#bcbcbc", R: "#f83800", O: "#fca044" },
    },
    tie: {
      rows: [
        "GG.........GG",
        "GD.........DG",
        "GD.........DG",
        "GD...KKK...DG",
        "GD..KBBBK..DG",
        "GGGGKBWBKGGGG",
        "GD..KBBBK..DG",
        "GD...KKK...DG",
        "GD.........DG",
        "GD.........DG",
        "GG.........GG",
      ],
      colors: { G: "#bcbcbc", D: "#7c7c7c", K: "#4428bc", B: "#0058f8", W: "#fcfcfc" },
    },
    check: {
      rows: ["......#", ".....##", "#...##.", "##.##..", ".###...", "..#...."],
      colors: { "#": "#000000" },
    },
    cross: {
      rows: ["#....#", "##..##", ".####.", "..##..", ".####.", "##..##", "#....#"],
      colors: { "#": "#000000" },
    },
    cursor: {
      rows: [
        "K.........",
        "KK........",
        "KWK.......",
        "KWWK......",
        "KWWWK.....",
        "KWWWWK....",
        "KWWWWWK...",
        "KWWWWWWK..",
        "KWWWWWWWK.",
        "KWWWWKKKKK",
        "KWKWWK....",
        "KK.KWWK...",
        "K..KWWK...",
        "....KWWK..",
        "....KWWK..",
        ".....KK...",
      ],
      colors: { K: "#000000", W: "#fcfcfc" },
    },
  };

  const sprite = (name, cls = "") => `<img class="sprite ${cls}" src="${spriteUrl(SPRITES[name].rows, SPRITES[name].colors, 1)}" alt="">`;

  // Icones e cursor viram variaveis de CSS.
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--icon-check", `url("${spriteUrl(SPRITES.check.rows, SPRITES.check.colors, 1)}")`);
  rootStyle.setProperty("--icon-cross", `url("${spriteUrl(SPRITES.cross.rows, SPRITES.cross.colors, 1)}")`);
  rootStyle.setProperty("--cursor", `url("${spriteUrl(SPRITES.cursor.rows, SPRITES.cursor.colors, 2)}") 0 0, auto`);

  /* ---------- Sabres cruzados, pixel a pixel ---------- */
  function clash(canvas) {
    const BLOCK = 4;
    const blades = [
      { angle: 17, glow: "#005800", mid: "#58d854", core: "#d8f878" },
      { angle: -17, glow: "#a81000", mid: "#f83800", core: "#fcfcfc" },
    ];
    let frame = 0;
    function draw() {
      const w = Math.round(canvas.clientWidth / BLOCK);
      const h = Math.round(canvas.clientHeight / BLOCK);
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      const cx = Math.round(w / 2);
      const cy = Math.round(h / 2);
      const half = h * 0.46;
      const hum = calm ? 1 : frame % 6 === 0 ? 0 : 1;
      const plot = (color, radius, blade) => {
        ctx.fillStyle = color;
        const rad = (blade.angle * Math.PI) / 180;
        const dx = Math.sin(rad);
        const dy = -Math.cos(rad);
        for (let t = -half; t <= half; t += 0.5) {
          ctx.fillRect(Math.round(cx + dx * t) - radius, Math.round(cy + dy * t) - radius, radius * 2 + 1, radius * 2 + 1);
        }
      };
      blades.forEach((b) => plot(b.glow, 1 + hum, b));
      blades.forEach((b) => plot(b.mid, 1, b));
      blades.forEach((b) => plot(b.core, 0, b));
      // Faisca no ponto de encontro.
      const size = calm ? 3 : 2 + ((frame * 7) % 4);
      [["#f8b800", size + 2], ["#fce0a8", size], ["#fcfcfc", Math.max(1, size - 2)]].forEach(([color, s]) => {
        ctx.fillStyle = color;
        ctx.fillRect(cx - s, cy - 1, s * 2 + 1, 3);
        ctx.fillRect(cx - 1, cy - s, 3, s * 2 + 1);
        ctx.fillRect(cx - Math.ceil(s / 2), cy - Math.ceil(s / 2), Math.ceil(s / 2) * 2 + 1, Math.ceil(s / 2) * 2 + 1);
      });
      frame++;
    }
    new ResizeObserver(draw).observe(canvas);
    if (!calm) setInterval(draw, 125);
  }

  root.Pixel = { attach, paint, pixelSvg, sprite, clash, PALETTE };
})(window);

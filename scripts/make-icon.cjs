// Desenha o ícone do site em pixel art (sabres cruzados numa grade de 16x16)
// e grava img/icon.svg, img/icon-64.png e img/icon-192.png.
// Uso: node scripts/make-icon.cjs
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const SIZE = 16;
const COLORS = {
  K: "#000000", // fundo
  g: "#005800", // brilho verde
  G: "#58d854", // lâmina verde
  W: "#d8f878", // miolo verde
  r: "#a81000", // brilho vermelho
  R: "#f83800", // lâmina vermelha
  P: "#fcfcfc", // miolo vermelho
  H: "#bcbcbc", // cabo
  h: "#7c7c7c", // sombra do cabo
  Y: "#f8b800", // faísca
  S: "#fcfcfc", // centro da faísca
};

const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill("K"));
const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) grid[y][x] = c; };

// Sabre verde: cabo embaixo à esquerda, lâmina subindo para a direita.
// Sabre vermelho: cabo embaixo à direita, lâmina subindo para a esquerda.
const sabers = [
  { at: (i) => [i, 15 - i], glow: "g", blade: "G", core: "W" },
  { at: (i) => [15 - i, 15 - i], glow: "r", blade: "R", core: "P" },
];
sabers.forEach(({ at, glow }) => { for (let i = 4; i <= 14; i++) { const [x, y] = at(i); put(x, y + 1, glow); put(x + (at(1)[0] === 1 ? -1 : 1), y, glow); } });
sabers.forEach(({ at, blade }) => { for (let i = 4; i <= 14; i++) { const [x, y] = at(i); put(x, y, blade); } });
sabers.forEach(({ at, core }) => { for (let i = 5; i <= 13; i += 2) { const [x, y] = at(i); put(x, y, core); } });
// Cabos com 2 pixels de espessura e uma faixa escura no meio.
sabers.forEach(({ at }) => {
  const side = at(1)[0] === 1 ? 1 : -1;
  for (let i = 1; i <= 3; i++) { const [x, y] = at(i); put(x, y, "H"); put(x + side, y, i === 2 ? "h" : "H"); }
});
// Faísca no cruzamento.
[[7, 6], [8, 6], [6, 7], [9, 7], [6, 8], [9, 8], [7, 9], [8, 9]].forEach(([x, y]) => put(x, y, "Y"));
[[7, 7], [8, 7], [7, 8], [8, 8]].forEach(([x, y]) => put(x, y, "S"));

const out = path.join(__dirname, "..", "img");
fs.mkdirSync(out, { recursive: true });

// SVG: um retângulo por pixel, sem suavização.
const rects = grid.flatMap((row, y) => row.map((c, x) => (c === "K" ? "" : `<rect x="${x}" y="${y}" width="1" height="1" fill="${COLORS[c]}"/>`))).join("");
fs.writeFileSync(path.join(out, "icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="#000"/>${rects}</svg>\n`);

// PNG sem dependências: cada pixel da grade vira um bloco de scale x scale.
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function png(scale) {
  const px = SIZE * scale;
  const raw = Buffer.alloc(px * (px * 3 + 1));
  for (let y = 0; y < px; y++) {
    raw[y * (px * 3 + 1)] = 0;
    for (let x = 0; x < px; x++) {
      const hex = COLORS[grid[Math.floor(y / scale)][Math.floor(x / scale)]];
      const i = y * (px * 3 + 1) + 1 + x * 3;
      raw[i] = parseInt(hex.slice(1, 3), 16); raw[i + 1] = parseInt(hex.slice(3, 5), 16); raw[i + 2] = parseInt(hex.slice(5, 7), 16);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(px, 0); header.writeUInt32BE(px, 4);
  header[8] = 8; header[9] = 2; // 8 bits, RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
fs.writeFileSync(path.join(out, "icon-64.png"), png(4));
fs.writeFileSync(path.join(out, "icon-192.png"), png(12));
console.log(grid.map((row) => row.join("")).join("\n"));

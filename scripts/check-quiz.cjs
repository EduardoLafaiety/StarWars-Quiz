// Gera milhares de partidas e confere as regras de cada pergunta.
// Uso: node scripts/check-quiz.cjs
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert");
const engine = require("../js/quiz.js");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../data/galaxy.js"), "utf8"), context);
const index = engine.buildIndex(context.window.GALAXY_SNAPSHOT);

const seen = {};
let total = 0;
for (const category of Object.keys(engine.CATEGORIES)) {
  for (let game = 0; game < 1500; game++) {
    const questions = engine.generate(index, { category, count: 10 });
    assert.strictEqual(questions.length, 10, `${category}: partida com ${questions.length} perguntas`);
    assert.strictEqual(new Set(questions.map((q) => q.key)).size, 10, `${category}: pergunta repetida`);
    for (const q of questions) {
      total++;
      seen[q.key.split(":")[0]] = (seen[q.key.split(":")[0]] || 0) + 1;
      assert.ok(q.options.length >= 3 && q.options.length <= 4, `${q.prompt}: ${q.options.length} alternativas`);
      assert.strictEqual(new Set(q.options).size, q.options.length, `alternativas repetidas: ${q.prompt} ${q.options}`);
      assert.ok(q.options.every(Boolean), `alternativa vazia: ${q.prompt}`);
      assert.ok(q.answer >= 0 && q.answer < q.options.length, `resposta fora da lista: ${q.prompt}`);
      if (q.scale) {
        const best = q.key.startsWith("hyper")
          ? q.scale.reduce((a, b) => (b.value < a.value ? b : a))
          : q.scale.reduce((a, b) => (b.value > a.value ? b : a));
        assert.strictEqual(best.label, q.options[q.answer], `resposta errada: ${q.prompt}`);
      }
    }
  }
}

assert.deepStrictEqual(engine.pointsFor({ timeLeft: 20, timeTotal: 20, streak: 0 }), { points: 150, multiplier: 1 });
assert.deepStrictEqual(engine.pointsFor({ timeLeft: 0, timeTotal: 20, streak: 2 }), { points: 150, multiplier: 1.5 });
assert.strictEqual(engine.pointsFor({ timeLeft: 0, timeTotal: 20, streak: 40 }).multiplier, 3);
assert.strictEqual(engine.rankFor("dark", 10, 10).name, "Lorde Sombrio");
assert.strictEqual(engine.rankFor("light", 0, 10).name, "Youngling");

console.log(`OK: ${total} perguntas conferidas`);
console.log(seen);

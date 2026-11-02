# Star Wars Quiz

Quiz de fã em HTML, CSS e JavaScript puros. Escolha o Lado da Luz (Luke) ou o Lado Sombrio (Vader) e responda 10 perguntas geradas a partir da [SWAPI](https://swapi.info).

## Rodar localmente

```bash
npx http-server . -p 4173
```

## Publicar no GitHub Pages

O projeto não tem etapa de build. Envie a pasta para um repositório e, em **Settings > Pages**, escolha a branch `main` e a pasta `/ (root)`.

## Como funciona

- `js/quiz.js`: gera as perguntas e calcula pontos e patentes. Não depende do navegador.
- `js/app.js`: telas, cronômetro, sons, estrelas e carregamento da API.
- `js/art.js`: ilustrações originais em SVG.
- `data/galaxy.js`: cópia local da SWAPI, usada se a API ao vivo não responder.

## Scripts

Atualizar a cópia local dos dados:

```bash
node scripts/sync-swapi.mjs
```

Gerar 7.500 partidas e conferir as regras das perguntas:

```bash
node scripts/check-quiz.cjs
```

Projeto de fã, sem vínculo com a Lucasfilm ou a Disney.

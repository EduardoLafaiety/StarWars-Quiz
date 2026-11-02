# Star Wars Quiz

**Jogue agora: https://eduardolafaiety.github.io/StarWars-Quiz/**

Quiz de fã em HTML, CSS e JavaScript puros. Escolha o Lado da Luz (Luke) ou o Lado Sombrio (Vader) e responda 10 perguntas geradas a partir da [SWAPI](https://swapi.info).

![Tela inicial com os sabres de luz cruzados entre o Lado da Luz e o Lado Sombrio](docs/screenshots/01-escolha-seu-lado.png)

## Primeira versão

| Pergunta com comparação em escala real | Resultado com a patente da partida |
| --- | --- |
| ![Pergunta sobre a nave mais comprida, com barras em escala real](docs/screenshots/02-pergunta-escala-real.png) | ![Tela de resultado com o texto de abertura rolando e a patente Aprendiz Sith](docs/screenshots/03-resultado.png) |

| No celular | Pergunta no celular |
| --- | --- |
| <img src="docs/screenshots/04-celular.png" alt="Tela inicial no celular" width="300"> | <img src="docs/screenshots/05-celular-pergunta.png" alt="Pergunta respondida no celular" width="300"> |

## O que tem no jogo

- Escolha de lado: a cor do sabre pinta a interface, e sua nave avança rumo ao alvo a cada pergunta.
- 16 tipos de pergunta sobre personagens, naves, planetas e filmes, em 5 modos de jogo.
- Barras em escala real depois das perguntas de comparação.
- 20 segundos por pergunta, multiplicador por sequência de acertos e recorde salvo no navegador.
- "Usar a Força" corta 2 alternativas, e "Saltar" troca a pergunta, uma vez cada por partida.
- Salto para o hiperespaço, sons sintetizados e atalhos de 1 a 4 no teclado.
- Patente final de Youngling a Mestre Jedi, ou de Acólito a Lorde Sombrio.

## Rodar localmente

```bash
npx http-server . -p 4173
```

## Publicar no GitHub Pages

O projeto não tem etapa de build. O site é publicado a partir da branch `main`, na pasta `/ (root)`, e cada push atualiza o site em alguns minutos.

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

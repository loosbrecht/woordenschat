# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |
| `npm run add-word`        | Add a new word to `words.json` (see below)       |

## Adding Words

Use the `add-word` script to add new entries to `src/data/words.json`. Dates are assigned automatically (next day after the last entry).

**Manual mode** — prompts for word, explanation, and example:

```bash
npm run add-word                          # add 1 word interactively
npm run add-word -- --days 5              # add 5 words interactively
```

**AI mode** — uses OpenAI to generate and independently verify words:

```bash
npm run add-word -- --ai                  # generate 1 word
npm run add-word -- --ai --validate       # generate 1 word, approve before saving
npm run add-word -- --ai --days 30        # batch generate 30 words
npm run add-word -- --ai --days 30 --validate  # batch generate, approve each
```

AI mode requires an `OPENAI_API_KEY` environment variable. Set it in a `.env` file at the project root:

```
OPENAI_API_KEY=sk-...
```

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

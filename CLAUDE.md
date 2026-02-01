# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Woordenschat" — a Flemish/Dutch vocabulary app that shows one new word per day with its explanation and example sentence. Built with Astro, deployed on Netlify.

## Commands

```bash
npm run dev          # Start dev server at localhost:4321
npm run build        # Production build to ./dist/
npm run preview      # Preview built site locally
npm run add-word     # CLI script to add words (--ai --days N --validate)
```

No linter or test framework is configured.

## Architecture

**Tech stack:** Astro 5 + TypeScript (strict), SSR via `@astrojs/netlify` adapter

**Core mechanism:** Each word in `src/data/words.json` has an explicit `date` field (YYYY-MM-DD). Pages look up words by date. Navigation queries for the actual previous/next word that exists in the data, so links only point to dates that have words.

**Routing (file-based):**
- `/` — today's word (`src/pages/index.astro`)
- `/archive` — list of recent words (`src/pages/archive/index.astro`)
- `/archive/YYYY-MM-DD` — word for a specific date (`src/pages/archive/[date].astro`); validates format, blocks future dates, redirects today back to home, redirects to home if no word exists for the date
- `/nieuwewoorden` — secret admin page for generating words via AI (not linked in nav)
- `POST /api/generate-word` — generates and verifies a word via OpenAI
- `POST /api/commit-words` — commits approved words to GitHub, triggering redeploy

**Component composition:**
- `src/layouts/Layout.astro` — base HTML shell with header/footer/nav
- `src/components/WordCard.astro` — displays a word with explanation and example
- Pages compose these together

**Data model:** Each entry in `words.json` has `date`, `word`, `explanation`, and `example` fields. All content is in Dutch/Flemish.

**Styling:** Single CSS file (`src/styles/global.css`) with CSS custom properties. Warm serif typography (Georgia), max-width 640px centered layout, mobile breakpoint at 640px.

## Environment Variables

Server-side secrets — use `process.env` in API endpoints (not `import.meta.env`, which is inlined at build time by Vite and will be `undefined` for non-`PUBLIC_` vars on Netlify).

- `OPENAI_API_KEY` — for word generation/verification
- `GENERATE_SECRET` — password for the /nieuwewoorden page and API endpoints
- `GITHUB_TOKEN` — GitHub PAT with `contents: write` permission for committing words
- `GITHUB_REPO` — e.g. `brechtloos/woordenschat`

Locally these are set in `.env` (gitignored).

## Key Files

- `src/lib/words.ts` — business logic: date formatting, validation, word lookup by date, navigation helpers
- `src/data/words.json` — word database with explicit dates
- `src/pages/api/generate-word.ts` — OpenAI word generation + verification endpoint
- `src/pages/api/commit-words.ts` — GitHub API commit endpoint
- `src/pages/nieuwewoorden.astro` — admin UI for generating and approving words
- `scripts/add-word.mjs` — CLI alternative for adding words locally
- `astro.config.mjs` — Astro config (SSR + Netlify adapter)

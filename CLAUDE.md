# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Woordenschat" — a Dutch vocabulary app that shows one new Dutch word per day with its explanation and example sentence. Built with Astro.

## Commands

```bash
npm run dev          # Start dev server at localhost:4321
npm run build        # Production build to ./dist/
npm run preview      # Preview built site locally
```

No linter or test framework is configured.

## Architecture

**Tech stack:** Astro 5 + TypeScript (strict)

**Core mechanism:** Each word in `src/data/words.json` has an explicit `date` field (YYYY-MM-DD). Pages look up words by date. Navigation queries for the actual previous/next word that exists in the data, so links only point to dates that have words.

**Routing (file-based):**
- `/` — today's word (`src/pages/index.astro`)
- `/archive` — list of recent words (`src/pages/archive/index.astro`)
- `/archive/YYYY-MM-DD` — word for a specific date (`src/pages/archive/[date].astro`); validates format, blocks future dates, redirects today back to home, redirects to home if no word exists for the date

**Component composition:**
- `src/layouts/Layout.astro` — base HTML shell with header/footer/nav
- `src/components/WordCard.astro` — displays a word with explanation and example
- Pages compose these together

**Data model:** Each entry in `words.json` has `date`, `word`, `explanation`, and `example` fields. All content is in Dutch.

**Styling:** Single CSS file (`src/styles/global.css`) with CSS custom properties. Warm serif typography (Georgia), max-width 640px centered layout, mobile breakpoint at 640px.

## Key Files

- `src/lib/words.ts` — business logic: date formatting, validation, word lookup by date, navigation helpers
- `src/data/words.json` — word database (currently 10 entries with explicit dates)
- `astro.config.mjs` — Astro config

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Woordenschat" — a Dutch vocabulary app that shows one new Dutch word per day with its explanation and example sentence. Built with Astro (SSR mode) and deployed to Cloudflare Pages.

## Commands

```bash
npm run dev          # Start dev server at localhost:4321
npm run build        # Production build to ./dist/
npm run preview      # Preview built site locally
npm run cf:preview   # Build + preview with Wrangler (Cloudflare local)
npm run cf:deploy    # Build + deploy to Cloudflare Pages
```

No linter or test framework is configured.

## Architecture

**Tech stack:** Astro 5 + TypeScript (strict) + Cloudflare Pages adapter

**Core mechanism:** A DJB2 hash function in `src/lib/words.ts` deterministically maps any date string (YYYY-MM-DD) to a word from `src/data/words.json`. This means the same date always produces the same word globally, with no server state or database needed.

**Routing (file-based):**
- `/` — today's word (`src/pages/index.astro`)
- `/archive` — list of recent days (`src/pages/archive/index.astro`)
- `/archive/YYYY-MM-DD` — word for a specific date (`src/pages/archive/[date].astro`); validates format, blocks future dates, redirects today back to home

**Component composition:**
- `src/layouts/Layout.astro` — base HTML shell with header/footer/nav
- `src/components/WordCard.astro` — displays a word with explanation and example
- Pages compose these together

**Data model:** Each word in `words.json` has `word`, `explanation`, and `example` fields. All content is in Dutch.

**Styling:** Single CSS file (`src/styles/global.css`) with CSS custom properties. Warm serif typography (Georgia), max-width 640px centered layout, mobile breakpoint at 640px.

## Key Files

- `src/lib/words.ts` — all business logic: date hashing, formatting (Dutch locale), navigation helpers, validation
- `src/data/words.json` — word database (currently 10 entries)
- `astro.config.mjs` — SSR mode with Cloudflare adapter
- `wrangler.jsonc` — Cloudflare Pages config with `nodejs_compat` flag

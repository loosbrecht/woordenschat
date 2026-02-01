# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Woordenschat" — a Dutch vocabulary app that shows one new Dutch word per day with its explanation and example sentence. Built with Astro (SSR mode) and deployed to Cloudflare Pages with a D1 database.

## Commands

```bash
npm run dev          # Start dev server at localhost:4321
npm run build        # Production build to ./dist/
npm run preview      # Preview built site locally
npm run cf:preview   # Build + preview with Wrangler (Cloudflare local)
npm run cf:deploy    # Build + deploy to Cloudflare Pages
```

### Database migrations

```bash
npx wrangler d1 migrations apply woordenschat --local   # Apply migrations locally
npx wrangler d1 migrations apply woordenschat --remote  # Apply migrations to production
```

No linter or test framework is configured.

## Architecture

**Tech stack:** Astro 5 + TypeScript (strict) + Cloudflare Pages adapter + Cloudflare D1

**Core mechanism:** Each word in the D1 database has an explicit `date` field (YYYY-MM-DD). Pages query the database with `SELECT ... WHERE date = ?` to get the word for a given date. No hashing or randomization — dates are assigned when words are inserted.

**Routing (file-based):**
- `/` — today's word (`src/pages/index.astro`)
- `/archive` — list of recent words (`src/pages/archive/index.astro`)
- `/archive/YYYY-MM-DD` — word for a specific date (`src/pages/archive/[date].astro`); validates format, blocks future dates, redirects today back to home, redirects to home if no word exists for the date

**Component composition:**
- `src/layouts/Layout.astro` — base HTML shell with header/footer/nav
- `src/components/WordCard.astro` — displays a word with explanation and example
- Pages compose these together

**Data model:** The `words` table in D1 has `id`, `date`, `word`, `explanation`, and `example` fields. All content is in Dutch.

**Navigation:** Prev/next links query for the actual adjacent word dates in the DB (`getPrevDate`/`getNextDate`), so navigation only links to dates that have words. Buttons are hidden when there's no adjacent word.

**Styling:** Single CSS file (`src/styles/global.css`) with CSS custom properties. Warm serif typography (Georgia), max-width 640px centered layout, mobile breakpoint at 640px.

## Key Files

- `src/lib/words.ts` — business logic: date formatting, validation, async DB query functions
- `src/env.d.ts` — TypeScript types for the Cloudflare D1 binding (`Env.DB`)
- `migrations/` — D1 migration files (schema + seed data)
- `astro.config.mjs` — SSR mode with Cloudflare adapter
- `wrangler.jsonc` — Cloudflare Pages config with `nodejs_compat` flag and D1 binding

# Progress Log

## Done

- Scaffolded Next.js (App Router, TypeScript strict, `src/` off, `@/*` alias) using Bun package manager.
- Installed and configured Tailwind CSS v4 and shadcn/ui (radix-nova preset, neutral base colour, CSS variables, system light/dark mode support).
- Installed `lucide-react`.
- Added tooling:
  - ESLint (`eslint-config-next`, `eslint-config-prettier`)
  - Prettier with `prettier-plugin-tailwindcss`
  - Vitest with `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom`
  - Playwright with mobile phone (390x844) and desktop (1280x800) projects
- Configured `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `e2e`, `format`.
- Created folder skeleton with `index.ts` / `README.md`:
  - `app/`
  - `components/`
  - `lib/calc/`
  - `lib/repo/`
  - `lib/sync/`
  - `lib/schemas/`
  - `lib/format/`
  - `lib/db/`
  - `supabase/migrations/`
  - `tests/unit/`
  - `tests/e2e/`
  - `docs/`
- Created `CLAUDE.md` and `AGENTS.md` containing word-for-word the 9 rules from PRD section 1 plus the PROGRESS.md instruction.
- Created `.env.example` with all variables from PRD section 10 and ensured `.env.local` is git-ignored.
- Added GitHub Actions CI workflow (`.github/workflows/ci.yml`) covering install, lint, typecheck, unit tests, and build.
- Created minimal home page displaying "Money Map" for initial deployment.
- Installed exact package versions:
  - Next.js: `16.4.2`
  - Tailwind CSS: `4.3.3`
  - shadcn: `4.22.1`
  - Vitest: `5.0.5`
  - Playwright: `1.64.1`

## Decisions

- Dark mode theme configured using media query `@media (prefers-color-scheme: dark)` in `app/globals.css` to respect the system preference per PRD §9 rather than a class toggle.
- Installed Node.js v22.23.3 LTS in user environment (`~/.local/node`) to support dev tools (Next.js bundler runtime, Vitest jsdom, Playwright) while keeping Bun v1.4.3 as the package manager and script runner.
- Added `next typegen && tsc --noEmit` for the `typecheck` script to ensure Next.js App Router route types are synchronized before TypeScript validation.

## Known issues

- None.

## Next prompt

Prompt 2: design system and app shell

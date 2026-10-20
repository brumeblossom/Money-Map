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

### Prompt 2: Design system and app shell
- Implemented formatting and parsing utilities in `lib/format/index.ts`:
  - `formatDate(isoDate)`: Converts `YYYY-MM-DD` or ISO timestamp to `DD-MM-YYYY` (e.g. `2026-10-20` -> `20-10-2026`).
  - `parseDisplayDate(displayDate)`: Parses `DD-MM-YYYY` to internal `YYYY-MM-DD`, validating real calendar dates (handles leap years e.g. `29-02-2028`, rejects invalid dates e.g. `31-02-2026`, `29-02-2026`, `31-04-2026`).
  - `isValidDisplayDate(displayDate)` and `tryParseDisplayDate(displayDate)`: Safe validation helpers.
  - `formatMoney(amountMinor, currency)`: Uses `Intl.NumberFormat` (`en-NG` for `NGN`, 2 decimal places, e.g. `15000000` kobo -> `₦150,000.00`).
  - `toMinor(str)`: Converts decimal string with optional thousands commas to integer minor units without floating-point math.
  - `fromMinor(amountMinor)`: Converts integer minor units to major decimal string without floating-point math.
- Created UI and form components:
  - `components/date-field.tsx`: DD-MM-YYYY masked text input with Shadcn Calendar popover (react-day-picker), always displaying DD-MM-YYYY and returning ISO string internally.
  - `components/amount-field.tsx`: Large text input with `inputmode="decimal"`, currency prefix symbol, live thousands separators while typing, returning minor units integer.
  - `components/ui/input.tsx`, `components/ui/popover.tsx`, `components/ui/calendar.tsx`: Core UI primitives.
  - `components/app-header.tsx`: Header with dynamic page title and static placeholder "Synced" status icon.
  - `components/app-sidebar.tsx`: Fixed 240px left desktop sidebar with logo on top, navigation items (Home, Records, Insights, Settings), and user area at bottom.
  - `components/app-bottom-nav.tsx`: Fixed bottom navigation bar under 1024px with 44px+ tap targets and safe-area padding.
  - `components/app-shell.tsx`: Responsive app shell container (centered max 560px container, max 5xl for Insights desktop) wrapping app routes while excluding full-screen routes (`/welcome`, `/auth/*`, `/s/*`).
- Configured theme in `app/globals.css`:
  - Accent color `--money-accent`, green for money in `--money-in`, red for money out `--money-out`, with system dark mode overrides via `@media (prefers-color-scheme: dark)`.
- Created placeholder pages for all routes defined in PRD Section 2:
  - `/` (Home)
  - `/welcome` (Welcome)
  - `/auth/check-email` (Check your email)
  - `/auth/callback` (Auth callback)
  - `/new/[action]` (Entry form for income, expense, giving, lent)
  - `/records` (Records list)
  - `/records/[id]` (Entry detail)
  - `/records/[id]/edit` (Edit entry)
  - `/lent` (Money I lent)
  - `/lent/[id]` (Loan detail)
  - `/insights` (Dashboard)
  - `/insights/habits` (Habits)
  - `/insights/habits/[categoryId]` (Category report)
  - `/export` (Export)
  - `/settings` (Settings)
  - `/s/[token]` (Shared report)
- Verification:
  - 32 Vitest unit tests passing (`tests/unit/format.test.ts`, `tests/unit/components.test.tsx`, `tests/unit/home.test.tsx`).
  - 44 Playwright E2E tests passing covering responsive navbar/sidebar visibility at 390px and 1280px, no horizontal scroll at 360px, and route loading.
  - Captured Playwright screenshots saved to `tests/e2e/screenshots/home-phone-390.png` and `tests/e2e/screenshots/home-desktop-1280.png`.

### Prompt 3: Database schema and RLS
- Initialized Supabase in the repo (`supabase init`), creating `supabase/config.toml`.
- Linked project reference `jiktrplyuneakhhoayde` to Supabase cloud.
- Created initial database migration in `supabase/migrations/20261020220000_initial_schema.sql` with:
  - Custom enum types: `entry_kind`, `category_scope`, `repeat_plan`, `interest_kind`.
  - 8 tables:
    - `profiles`: user profile, currency (`NGN`), notifications flag.
    - `categories`: multi-scope category definitions with slug, hierarchy, soft delete, and sync columns.
    - `entries`: financial transactions (income, expense, giving) with `amount_minor bigint`, category reference, and performance indexes (`entries_user_date`, `entries_user_kind_cat`).
    - `loans`: lent money records with `CHECK (due_on >= started_on)`, interest handling, and sync columns.
    - `loan_payments`: repayments against loans with cascade delete and sync columns.
    - `recurring_rules`: repeating reminders for weekly/monthly entries.
    - `share_links`: server-only public snapshot links with expiry and revocation.
    - `push_subscriptions`: server-only Web Push subscriptions with unique endpoints.
  - Triggers & Functions:
    - `set_server_updated_at()`: trigger updating `server_updated_at = clock_timestamp()` on insert/update across all syncable tables (`categories`, `entries`, `loans`, `loan_payments`, `recurring_rules`).
    - `handle_new_user()`: `security definer` trigger on `auth.users` creating a default profile with `currency = 'NGN'`.
  - Row Level Security: enabled on all 8 tables with granular SELECT, INSERT, UPDATE, DELETE policies enforcing `auth.uid() = user_id`.
- Pushed schema to Supabase cloud using `bunx supabase db push`.
- Generated full TypeScript types to `lib/db/database.types.ts` using `bun run db:types` (`bunx supabase gen types typescript --linked > lib/db/database.types.ts`).
- Added `"db:types"` script to `package.json`.
- Tested and verified:
  - Integration SQL test suite `supabase/tests/rls_and_constraints_test.sql` executed against linked project proving:
    - User B cannot SELECT, UPDATE, or DELETE User A's rows across any table (0 rows returned/modified).
    - User B cannot INSERT rows with `user_id = user_a` (rejected by RLS `with check`).
    - `loans.due_on >= started_on` CHECK constraint rejects invalid loan dates (`due_on < started_on`).
    - `server_updated_at` trigger automatically updates on modification.
### Prompt 4: Local data layer (Dexie, Schemas, Repo & Hooks)
- Configured local IndexedDB database `moneymap` in `lib/db/dexie.ts` matching PRD 6.3 stores:
  - `profiles: 'user_id'`
  - `categories: 'id, user_id, scope, [scope+is_hidden], updated_at'`
  - `entries: 'id, user_id, kind, category_id, occurred_on, [kind+occurred_on], updated_at, deleted_at'`
  - `loans: 'id, user_id, due_on, updated_at'`
  - `loan_payments: 'id, loan_id, paid_on, updated_at'`
  - `recurring_rules: 'id, next_due_on, updated_at'`
  - `outbox: '++seq, table, row_id'`
  - `meta: 'key'`
  - Reused TypeScript column types from `lib/db/database.types.ts`.
- Created Zod validation schemas in `lib/schemas/index.ts` with exact limits from PRD Section 4:
  - `incomeFormSchema`: validates positive amount <= 999,999,999,999.99, future date <= 1 year, counterparty <= 80 chars, description <= 500 chars.
  - `expenseFormSchema`: validates positive amount, category ID, occurred_on, description <= 500 chars.
  - `givingFormSchema`: validates positive amount, given-to <= 80 chars, occurred_on, description <= 500 chars.
  - `loanFormSchema`: validates borrower 1-80 chars, positive principal, `due_on >= started_on`, interest type & value, remind, description <= 500 chars.
  - `loanPaymentFormSchema`: validates loan ID, positive amount, paid_on, note <= 200 chars.
  - `categoryFormSchema`: validates scope, name 1-40 chars, slug, default & hidden flags, sort order.
  - Exported inferred TypeScript types for all forms.
- Implemented repository layer in `lib/repo/index.ts` with atomic writes + outbox tracking:
  - `createEntry`: creates an entry, sets UUID, timestamps, and appends outbox item in 1 transaction.
  - `updateEntry`: updates entry fields, bumps updated_at, and appends outbox item.
  - `softDeleteEntry`: sets deleted_at and updated_at on entry and appends outbox item.
  - `getEntry`: fetches active entry by ID (ignores soft-deleted).
  - `listEntries`: lists entries filtered by kind, category, or date range (excludes deleted by default).
  - `createLoan`: creates a loan record with borrower, principal, and outbox tracking.
  - `updateLoan`: updates loan details and appends outbox item.
  - `softDeleteLoan`: marks loan deleted and appends outbox item.
  - `getLoan`: fetches active loan by ID.
  - `listLoans`: lists all active loans.
  - `createLoanPayment`: logs repayment against loan and appends outbox item.
  - `updateLoanPayment`: updates repayment details and appends outbox item.
  - `softDeleteLoanPayment`: soft-deletes repayment and appends outbox item.
  - `getLoanPayment`: fetches loan repayment by ID.
  - `listLoanPayments`: lists repayments for a loan or all loans.
  - `createCategory`: creates a user or custom category with outbox item.
  - `updateCategory`: updates category name/visibility and appends outbox item.
  - `softDeleteCategory`: soft-deletes category and appends outbox item.
  - `getCategory`: fetches active category by ID.
  - `listCategories`: lists categories filtered by scope and visibility, sorted by sort_order.
  - `createRecurringRule`: creates repeating reminder rule with outbox item.
  - `updateRecurringRule`: updates recurring rule parameters and appends outbox item.
  - `softDeleteRecurringRule`: soft-deletes recurring rule and appends outbox item.
  - `getRecurringRule`: fetches active recurring rule by ID.
  - `listRecurringRules`: lists all active recurring rules.
  - `createProfile` / `updateProfile` / `getProfile` / `softDeleteProfile` / `listProfiles`: manages user profile in Dexie.
  - `getCurrentUserId` / `setCurrentUserId`: current user ID getter/setter (null for guests).
- Implemented default category seed in `lib/repo/seed.ts`:
  - `seedDefaultCategories`: idempotent function inserting all 36 default categories across income, expense, giving, and lent scopes with kebab-case slugs, default flags, and sequential sort orders.
- Implemented reactive hooks in `lib/repo/hooks.ts`:
  - `useEntries(filter)`: live reactive query hook returning entries matching optional kind/category/date filters.
  - `useCategories(scope, includeHidden)`: live reactive query hook returning sorted categories for a scope.
  - `useLoans(includeDeleted)`: live reactive query hook returning all loans.
- Verification:
  - 61 Vitest unit tests passing (`bun run test`).
  - Unit tests in `tests/unit/repo.test.ts` (fake-indexeddb) proving:
    - Create adds a row and exactly one outbox item in the same transaction.
    - Soft delete sets `deleted_at` and records an outbox item.
    - Seed runs twice idempotently without duplicating categories.
  - Unit tests in `tests/unit/schemas.test.ts` proving:
    - All Zod schemas reject invalid amounts (<= 0, > 999,999,999,999.99, non-integers).
    - Invalid calendar dates and future dates > 1 year rejected.
    - Counterparty (> 80), description (> 500), note (> 200) length limits enforced.
    - Loans reject `due_on < started_on` and empty borrower names.

## Decisions

- Dark mode theme configured using media query `@media (prefers-color-scheme: dark)` in `app/globals.css` to respect the system preference per PRD §9 rather than a class toggle.
- Installed Node.js v22.23.3 LTS in user environment (`~/.local/node`) to support dev tools (Next.js bundler runtime, Vitest jsdom, Playwright) while keeping Bun v1.4.3 as the package manager and script runner.
- Added `next typegen && tsc --noEmit` for the `typecheck` script to ensure Next.js App Router route types are synchronized before TypeScript validation.
- All dates displayed via formatDate (DD-MM-YYYY).
- All minor unit conversion calculations use pure integer and BigInt string manipulation, never JavaScript floating-point arithmetic.
- AppShell wrapped in React.Suspense in RootLayout to enable seamless streaming and partial prerendering for dynamic route hooks (`usePathname`).
- Database schema pushed directly to linked remote Supabase project (`jiktrplyuneakhhoayde`) using `supabase db push` as local Docker stack is not present on host machine.
- Database types generated with `supabase gen types typescript --linked` to synchronize directly with remote schema.
- Used `clock_timestamp()` in `set_server_updated_at()` trigger function so `server_updated_at` advances reliably within transactions.
- Dexie repository operations execute in single transactions linking the table update and outbox append atomically.
- Tested IndexedDB locally via `fake-indexeddb` to allow full unit test execution in Node/Vitest environments.

## Database Instructions

- **How to run the local DB**: If Docker is installed on the host machine, run `bunx supabase start` (resets with `bunx supabase db reset`). Without Docker, development connects to the linked remote project (`jiktrplyuneakhhoayde`) via `bunx supabase db query --linked`.
- **How to regenerate types**: Run `bun run db:types`.
- **Schema cloud push status**: The schema has been pushed to the cloud project (`jiktrplyuneakhhoayde`).

## Known issues

- None.

## Next prompt

Prompt 5: calculation engine

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

### Prompt 5: Calculation Engine
- Built pure TypeScript calculation engine in `lib/calc/index.ts` (zero React, zero Dexie dependencies, strictly integer minor units arithmetic):
  - **Exported calculation functions:**
    - `periodTotals(rows, period)`: Aggregates active entries in a period into `{ moneyIn, expenses, giving, moneyOut, leftOver }` minor units.
    - `owedToMe(loans, payments)`: Computes outstanding balance on all active loans (`sum of balanceLeft for un-deleted loans`).
    - `previousPeriod(period)`: Calculates the preceding adjacent period of equal calendar duration in days.
    - `percentChange(current, previous)`: Calculates integer percent change `Math.round(((current - previous) / previous) * 100)`; returns `"New"` when previous period is 0.
    - `signedAmount(row)`: Signed minor unit value per rule (+ for income, - for expense, - for giving).
    - `interestAmount(loan)`: Pure integer calculation for none (`0`), fixed (`interest_value`), or percent (`Math.round((principal * interest_value) / 10000)` with 2-decimal percent base).
    - `totalToGetBack(loan)`: `loan.principal_minor + interestAmount(loan)`.
    - `receivedSoFar(loanId, payments)`: Sum of un-deleted repayments for loan.
    - `balanceLeft(loan, payments)`: Outstanding balance clamped to minimum 0 (`Math.max(0, totalToGetBack(loan) - receivedSoFar(loan.id, payments))`).
    - `instalmentCount(loan)`: Computes scheduled count of instalments between `started_on` and `due_on` based on `repay_plan` (`weekly`, `monthly`, `custom`/`none` = 1).
    - `suggestedInstalment(loan)`: Calculates integer instalment amount `Math.ceil(totalToGetBack(loan) / instalmentCount(loan))`.
    - `instalmentDates(loan)`: Generates list of ISO date milestones matching repayment plan cadence up to `due_on`.
    - `nextExpectedDate(loan, payments)`: Computes earliest upcoming instalment date whose cumulative milestone exceeds total repayments made. Falls back to `due_on` if all past milestones satisfied.
    - `loanStatus(loan, payments, today)`: Determines status with strict precedence (`Paid off` if balance is 0, else `Overdue` if `today > nextExpectedDate`, else `Due soon` if within 7 days, else `Active`).
    - `loanProgress(loan, payments)`: Percentage integer 0-100 of repayments against total receivable amount (`Math.min(100, Math.round((receivedSoFar / totalToGetBack) * 100))`).
    - `categoryShare(categoryId, rows)`: Computes percentage share (0-100) of expense category relative to total expenses in dataset.
    - `sixMonthTrend(categoryId, rows, today)`: Returns array of `{ monthKey, totalMinor }` for the last 6 calendar months (M5 down to M0).
    - `countAndAverage(categoryId, rows)`: Returns count and average transaction amount `Math.round(total / count)` for category.
    - `busiestWeekday(categoryId, rows)`: Computes day of week (Monday-Sunday) with most transactions; resolves ties to earlier weekday (Monday).
    - `biggestEntry(categoryId, rows)`: Finds largest single entry in minor units for category.
    - `habitLabel(m0, m1, m2, a, entryCount)`: Determines spending habit label with strict precedence (`"Not enough data yet"` if count < 3, else `Spike` if `M0 >= 2 * A`, else `Rising` if `M0 > 1.15 * M1 && M1 > 1.15 * M2`, else `Falling` if `M0 < 0.85 * M1 && M1 < 0.85 * M2`, else `Steady`).
    - `habitsSummary(rows, categories, currency, today)`: Computes top 3 rising categories and top 3 falling categories formatted into plain English sentences using `formatMoney`.
    - `smartTip(rows, categories, currency, today)`: Generates actionable tip for biggest spiking or rising expense category, or encouraging confirmation if spending is falling/steady.
    - `getPeriodPreset(preset, today, customRange)`: Computes period date range for `thisWeek` (Monday start), `thisMonth`, `last3Months`, `thisYear`, and `custom`.
    - `diffInDays(isoDateA, isoDateB)`: Timezone-agnostic calendar day difference helper.
- Unit Testing and Verification:
  - Added 29 hand-calculated test cases in `tests/unit/calc.test.ts` covering:
    - Empty data sets.
    - Previous period 0 returning `"New"`.
    - Percent-interest loan with weekly plan.
    - Monthly repayment plan with mid-month due date.
    - Overpayment clamping `balanceLeft` strictly to 0.
    - Status ordering (`Paid off` strictly overrides `Overdue`).
    - Each habit label (`Spike`, `Rising`, `Falling`, `Steady`, `"Not enough data yet"`).
    - Busiest weekday ties breaking by earliest in week (Monday).
  - Test coverage via `@vitest/coverage-v8`: `lib/calc/index.ts` achieved **98.05% lines** and **96.29% statements** (exceeding >= 95% requirement).
  - All 90 unit tests passing project-wide (`bun test`).

### Prompt 6: Home and first forms
- Implemented Home view (`/`):
  - Heading: `"What are we recording today?"`
  - Hint: `"Tap a card to add an entry"`
  - This-month strip: displays live period totals for `Money in`, `Money out`, and `Left over` computed via `lib/calc/periodTotals`.
  - Four action cards in required order:
    1. Money in (`/new/income`)
    2. Money out (`/new/expense`)
    3. Giving (`/new/giving`)
    4. Money I lent (`/new/lent` - displays live `owedToMe` total computed via `lib/calc/owedToMe`)
    - Layout: 2x2 grid on mobile viewports (< 1024px), 4 in a row on desktop viewports (>= 1024px).
- Entry Form Route (`/new/[action]`):
  - Rendered over Home as a bottom sheet on mobile (`Drawer`) and as a centered dialog on desktop (`Dialog`).
  - Supports direct URL navigation to `/new/[action]` as well as client-side card taps without unmounting Home.
  - Implemented full forms for `income`, `expense`, and `giving`.
  - Other actions (e.g. `lent`) display `"Coming soon"` with a dismiss button until their respective prompts.
- Input Fields and Form Interaction:
  - Amount input (`AmountField`) automatically focused on open with `autoFocus`, `inputmode="decimal"`, currency prefix, and formatted thousands separators.
  - Date input (`DateField`) formatted as `DD-MM-YYYY` with calendar popover, defaulting to today's date in local calendar.
  - Category selector (`CategoryPicker`) pre-populated from Dexie `categories` filtered by scope, defaulting to the last used category for that entry kind (with race-condition protection), ending with `"Other (type your own)"`.
  - "Other (type your own)" reveals an inline text input; saving creates the custom category with matching scope and saves the entry under the new category.
  - Required fields (`amount`, `category`, `date`) placed on top; optional fields (`counterparty`, `description`, `repeats`) grouped under a collapsible `"More details"` section.
  - Visible "Repeats" field with `// TODO(prompt-14)` comment for future recurring engine integration.
- Save and Undo Flow:
  - Form validation with Zod schemas from `lib/schemas`.
  - Writes to Dexie via `lib/repo/createEntry` and `lib/repo/createCategory` in a single Dexie transaction appending to `outbox`.
  - On save, closes modal, displays toast `"Saved"` with a 5-second `Undo` action.
  - Clicking `Undo` soft-deletes the created entry via `lib/repo/softDeleteEntry`, instantly updating the month strip and action card totals.
- Components Added / Documented:
  - `ActionCard` (`components/action-card.tsx`): Displays card icon, label, and formatted currency total with interactive hover and click handling.
  - `CategoryPicker` (`components/category-picker.tsx`): Scope-aware select component with inline custom category expansion.
  - `EntryForm` (`components/entry-form.tsx`): Action-based form supporting `income`, `expense`, and `giving` with Zod validation and Undo toast.
  - `EntryModal` (`components/entry-modal.tsx`): Adaptive drawer/dialog wrapper based on viewport width (`>= 1024px`).
  - `HomeView` (`components/home-view.tsx`): Complete home screen with live totals and integrated entry modal.
- How to add a new action form:
  1. Add the new action route key to the supported actions union in `components/entry-modal.tsx` / `components/entry-form.tsx`.
  2. In `components/entry-form.tsx`, implement the field layout and validation schema (e.g. `lentLoanSchema` from `lib/schemas`) for the action.
  3. Ensure required fields sit on top and optional fields are grouped under `"More details"`.
  4. Connect the action's submit handler to the corresponding repository method in `lib/repo` (e.g. `createLoan`).
- Verification:
  - All 92 Vitest unit tests pass (`bun run test`).
  - Playwright E2E tests pass across phone (390px) and desktop (1280px) viewports (`bun run e2e`).
  - TypeScript strict check (`bun run typecheck`) and ESLint (`bun run lint`) pass with 0 errors.

### Prompt 6b: Amount input fix, form layout polish & Money I lent form
- **AmountField Root Cause and Fix**:
  - *Root Cause*: On every keystroke, `AmountField` fired `onChange` with converted minor units, updating the parent's `value` prop. On receiving the prop update, the component reset its local text state to `null` and re-formatted `fromMinor(value)` into a 2-decimal string (`"5"` -> `"5.00"`). This round-trip formatted substitution wiped the user's draft input, shifted the cursor, and rejected consecutive digit typing.
  - *Fix*: `AmountField` now stores `rawText` in local component state. It tracks `lastEmittedMinor` in state (without accessing refs during render per React 19 rules) so parent re-renders from user typing never overwrite the active input draft. Restricts input to digits, at most one decimal point, at most 2 decimal places, and integer up to 12 digits (cap 999,999,999,999.99). Converts leading `.` to `0.`. Pasting strips symbols (`₦`, `$`) and commas. Thousands separators format smoothly on blur.
- **Form Layout (All Four Forms)**:
  - Completely removed the collapsible "More details" section. Every field displays directly on the form.
  - Required fields appear first, followed by optional fields with `(optional)` in their label.
  - Field order:
    - *Money in*: Amount, Category, Date, Source (optional), Repeats (optional), Description (optional)
    - *Money out*: Amount, Category, Date, Repeats (optional), Description (optional)
    - *Giving*: Amount, Category, Date, Recipient (optional), Repeats (optional), Description (optional)
    - *Money I lent*: Borrower, Amount lent, Category, Date lent, Expected back by, Payback plan (optional), Instalment amount (optional), Interest (optional), Remind me, Description (optional)
- **Modal Sizing & Scrolling**:
  - *Mobile (Drawer)*: Bottom sheet capped at `max-h-[90dvh]` with `handleOnly={true}` so touch dragging only triggers from the handle/header and does not interfere with field scrolling. Layout split into fixed header (`shrink-0`), scrollable body (`flex-1 overflow-y-auto overscroll-contain`), and sticky footer (`shrink-0 border-t bg-background/95`) ensuring the Save button is always reachable without scrolling.
  - *Desktop (Dialog)*: Centered dialog sized to `w-[480px]` and `max-h-[min(640px, 80vh)]`, keeping the background overlay and page visible behind it. Uses identical fixed header, scrollable body, and sticky Save footer.
- **Money I lent Form (`/new/lent`)**:
  - Fully implemented within `EntryForm` using `loanFormSchema` validation and `createLoan` in `lib/repo`.
  - Automatically calculates suggested instalment via `suggestedInstalment(total, count)` from `lib/calc` when payback plan is weekly or monthly, remaining editable.
  - Supports Interest toggle (None, Percent % in basis points, Flat minor units).
  - Remind me toggle switch (default on).
  - Saving writes to Dexie `loans` with outbox entry, shows toast `"Saved"` with a 5-second Undo action (soft-deletes loan), and live updates the Money I lent Home card (`owedToMe`).
  - Lent form is completely finished, so Prompt 7 is scoped strictly to `/lent` list, `/lent/[id]` detail, "Record money received", and edit/delete.

### Prompt 7: Money I lent
- **`/new/lent` Form (PRD 4.4)**:
  - Exact labels: Borrower, Amount lent, Category, Date lent, Expected back by, Payback plan (options: "One payment", "Weekly", "Monthly"), Instalment amount (suggested via `lib/calc/suggestedInstalment`, editable), Interest (toggle "Percent" / "Flat" with single input), Remind me (switch, defaults on), Description (optional).
  - Validation via Zod schema (`loanFormSchema`), atomic create via `createLoan` with outbox tracking, toast with 5-second Undo action.
- **`/lent` Loans List (PRD 5.2, US-4.1)**:
  - Header with dynamic active loan count, total balance left summary, and "Lend money" action button linking to `/new/lent`.
  - Active loan rows display: borrower, balance left (`balanceLeft`), visual progress bar (`loanProgress`), status badge (`Active`, `Due soon`, `Overdue`, `Paid off`), and next expected date formatted `DD-MM-YYYY` with countdown string (`"Due in X days"`, `"Due today"`, `"X days overdue"`).
  - Paid off loans automatically collapse into an accordion "Paid off (N)" section at the bottom.
  - Row actions: direct navigation to `/lent/[id]`, plus "Edit" (opens loan edit modal) and "Delete" (soft-deletes loan with 5-second Undo toast).
- **`/lent/[id]` Loan Detail View (PRD 5.2, US-4.2)**:
  - Breadcrumbs navigation back to `/lent`.
  - Top summary cards: "Total to get back", "Received so far", "Balance left" along with a prominent progress bar.
  - Loan info card: borrower, date lent, expected back by, interest, payback plan, remind me status, and optional description.
  - "Instalment timeline": milestone cards showing each instalment number and DD-MM-YYYY date with status indicators (Past / Next due / Upcoming).
  - "Money received" list: chronological list of repayments showing amount, payment date (DD-MM-YYYY), and optional note, with Edit and Delete (soft delete with Undo) buttons.
  - "Record money received" button: opens modal (`Amount`, `Date`, `Note`) validated with `loanPaymentFormSchema`. Overpayment check triggers explicit warning alert: `"This is more than the ₦X left. Save anyway?"` with Save anyway / Cancel options.
- **Home Integration & Integrity (PRD 5.1)**:
  - "Money I lent" action card on Home (`/`) displays live outstanding total (`owedToMe`) across all active loans.
  - Verified that money lent transactions and repayments do NOT alter `Money in`, `Money out`, or `Left over` on the Home this-month strip.
- **Edit & Delete Flows with Soft Delete & Undo**:
  - Implemented `restoreLoan`, `restoreLoanPayment`, and `restoreEntry` in `lib/repo` with atomic outbox tracking.
  - Edit loan modal and edit payment modal update records atomically via `updateLoan` and `updateLoanPayment`.
  - Soft delete on loans and loan payments updates `deleted_at` in Dexie and outbox, and presents a 5-second toast with an "Undo" action restoring the record.
- **Verification**:
  - All 100 Vitest unit tests passing (`bun test`).
  - Playwright E2E suite (`tests/e2e/lent-flow.spec.ts`) passing across 390px mobile and 1280px desktop viewports covering:
    - Lending ₦50,000 to "Ada" on monthly plan over 2 months @ 10% interest -> total ₦55,000.00, suggested instalment ₦27,500.00.
    - Recording ₦27,500 repayment -> balance reduces to ₦27,500.00.
    - Recording second ₦27,500 repayment -> status updates to "Paid off" and loan collapses into the "Paid off" section.
    - Loan expected back 3 days from today showing "Due soon".
    - Home card updates while Home month strip stays unchanged.
    - Overpayment warning when recording more than balance left.
    - Loan and payment edit and delete with Undo restore.
  - All 70 Playwright E2E tests passing project-wide (`bun run e2e`).
  - ESLint (`bun run lint`) and TypeScript (`bun run typecheck`) pass with 0 errors.

### Prompt 8: records
- **Virtualised List (`/records`)**:
  - Implemented `/records` view with high-performance virtualization using `@tanstack/react-virtual` with stable key mapping (`getItemKey`), container-level `touch-pan-y` optimization, and memoized row components.
  - Grouped transactions by day (newest first: `occurred_on` descending, `created_at` descending) with `DD-MM-YYYY` headers and daily signed net totals (`+₦X` or `-₦X`) calculated via `signedAmount`.
- **Filtering & Search**:
  - Action chips (multi-select: "Money in", "Money out", "Giving") with active selection highlights and check icons.
  - Category picker dropdown/popover with "All Categories" and category list.
  - Period preset chips ("All time", "This week", "This month", "Last 3 months", "This year", "Custom") with DD-MM-YYYY custom date range inputs.
  - Search box querying description, counterparty (source/recipient), and category name with instant filtering.
  - Footer displaying `"N entries · total ₦X"` using signed amount summation.
- **Multi-select & Actions**:
  - Desktop checkboxes and mobile long-press selection (500ms threshold with haptic vibration).
  - Floating bottom bar displaying `"N selected, total ₦X"` with "Select all", "Deselect all", and "Clear selection" actions.
- **Entry Detail & Edit & Delete (`/records/[id]`)**:
  - Detail page displaying all entry fields: hero formatted amount with kind badge and date, category, counterparty/source/recipient, description, and reference ID.
  - "Edit" button navigating to `/records/[id]/edit` prefilled with entry data using `EntryForm`.
  - "Delete" button opening confirmation dialog `"Delete this entry?"`, soft-deleting the entry, and presenting a 5-second toast with an "Undo" action restoring the record.
- **Mobile Swipe Actions**:
  - Horizontal swipe-left on mobile rows reveals "Edit" and "Delete" action buttons.
- **Verification**:
  - All 100 Vitest unit tests passing (`bun test`).
  - Playwright E2E suite (`tests/e2e/records-flow.spec.ts`) passing across 390px mobile and 1280px desktop viewports covering:
    - Creating 3 entries (income, expense, giving), filtering to Money out with matching totals.
    - Multi-selecting two entries and verifying floating bar total (`+₦70,000.00`).
    - Editing an amount from ₦30,000 to ₦50,000 and verifying the Home card updates to ₦50,000.00.
    - Soft-deleting an entry and restoring via the Undo toast.
    - Mobile swipe-left revealing Edit and Delete buttons.
    - Seeding 5,000 entries into Dexie and confirming virtualized scrolling remains smooth with no long tasks > 200ms.
  - ESLint (`bun run lint`) and TypeScript (`bun run typecheck`) pass with 0 errors.

### Prompt 9: Login and guest mode
- **Supabase SSR Client & Middleware**:
  - Implemented browser client (`lib/supabase/client.ts`) and server client (`lib/supabase/server.ts`) using `@supabase/ssr` with 30-day cookie session lifetime (`maxAge: 60 * 60 * 24 * 30`).
  - Implemented Next.js edge middleware (`middleware.ts`) that refreshes the Supabase auth session cookie on every request, redirects unauthenticated first-time visitors to `/welcome`, allows guests (`moneymap_guest=true` cookie) and signed-in users straight to Home (`/`), and redirects authed/guest visitors from `/welcome` to `/` unless `?intent=signin` is specified.
- **Welcome Page (`/welcome`)**:
  - Brand header with logo and one-line pitch: *"Track your money effortlessly with zero clutter. Private, offline-first personal finance."*
  - Action buttons:
    - **"Continue with Google"**: initiates `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`.
    - **"Continue with email"**: reveals input for email and **"Send me a link"** button. Validates format via `emailAuthSchema` in `lib/schemas`, displaying `"Enter a valid email"` on failure. On submit, calls `supabase.auth.signInWithOtp` and navigates to `/auth/check-email`.
    - **"Try without an account"**: sets `moneymap_guest=true` (30-day max-age) and transitions to Home (`/`) in <1s.
- **Check Email Page (`/auth/check-email`)**:
  - Displays heading *"Check your email"*, recipient email confirmation, and instruction to tap the link.
  - **"Resend"** button with a 60-second countdown timer (`Resend (60s)` disabled -> `Resend link` active when timer reaches 0). Clicking triggers OTP re-send and resets the 60s timer.
- **Auth Callback & Guest Migration (`/auth/callback`)**:
  - Client-side route that exchanges code for session, retrieves user, and runs `claimGuestData(newUserId)` on Dexie IndexedDB.
  - In a single atomic Dexie transaction: updates `user_id = newUserId` on all guest rows across `entries`, `loans`, `loan_payments`, `categories`, `recurring_rules`, `profiles`, appends an outbox record for each row so sync can push them, and clears the `moneymap_guest` cookie.
  - Displays toast `"Your N entries are now saved to your account"` using sonner and redirects to `/`.
- **Guest Banner (`components/guest-banner.tsx`)**:
  - Prompts guest users after saving their 3rd entry: *"Save your data: sign in so you don't lose it"*.
  - Includes a *"Sign in"* button navigating to `/welcome?intent=signin` and a dismiss (X) button that stores `guest_banner_dismissed_until` (7 days in future) in Dexie `meta`.
- **Verification**:
  - 102 Vitest unit tests passing (`bun run test`).
  - Playwright E2E suite (`tests/e2e/auth-flow.spec.ts`) passing across 390px mobile and 1280px desktop viewports covering:
    - First-time visitor redirection to `/welcome` and transition to Home via "Try without an account" in <1s.
    - Email validation showing `"Enter a valid email"` and routing to `/auth/check-email` with 60s countdown on Resend.
    - Guest banner appearing only after 3rd saved entry, and staying dismissed for 7 days.
    - Guest recording 2 entries, signing in via `/auth/callback`, verifying Dexie entries are claimed with user_id and added to outbox, toast appearing, and redirecting to Home.
    - 30-day session cookie persistence (simulating 1 day passing stays on Home).
  - All existing Playwright suites (`home.spec.ts`, `app-shell.spec.ts`, `entry-flow.spec.ts`, `lent-flow.spec.ts`, `records-flow.spec.ts`) passing.

## Step-by-Step Auth Setup Instructions

### 1. Supabase Dashboard Configuration
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/jiktrplyuneakhhoayde).
2. **Enable Email Provider**:
   - Go to **Authentication** > **Providers** > **Email**.
   - Ensure **Enable Email provider** is turned **ON**.
   - Ensure **Confirm email** or **Magic Link** is enabled.
3. **Enable Google Provider**:
   - In **Authentication** > **Providers**, select **Google**.
   - Toggle **Enable Sign in with Google** to **ON**.
   - Copy the **Callback URL (for OAuth)** shown in the Supabase Google provider modal:
     `https://jiktrplyuneakhhoayde.supabase.co/auth/v1/callback`
   - Paste your **Client ID** and **Client Secret** obtained from Google Cloud (see step 2 below) and click **Save**.
4. **Configure Site URL and Redirect URLs**:
   - Go to **Authentication** > **URL Configuration**.
   - Set **Site URL** to:
     - Development: `http://localhost:3000`
     - Production: Your production Vercel URL (e.g. `https://money-map.vercel.app`).
   - Under **Redirect URLs**, click **Add URL** and add:
     - `http://localhost:3000/auth/callback`
     - `https://*.vercel.app/auth/callback` (or your specific Vercel URL e.g. `https://money-map.vercel.app/auth/callback`)
   - Click **Save**.

### 2. Google Cloud Console Configuration
1. Open the [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Under **OAuth 2.0 Client IDs**, select your Web application client ID (or click **Create Credentials** > **OAuth client ID** > Web application).
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `https://jiktrplyuneakhhoayde.supabase.co`
   - Your production Vercel URL (e.g. `https://money-map.vercel.app`)
4. Under **Authorized redirect URIs**, paste the exact callback URI from your Supabase project:
   - `https://jiktrplyuneakhhoayde.supabase.co/auth/v1/callback`
5. Click **Save**.
6. Copy the **Client ID** and **Client Secret** and paste them into the Supabase Google Provider settings.

### 3. Customizing Magic Link Email with Money Map Branding
1. In the Supabase Dashboard, go to **Authentication** > **Email Templates**.
2. Select the **Magic Link** template.
3. Set the **Subject line**:
   `Your Money Map magic link`
4. Set the **Message body (HTML)**:
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px; background-color: #ffffff; color: #171717;">
  <div style="margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 800; color: #059669; margin: 0 0 8px 0;">Money Map</h1>
    <p style="font-size: 14px; color: #737373; margin: 0;">Clear, private, offline-first personal finance.</p>
  </div>
  
  <p style="font-size: 16px; line-height: 24px; color: #262626; margin: 0 0 24px 0;">
    Tap the button below to sign in to your Money Map account. This link will expire in 24 hours.
  </p>
  
  <div style="margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 12px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
      Sign in to Money Map
    </a>
  </div>
  
  <p style="font-size: 13px; color: #a3a3a3; line-height: 20px; margin: 24px 0 0 0;">
    If you didn't request this email, you can safely ignore it.
  </p>
</div>
```
5. Click **Save**.

### Prompt 9b: Login fixes (Email link, Google and error messages)
- Added `app/auth/confirm/route.ts` route handler:
  - Reads `token_hash` and `type` from the URL.
  - Verifies the OTP via `supabase.auth.verifyOtp({ token_hash, type })` with the server client, setting the 30-day auth session cookie.
  - Works across different browsers and in-app browsers (e.g. Gmail app) without needing a PKCE code verifier.
  - On failure, redirects to `/auth/error?reason=expired` (or reason determined from error).
  - Clears `moneymap_guest` cookie on success and redirects to `/`.
- Maintained `app/auth/callback/page.tsx` for Google OAuth code exchange via `supabase.auth.exchangeCodeForSession(code)`.
- Added automatic guest data migration check in `components/home-view.tsx` on Home mount:
  - When landing on `/` after sign-in (via `/auth/confirm` or `/auth/callback`), if the user is authenticated and has guest rows in IndexedDB, runs `claimGuestData(userId)`.
  - Sets `user_id` on all guest entries, categories, and loans, queues each into the sync `outbox`, and displays the toast `"Your N entries are now saved to your account"`.
- Built dynamic redirect addresses:
  - Both Google `redirectTo` (`${origin}/auth/callback`) and email `emailRedirectTo` (`${origin}/auth/confirm`) dynamically use `window.location.origin` (or `process.env.NEXT_PUBLIC_APP_URL`), eliminating hardcoded localhost URLs.
- Created dedicated friendly `/auth/error` page (`app/auth/error/page.tsx`):
  - Expired or already-used link: *"This sign-in link has expired or was already used. Ask for a new one."*
  - Cross-browser PKCE failure: *"Open the sign-in link in the same browser where you asked for it, or continue with Google."*
  - Fallback / unexpected: *"We couldn't sign you in. Please try again."*
  - Includes prominent *"Try again"* button navigating back to `/welcome`.
- Implemented error message mapping in `lib/auth/errors.ts` for `/welcome` and `/auth/check-email`:
  - 429 rate limit exceeded: *"Too many emails sent. Please wait a few minutes and try again, or continue with Google."*
  - Google provider disabled: *"Google sign-in isn't ready yet. Use email for now."*
  - Invalid email: *"Enter a valid email"*
  - Visible 60-second countdown before "Resend" is allowed on `/auth/check-email`.
- Verified:
  - Unit tests: 7 tests in `tests/unit/auth-errors.test.ts` passing (109 total unit tests passing across all 8 suites).
  - Playwright E2E tests: 14 tests in `tests/e2e/auth-flow.spec.ts` passing on mobile (390px) and desktop (1280px), including bad token redirect to friendly `/auth/error` page and cross-browser notices.
  - Production build (`bun run build`) passing with 0 errors.

### Prompt 9c: Critical Testing Fixes
- **Spec Updates**:
  - `docs/PRD.md`, `CLAUDE.md`, and `AGENTS.md` updated.
  - User-facing nomenclature updated: "Money in" is now "Income" and "Money out" is now "Expenses" across all labels, cards, forms, toasts, records, charts, PDF text, and tests. Internal code names (`kind: "income" | "expense"`) remain unchanged.
  - Home shows real month name (e.g. "October 2026"), never "This month".
  - Added Rule 10 to `CLAUDE.md`: *"Every amount input shows thousands commas while typing."*
- **1. Home Cards on Desktop**:
  - Amounts fit cards at every viewport width from 360px to 1920px. Used `min-w-0`, `tabular-nums`, and responsive typography scaling down gracefully for long amounts like `₦999,999,999.99` so no text overflows or cuts off.
  - Layout: 2x2 on phones and tablets/small laptops (<1024px), 4 in a row from 1024px (`lg:grid-cols-4`). Equal card heights maintained.
  - Playwright check verified at 1024px, 1280px, and 1440px with `₦999,999,999.99` on every card.
- **2. Commas While Typing**:
  - `AmountField` (`components/amount-field.tsx`) formats amounts with live thousands commas as the user types (`1` -> `1`, `1000` -> `1,000`, `1234567.5` -> `1,234,567.5`).
  - Preserves caret position during typing, deleting, backspacing, or editing in the middle. Pasting `"2500"`, `"2,500"`, or `"₦2,500.50"` parses correctly.
  - Value stored in Dexie remains integer minor units (`amount_minor`). Added 4 unit tests covering caret calculation and formatting.
- **3. User-Facing Renaming**:
  - Grepped and updated all instances of "Money in" to "Income" and "Money out" to "Expenses" across all components, navigation, cards, forms, and tests.
- **4. Real Month Name & Month Switcher on Home**:
  - Displays formatted month and year (e.g. "October 2026") with `‹` and `›` navigation arrows.
  - Month strip (Income, Expenses, Left over) and cards (Income, Expenses, Giving) reflect selected month.
  - Tapping month name returns to current month. `›` arrow disabled on current month.
  - "Money I lent" card always displays total balance owed across all loans (not per month).
- **5. Phone Back Button & Navigation History**:
  - Sheet and entry modal routes push browser history (`/new/[action]`). Pressing browser Back closes the sheet/modal and returns to the underlying view without page reload.
  - Records tab, period, and search reside in URL query parameters (`/records?tab=expenses&period=thisMonth`), ensuring Back from record detail returns to the identical tab and filters.
- **6. Back-Dated Entries**:
  - **Cause Explanation**: Home view displays totals strictly scoped to the selected calendar month (by default, the current month). A September entry belongs to September, so it was properly recorded in the database but excluded from October totals.
  - Navigating to September 2026 via the month switcher displays the back-dated entry and includes it in all September totals.
  - Saving an entry dated in another month displays a toast `"Saved to September 2026"` with a `"View"` button that immediately switches Home to that month.
  - All totals (Home strip, cards, Records summary) query by `occurred_on` (user-selected date), never `created_at`.
- **7-10. Records Screen Redesign**:
  - Segmented top tabs: `Income | Expenses | Giving | Lent`, sticky under header on phones, fitting comfortably at 360px.
  - Action cards on Home link directly to their corresponding tab (`/records?tab=income`, `/records?tab=expenses`, etc.). Default tab: Income.
  - Lent tab displays the loans list with borrower, balance left, status, next due date, linking to `/lent/[id]` using `LentListView`.
  - Filter row under tabs: Search box, Category dropdown (All categories default), Period dropdown (This month default, Last 3 months, Last 6 months, Last 12 months, Custom date range DD-MM-YYYY).
  - Summary placed at TOP under filter row: `"N entries · ₦X"`.
  - Desktop inline Edit and Delete icon buttons always visible on every row with tooltips and keyboard focus. Mobile retains swipe-left gestures.
- **Verification**:
  - `bun run lint`: 0 errors.
  - `bun run typecheck`: 0 errors.
  - `bun run test`: 113 unit tests passing across all 8 suites.
  - `bun run build`: All 21 routes built successfully.
  - Playwright E2E: All 12 tests in `tests/e2e/prompt9c-fixes.spec.ts` passing across phone (360px, 390px) and desktop (1024px, 1280px, 1440px). All 6 tests in `tests/e2e/records-flow.spec.ts` and all 6 tests in `tests/e2e/lent-flow.spec.ts` passing.
  - Screenshots saved to `tests/e2e/screenshots/` (`home-cards-360px.png`, `home-cards-390px.png`, `home-cards-1024px.png`, `home-cards-1280px.png`, `home-cards-1440px.png`, `records-390.png`, `records-1280.png`).

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
- All calculations in `lib/calc` operate on integer minor units (kobo/cents) with no floating-point math for money.
- Date arithmetic in `lib/calc` uses UTC calendar methods to avoid local timezone drift.
- Responsive entry modal utilizes `React.useSyncExternalStore` for SSR-safe viewport match-media detection avoiding React 19 cascading re-render warnings.
- HomeView maintains entry modal state with `window.history.pushState` on card clicks to allow instant modal transitions over Home without unmounting or duplicate route DOM mounts.
- All form fields shown directly without "More details" collapsibles, with required fields first followed by optional fields marked "(optional)".
- Phone drawer utilizes `handleOnly={true}` from vaul so inner form touch scrolling never conflicts with sheet dismiss gestures.
- Loan countdown strings computed via pure function `loanCountdown` in `lib/calc` to ensure identical presentation across list and detail views.
- Record payment and edit loan forms isolate initial state via keyed inner components (`key={id}`) to remain strictly compliant with React 19 rendering purity rules.
- Records virtualization implements `@tanstack/react-virtual` with custom `arePropsEqual` memoization to eliminate row re-renders during high-speed scrolling.
- Virtual list container and row items utilize `touch-pan-y` CSS property to enable immediate compositor-driven touch scrolling without blocking main-thread touch gesture checks.
- Guest writes (entries, categories, loans) store `user_id = ""` and do not add to outbox until `claimGuestData(newUserId)` runs on sign-in.
- `claimGuestData` updates all guest rows across `entries`, `loans`, `loan_payments`, `categories`, `recurring_rules`, `profiles` in a single Dexie transaction and queues each to outbox.
- Guest banner dismissal stores `guest_banner_dismissed_until` timestamp in Dexie `meta` store for 7 days.
- Auth session cookies set with 30-day lifetime (`maxAge: 2592000`).
- Auth flow uses `/auth/confirm` for email links (server OTP verification via `verifyOtp` without PKCE) and `/auth/callback` for Google OAuth (`exchangeCodeForSession`).
- Claim guest data hook mounted on Home (`/`) to ensure guest entries are claimed and toasted regardless of the login route used.
- AmountField uses `useEffect` for syncing external `value` prop to satisfy React Compiler while maintaining instant caret position and live comma formatting.
- Records view parameters (`tab`, `period`, `search`, `category`) are synced bidirectionally to URL search parameters for back-button resilience and shareable filtered states.

## Database & Auth Instructions

- **Supabase URL Configuration**:
  - Site URL: `https://money-map-tau.vercel.app`
  - Redirect URLs: `https://money-map-tau.vercel.app/**` and `http://localhost:3000/**`
- **Auth Routes**:
  - Email magic links: handled by `app/auth/confirm/route.ts` via token_hash verification.
  - Google OAuth: handled by `app/auth/callback/page.tsx` via code exchange.
- **How to run the local DB**: If Docker is installed on the host machine, run `bunx supabase start` (resets with `bunx supabase db reset`). Without Docker, development connects to the linked remote project (`jiktrplyuneakhhoayde`) via `bunx supabase db query --linked`.
- **How to regenerate types**: Run `bun run db:types`.
- **Schema cloud push status**: The schema has been pushed to the cloud project (`jiktrplyuneakhhoayde`).

### Prompt 10: Sync engine
- **Endpoints (`POST /api/sync/push` & `GET /api/sync/pull`) (PRD Section 7)**:
  - Zod schemas in `lib/schemas/index.ts` validate push (`syncPushSchema`) and pull (`syncPullQuerySchema`).
  - Auth enforced via `@supabase/ssr` server client reading cookies: missing session returns `401 {"error":"unauthorized"}`.
  - Zod validation errors return `422 {"error":"invalid","issues":[...]}`.
  - Sliding-window in-memory rate limiter (`lib/sync/rate-limit.ts`) enforces max 60 requests per minute per user on `/api/sync/*`, returning `429 {"error":"rate_limited"}`.
  - Push endpoint (`/api/sync/push`):
    - Caps change count at 500 changes per batch.
    - Forces `user_id` to the authenticated caller session ID on all changes.
    - Processes changes in foreign key dependency order: `profiles` -> `categories` -> `loans` -> `entries` -> `loan_payments` -> `recurring_rules`.
    - Implements Last-Write-Wins (LWW) conflict resolution using `updated_at`: skips any change where the server copy has a later `updated_at`.
    - Returns `200 {"applied": [...], "skipped": [...]}`.
  - Pull endpoint (`/api/sync/pull`):
    - Queries rows with `server_updated_at > since` (or all rows if `since` omitted), including soft-deleted rows (`deleted_at is not null`).
    - Paginates up to 2,000 rows per table with `has_more: boolean` indicating whether additional pages exist.
    - Returns `200 {"rows": { categories, entries, loans, loan_payments, recurring_rules, profiles }, "server_time": string, "has_more": boolean}`.
- **Client Sync Cycle & Background Scheduler (`lib/sync/index.ts`) (PRD Section 8)**:
  - `run()`: Executes push followed by pull.
    - Concurrency lock: strictly guarantees only one sync cycle runs at any given time; any requests queued while a sync is in progress are coalesced into a single follow-up cycle upon completion.
    - Push: Reads up to 500 items ordered by `seq` from Dexie `outbox`, sends to `/api/sync/push`, and removes applied/skipped IDs from `outbox`. Loops until outbox is empty.
    - Pull: Calls `/api/sync/pull?since=<last_pull_at>` in a loop until `has_more` is false. Merges server copies using Last-Write-Wins on `updated_at`. Saves `server_time` into Dexie `meta.last_pull_at`.
  - Triggers:
    - On app initialization (`initSync`).
    - On the browser's `online` event.
    - 2 seconds debounced after any local Dexie write via `executeWrite()` in `lib/repo`.
    - Every 60 seconds while the document is visible (`visibilityState === "visible"`).
    - When switching back to the app (`visibilitychange` event).
  - Backoff:
    - Retries failed network syncs with exponential backoff: 5 s, 15 s, 60 s, then every 5 min.
- **Guest Category Merge (`lib/sync/category-merge.ts`) (PRD Section 8 Step 2)**:
  - On first sync after claim, merges default categories (`is_default: true`) matching a server category by `slug`.
  - Re-points all referencing `entries`, `loans`, and `recurring_rules` to the server's category ID.
  - Deletes the local duplicate category from Dexie `categories` and removes it from `outbox`.
- **Header Sync Badge (`components/app-header.tsx`)**:
  - Live reactive indicator reading `db.outbox.count()` via `useLiveQuery` and network/sync states via `useSyncExternalStore`.
  - Renders:
    - `Synced`: Green cloud icon with checkmark when online and outbox count is 0.
    - `Syncing`: Animated spinning refresh icon while push or pull cycle is active.
    - `Offline (N changes waiting)` / `Offline (1 change waiting)` / `Offline`: Amber cloud-off badge when offline or server unreachable, indicating the exact count of pending outbox modifications.
- **Sign Out Flow (`lib/sync/index.ts` & `app/settings/page.tsx`)**:
  - Settings page provides a "Sign out" action with a confirmation dialog: *"Sign out of this device? Unsynced changes will be lost if you continue."*
  - `signOut()`: Runs one final push if online, invokes `supabase.auth.signOut()`, clears every Dexie table (`entries`, `categories`, `loans`, `loan_payments`, `recurring_rules`, `profiles`, `outbox`, `meta`), and redirects to `/welcome`.
- **Verification**:
  - `bun run lint`: 0 errors.
  - `bun run typecheck`: 0 errors.
  - `bun test`: All 129 Vitest tests passing across 10 test suites, including:
    - Integration tests in `tests/unit/sync.test.ts`: multi-device concurrent sync with LWW, soft deletes, idempotence, guest category slug merge, rate limit handling, sign out table clearance.
    - Route tests in `tests/unit/sync-routes.test.ts`: 401 unauthenticated, 422 schema validation, 429 rate limit thresholds, 200 push/pull.
  - Playwright E2E (`tests/e2e/sync-flow.spec.ts`):
    - Passes on mobile phone (390px) and desktop (1280px).
    - Simulates going offline (`context.setOffline(true)`), saving an entry, verifying header badge displays `"Offline (1 change waiting)"` and outbox contains 1 change.
    - Restores connection (`context.setOffline(false)`), verifies badge returns to `"Synced"` within 5 seconds, outbox drains to 0, and row is transmitted in the push payload.
  - Next.js production build (`bun run build`): All 23 routes built successfully with `/api/sync/push` and `/api/sync/pull` generated as dynamic endpoints.

## Known issues

- None.

## Next prompt

Prompt 11: offline app shell



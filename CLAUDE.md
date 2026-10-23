# Money Map: rules for the coding agent

The full spec is `docs/PRD.md`.

**Rules the coding agent must follow throughout:**

1.  Do not write features outside this PRD. If something is unclear, stop and ask; never invent fields, categories or endpoints.

2.  Money is stored as integers in minor units (kobo, cents) in a column named `amount_minor`. Never use floats for money. Format only at display time with `Intl.NumberFormat` and the user's currency.

3.  Every date the user sees or types is DD-MM-YYYY (e.g. 20-10-2026): forms, lists, charts, PDFs, share pages, file names and notifications, through one helper, formatDate() in lib/format. Inside the code, dates are stored as `date` (kept as YYYY-MM-DD internally because it sorts correctly; convert only when showing or reading input; no time zone). System timestamps are `timestamptz` in UTC.

4.  Every table has `id uuid` generated on the client (`crypto.randomUUID()`), plus `created_at`, `updated_at`, `deleted_at` (soft delete) for sync.

5.  UI writes go to Dexie first, never straight to Supabase. Sync is a separate module (section 8).

6.  All user-facing text is plain English with the labels in this PRD exactly as written.

7.  TypeScript strict mode; Zod schemas in `lib/schemas` are the single source of truth for form validation and API payloads.

8.  Each feature is done only when its acceptance criteria pass in Playwright on a 390 px wide phone viewport and a 1280 px desktop viewport.

9.  Use Bun for installs, scripts and tests.

10. Every amount input shows thousands commas while typing.

11. Every delete asks for confirmation first.

Read docs/PROGRESS.md before starting any task and update it when finishing.

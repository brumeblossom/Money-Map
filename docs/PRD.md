# Money Map: PRD v1

2026-10-20 · Chinedum

## 1. Overview and rules for the agent

Money Map is a mobile-first, offline-first web app (PWA) where a user records money in four actions (Income, Expenses, Giving, Money I lent) and sees totals, charts and habit reports. v1 ships on Vercel with Next.js, Dexie (local) and Supabase (cloud). Product decisions come from the approved [Phase 1 doc](https://claude.ai/code/artifact/7ba08aa4-d009-42a5-845e-13c734aac22c).

**v1 scope:** guest mode and login (magic link, Google), four record forms (Income, Expenses, Giving, Money I lent), records list with edit and delete, money received back on loans, repeating-entry reminders, dashboard, category habit reports, PDF export, shareable links, settings (currency, categories, account deletion), full offline use with background sync.

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

## 2. Screens and navigation

Four main tabs: Home, Records, Insights, Settings. Phones and tablets (under 1024 px) show a fixed bottom bar; desktop (1024 px and up) shows a 240 px left sidebar with the logo on top and the user's name plus Settings at the bottom. Content is a single centred column (max 560 px) on desktop, except Insights, which uses two columns.

| Route                           | Screen           | Purpose                                                                                                                                                              |
|---------------------------------|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/welcome`                      | Welcome          | Logo, one-line pitch, buttons: Continue with Google, Continue with email, Try without an account                                                                     |
| `/auth/check-email`             | Check your email | Shown after a magic link is sent; resend after 60 s                                                                                                                  |
| `/auth/confirm`                 | Confirm email    | Server OTP token verification with 30-day session cookies, redirects to `/`                                                                                          |
| `/auth/callback`                | (no UI)          | Supabase auth redirect; merges guest data, then goes to `/`                                                                                                          |
| `/auth/error`                   | Auth error       | Friendly error messages with "Try again" button                                                                                                                      |
| `/`                             | Home             | Heading "What are we recording today?", hint "Tap a card to add an entry", current month strip (with ‹ and › month switcher, e.g. "October 2026"), four action cards (Income, Expenses, Giving, Money I lent), pending repeat reminders banner |
| `/new/[action]`                 | Entry form       | Bottom sheet on phones, centred modal on desktop, over Home. `action` is one of `income`, `expense`, `giving`, `lent`                                                |
| `/records`                      | Records          | Tabs (Income, Expenses, Giving, Lent). Filter row (search, category, period), top summary, virtualised day-grouped list with inline edit/delete                     |
| `/records/[id]`                 | Entry detail     | All fields, Edit, Delete                                                                                                                                             |
| `/records/[id]/edit`            | Edit entry       | Same form as create, pre-filled                                                                                                                                      |
| `/lent`                         | Money I lent     | Loans with balance left, status and progress bar; Paid off section                                                                                                   |
| `/lent/[id]`                    | Loan detail      | Timeline of money received, Record money received                                                                                                                    |
| `/insights`                     | Dashboard        | Period switcher and the dashboard blocks                                                                                                                             |
| `/insights/habits`              | Habits           | Habits summary and a card per expense category                                                                                                                       |
| `/insights/habits/[categoryId]` | Category report  | Full report for one category                                                                                                                                         |
| `/export`                       | Export           | Period picker, action filter, Export as PDF, Create share link                                                                                                       |
| `/settings`                     | Settings         | Name, currency, manage categories, repeating entries, share links, notifications, sign in or sign out, delete account                                                |
| `/s/[token]`                    | Shared report    | Public, read-only snapshot; no app chrome, Money Map footer                                                                                                          |

Home cards in order: Income, Expenses, Giving, Money I lent. Grid is 2 by 2 on phones and tablets (<1024px) and 4 in a row only from 1024px desktop. Each card shows its icon, label and the selected month's total (Money I lent shows the total still owed to the user). Home displays the real month name (e.g. "October 2026") with small ‹ and › month switcher arrows, never "This month". Tapping the month name returns to the current month. › is disabled on the current month.

## 3. User stories and acceptance criteria

Each story has an ID the prompt pack will reference. A story is done only when every criterion under it passes.

### E1. Getting started and login

**US-1.1** As a new visitor, I want to try the app without an account, so I can see if it suits me.

- Tapping "Try without an account" opens Home within 1 s with default categories and no network call required.

- Guest data is stored only in Dexie, with `user_id = null`.

- After the guest saves their 3rd entry, a dismissible banner says "Save your data: sign in so you don't lose it" with a Sign in button. Dismissing hides it for 7 days.

**US-1.2** As a user, I want to sign in with an email link or Google, so I never need a password.

- Entering a valid email sends a Supabase magic link and shows `/auth/check-email`; invalid emails show "Enter a valid email" under the field.

- "Continue with Google" completes Google OAuth and lands on Home.

- Sessions persist for 30 days; reopening the app within that time never shows the login screen.

**US-1.3** As a guest who signs in, I want my guest entries kept.

- On first sign-in, every Dexie row with `user_id = null` gets the new user's id and is queued for sync. No entry is lost or duplicated.

- A toast says "Your N entries are now saved to your account".

**US-1.4** As a user, I want to sign out and delete my account.

- Sign out clears Dexie and returns to `/welcome` after confirming "Sign out of this device?".

- Delete account requires typing DELETE, calls `POST /api/account/delete`, removes all server data and local data, and returns to `/welcome`.

### E2. Recording entries

**US-2.1** As a user, I want to tap a card and record an entry in under 15 seconds.

- Tapping a card opens its form with the amount field focused and a numeric keypad (`inputmode="decimal"`).

- Required fields per form are exactly those in section 4; Save is disabled until they are valid.

- Date defaults to today; category defaults to the last category used for that action.

- Optional fields sit under a collapsed "More details" link.

- Save writes to Dexie, closes the form, shows "Saved" with Undo for 5 s, and updates the card total immediately, online or offline.

- Undo removes the entry completely.

**US-2.2** As a user, I want only the actions I need, so the app stays simple.

- Home shows exactly four cards: Money in, Money out, Giving, Money I lent. There is no borrowing, savings or investment feature anywhere in v1.

**US-2.3** As a user, I want to add my own category while filling a form.

- Every category picker ends with "Other (type your own)". Choosing it shows a text field; on Save, the new category is created for that action and selected next time.

### E3. Records: view, edit, delete

**US-3.1** As a user, I want to see everything I recorded.

- `/records` lists entries newest first, grouped by date with each day's net total.

- Filters: action (multi-select), category, period (This week, This month, 3 months, Year, Custom). Search matches description, source and counterparty text.

- The footer shows the count and total of the filtered list.

**US-3.2** As a user, I want to add up several entries.

- Long-press (phone) or checkbox (desktop) selects entries; a bar shows "N selected, total ₦X" with in-entries added and out-entries subtracted.

**US-3.3** As a user, I want to edit an entry.

- Edit opens the same form pre-filled; saving updates `updated_at` and every total and chart that used it.

**US-3.4** As a user, I want to delete an entry.

- Delete asks "Delete this entry?" once, then removes it from the list with Undo for 5 s. It sets `deleted_at`; it never hard-deletes.

- Swipe left on a list row (phone) reveals Edit and Delete.

### E4. Money I lent

**US-4.1** As a user, I want to record money I lent and when I expect it back.

- Saving the Money I lent form creates a `loans` row; it appears on the Home card total and in `/lent`.

- If Payback plan is Weekly or Monthly, the form suggests Instalment amount = total to get back ÷ number of instalments up to Expected back by, rounded up to the nearest whole unit; the user can change it.

**US-4.2** As a user, I want to record money paid back to me.

- "Record money received" adds a `loan_payments` row with amount, date and optional note.

- An amount larger than the balance left shows "This is more than the N left. Save anyway?".

- Balance, progress bar and status update instantly. At balance 0 the status becomes Paid off and the loan moves to a Paid off section.

**US-4.3** As a user, I want reminders to follow up on money owed to me.

- If Remind me is on, the user gets a push notification (or email if push is unavailable) 3 days before each expected instalment date and on the final Expected back by date, e.g. "Ada is due to pay back ₦27,500 on 20-10-2026".

- Status rules are in section 5.

### E5. Repeating entries

**US-5.1** As a user, I want rent, salary and similar entries to remind me each time.

- Choosing Repeats Weekly or Monthly on Income, Expenses or Giving creates a `recurring_rules` row with the next due date.

- On or after the due date, Home shows a banner card: "Rent ₦150,000 is due today. Add it?" with Add, Edit first, and Skip.

- Add creates the entry with today's date; Edit first opens the pre-filled form; Skip moves the rule to the next date. Nothing is added without a tap.

- A push notification is sent on the due date if notifications are on.

- Settings \> Repeating entries lists rules with Pause and Delete.

### E6. Dashboard

**US-6.1** As a user, I want to see my money picture for a period.

- `/insights` shows, in order: period switcher, Left over card, four tiles (Income, Expenses, Given, Owed to me), Spending by category donut with ranked list, Income vs Expenses bars, Money I lent block, Smart tip, Recent entries.

- All numbers follow section 5 and match the Records totals for the same filter exactly.

- The donut shows the top 5 expense categories plus Other; tapping a slice opens Records filtered to that category and period.

- With no data, each block shows a friendly empty state with an "Add your first entry" button, never a blank chart.

- Charts render in under 300 ms with 5,000 entries on a mid-range phone.

### E7. Habit reports

**US-7.1** As a user, I want a report for each expense category.

- `/insights/habits` shows the Habits summary (top 3 rising and top 3 falling categories vs last month, as sentences) and one card per category with spend this period, ranked by amount.

- The category report shows: total and share, 6-month trend line, count and average per entry, busiest weekday, biggest entry, and habit label (Steady, Rising, Falling, Spike) per section 5.

- All reports are computed on the device and work offline.

### E8. Export and share

**US-8.1** As a user, I want to export a period as a PDF.

- `/export` lets the user pick a period (presets or custom dates) and which actions to include.

- "Export as PDF" generates the file in the browser (works offline) named `MoneyMap_<start>_to_<end>.pdf` with DD-MM-YYYY dates, e.g. MoneyMap_01-10-2026_to_31-10-2026.pdf, with page 1 summary (totals, category donut) and following pages listing entries in a table (date, action, category, description, amount).

**US-8.2** As a user, I want a shareable link for a period.

- "Create share link" requires a signed-in user and internet; offline it shows "You need internet to create a link".

- Options: expires in 7 days, 30 days or never (default 30 days); Hide descriptions and names (default on).

- The link opens `/s/[token]` for anyone, read-only, showing the same summary and entry table as the PDF.

- Settings \> Share links lists links with Copy and Turn off; a turned-off or expired link shows "This link is no longer available".

### E9. Settings and categories

**US-9.1** As a user, I want to set my currency.

- Currency is chosen from a searchable list; default is NGN (₦). Changing it changes display only, never stored amounts.

**US-9.2** As a user, I want to manage categories.

- For each action, the user can add, rename, reorder and hide categories. Hidden categories stay on old entries but no longer appear in pickers. Default categories can be hidden but not deleted.

### E10. Offline and sync

**US-10.1** As a user, I want the app to work with no internet.

- After the first load, the app opens and every feature except sign-in and creating share links works offline.

- A small cloud icon in the header shows Synced, Syncing or Offline (N changes waiting).

- Changes made offline appear on the user's other devices within 30 s of both being online.

## 4. Form specs

These are the final fields from Phase 1, including Chinedum's edits. Every category picker is a dropdown (a bottom-sheet list on phones) ending with "Other (type your own)". "Column" is where the value is stored (section 6). Amount rules for all forms: greater than 0, at most 2 decimals, at most 999,999,999,999.99.

Every date picker (both phone and desktop): no future dates, except "Expected back by" on loans (which must be on or after Date lent). This includes Date lent, entry dates, money received, and edit forms. Future days are disabled in the calendar and rejected by Zod validation with the message "Date can't be in the future".

There is NO "More details" section. Every field shows directly on the form. Required fields first, then optional fields marked "(optional)" in the label.

### 4.1 Income (`kind = income`)

| Field                  | Input                 | Required | Column                 | Notes                                                |
|------------------------|-----------------------|----------|------------------------|------------------------------------------------------|
| Amount                 | Decimal keypad        | Yes      | `entries.amount_minor` |                                                      |
| Category               | Dropdown              | Yes      | `entries.category_id`  | Defaults to last used                                |
| Date                   | Date picker           | Yes      | `entries.occurred_on`  | Defaults to today; no future dates                   |
| Source (optional)      | Text, max 80          | No       | `entries.counterparty` | e.g. employer, client, brand                         |
| Repeats (optional)     | No / Weekly / Monthly | No       | `recurring_rules`      | Remind and tap to confirm (US-5.1)                   |
| Description (optional) | Multi-line, max 500   | No       | `entries.description`  |                                                      |

Categories: Salary, Business sales, Side gig / freelance, Brand partnerships, Digital products, Gift received, Investment returns, Refund, Allowance, Other.

### 4.2 Expenses (`kind = expense`)

| Field                  | Input                 | Required | Column                 | Notes                   |
|------------------------|-----------------------|----------|------------------------|-------------------------|
| Amount                 | Decimal keypad        | Yes      | `entries.amount_minor` |                         |
| Category               | Dropdown              | Yes      | `entries.category_id`  | Drives habit reports    |
| Date                   | Date picker           | Yes      | `entries.occurred_on`  |                         |
| Repeats (optional)     | No / Weekly / Monthly | No       | `recurring_rules`      | For rent, subscriptions |
| Description (optional) | Multi-line, max 500   | No       | `entries.description`  |                         |

Categories (Chinedum's list): Personal, Family, Subscriptions, Light (electricity), Fuel, Diesel, Internet, Food, Groceries, Transportation, Car repair, Household fixing, Rent savings, Enjoyment, Other.

### 4.3 Giving (`kind = giving`)

| Field                  | Input                 | Required | Column                 | Notes                                  |
|------------------------|-----------------------|----------|------------------------|----------------------------------------|
| Amount                 | Decimal keypad        | Yes      | `entries.amount_minor` |                                        |
| Category               | Dropdown              | Yes      | `entries.category_id`  |                                        |
| Date                   | Date picker           | Yes      | `entries.occurred_on`  |                                        |
| Recipient (optional)   | Text, max 80          | No       | `entries.counterparty` | Person, church, mosque or organisation |
| Repeats (optional)     | No / Weekly / Monthly | No       | `recurring_rules`      |                                        |
| Description (optional) | Multi-line, max 500   | No       | `entries.description`  |                                        |

Categories: Tithe, Offering & seed, Charity / NGO, Family support, Friends & community, Pledge, Other.

### 4.4 Money I lent (`loans`)

| Field             | Input                          | Required | Column                                        | Notes                                        |
|-------------------|--------------------------------|----------|-----------------------------------------------|----------------------------------------------|
| Borrower          | Text, max 80                   | Yes      | `loans.counterparty`                          | Who you lent to                              |
| Amount lent       | Decimal keypad                 | Yes      | `loans.principal_minor`                       |                                              |
| Category          | Dropdown                       | Yes      | `loans.category_id`                           |                                              |
| Date lent         | Date picker                    | Yes      | `loans.started_on`                            |                                              |
| Expected back by  | Date picker                    | Yes      | `loans.due_on`                                | Must be on or after Date lent                |
| Payback plan      | One payment / Weekly / Monthly | No       | `loans.plan`                                  | Default One payment                          |
| Instalment amount | Decimal                        | No       | `loans.instalment_minor`                      | Suggested per US-4.1                         |
| Interest          | Percent or flat amount toggle  | No       | `loans.interest_type`, `loans.interest_value` | Percent in basis points, flat in minor units |
| Remind me         | Switch                         | No       | `loans.remind`                                | Default on                                   |
| Description       | Multi-line, max 500            | No       | `loans.description`                           |                                              |

Categories: Family, Friend, Colleague, Customer (credit sale), Other.

Record money received form: Amount (required), Date (required, default today), Note (optional, max 200) → `loan_payments`.

## 5. Calculations

All maths lives in one pure module, `lib/calc`, with unit tests for every rule below. Inputs are rows with `deleted_at = null`; a period P is an inclusive date range on `occurred_on` (entries) or `paid_on` (payments). All sums are integer minor units.

### 5.1 Period totals

| Name                  | Formula                                                                                                                                                                       |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Income                | sum of `income` entries in P                                                                                                                                                  |
| Expenses (direct)     | sum of `expense` entries in P                                                                                                                                                 |
| Giving                | sum of `giving` entries in P                                                                                                                                                  |
| Expenses (total)      | Expenses (direct) + Giving                                                                                                                                                    |
| Left over             | Income − Expenses (total)                                                                                                                                                     |
| Owed to me            | sum of Balance left over all loans not Paid off (not limited to P)                                                                                                            |
| Change vs last period | compare with the period of equal length ending the day before P starts: (current − previous) ÷ abs(previous) × 100, rounded to a whole percent; show "New" when previous is 0 |

Money lent out and money received back are not part of Income or Expenses; they appear only on the Money I lent card, the Owed to me tile and the Money I lent block. Records shows only income, expense and giving entries.

**Signed amount** (used by multi-select sums and daily totals in Records): income +, expense −, giving −.

### 5.2 Money I lent

- Interest: percent → principal × basis points ÷ 10,000, rounded to the nearest minor unit; flat → the value as entered; none → 0.

- Total to get back = principal + interest.

- Received so far = sum of the loan's payments (all time). Balance left = max(Total to get back − Received so far, 0).

- Instalment count n = number of whole weeks (Weekly) or calendar months (Monthly) from `started_on` to `due_on`, minimum 1. Suggested instalment = Total to get back ÷ n, rounded up to a whole major unit (multiple of 100 minor).

- Instalment date k (k = 1..n) = `started_on` + k weeks or months; the last one is always `due_on`. For One payment, the only date is `due_on`.

- Next expected date = the earliest instalment date k where k × instalment (capped at Total to get back) is greater than Received so far.

- Status, first match wins: Paid off (Balance left = 0) → Overdue (today is after Next expected date) → Due soon (Next expected date within 7 days) → Active.

- Progress bar = Received so far ÷ Total to get back.

### 5.3 Habit reports (expense categories)

- Share = category total ÷ Expenses for P, whole percent.

- Trend = monthly totals for the last 6 calendar months including the current one.

- Count = number of entries in P; Average = total ÷ count.

- Busiest weekday = weekday with the highest summed amount in P (ties: earliest in the week, Monday first).

- Biggest entry = the single largest entry in P.

- Habit label uses whole calendar months: M0 = this month so far, M1 and M2 = the two months before, A = average of M1, M2 and the month before M2. First match wins: **Spike** if A \> 0 and M0 ≥ 2 × A; **Rising** if M0 \> 1.15 × M1 and M1 \> 1.15 × M2; **Falling** if M0 \< 0.85 × M1 and M1 \< 0.85 × M2; otherwise **Steady**. Categories with fewer than 3 entries over those 4 months show "Not enough data yet".

- Habits summary = the 3 categories with the largest rise and the 3 with the largest fall from M1 to M0 (in amount), each as a sentence: "You spent 18% more on Food this month (₦42,500 vs ₦36,000)."

- Smart tip on the dashboard = the summary sentence with the largest absolute percent change among categories that are at least 5% of Expenses; if none qualify, "You're on track. Keep recording to see your habits."

## 6. Database schema

Supabase Postgres is the cloud copy; Dexie (IndexedDB) holds the same tables on the device. Migrations live in `supabase/migrations` and are the only way the schema changes. Every syncable table carries the same five sync columns:

- `id uuid primary key` (made on the client)

- `user_id uuid not null references auth.users on delete cascade`

- `created_at timestamptz`, `updated_at timestamptz` (client clock, used to pick the latest edit)

- `deleted_at timestamptz null` (soft delete)

- `server_updated_at timestamptz not null default now()` (set by trigger on every insert or update; the pull cursor)

### 6.1 Postgres tables

``` sql
create type entry_kind as enum ('income','expense','giving');
create type category_scope as enum ('income','expense','giving','lent');
create type repeat_plan as enum ('one_payment','weekly','monthly');
create type interest_kind as enum ('none','percent','flat');

create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  currency char(3) not null default 'NGN',
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  scope category_scope not null,
  name text not null check (char_length(name) between 1 and 40),
  slug text,                      -- set for built-in defaults, e.g. 'food'
  is_default boolean not null default false,
  is_hidden boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null, updated_at timestamptz not null,
  deleted_at timestamptz, server_updated_at timestamptz not null default now(),
  unique (user_id, scope, name)
);

create table entries (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  kind entry_kind not null,
  amount_minor bigint not null check (amount_minor > 0),
  category_id uuid not null references categories(id),
  occurred_on date not null,
  counterparty text check (char_length(counterparty) <= 80),
  description text check (char_length(description) <= 500),
  recurring_rule_id uuid,         -- set when created from a reminder
  created_at timestamptz not null, updated_at timestamptz not null,
  deleted_at timestamptz, server_updated_at timestamptz not null default now()
);
create index entries_user_date on entries (user_id, occurred_on desc) where deleted_at is null;
create index entries_user_kind_cat on entries (user_id, kind, category_id);

create table loans (              -- money the user lent to someone
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  counterparty text not null check (char_length(counterparty) between 1 and 80),
  principal_minor bigint not null check (principal_minor > 0),
  category_id uuid not null references categories(id),
  started_on date not null,
  due_on date not null check (due_on >= started_on),
  plan repeat_plan not null default 'one_payment',
  instalment_minor bigint check (instalment_minor > 0),
  interest_type interest_kind not null default 'none',
  interest_value bigint not null default 0,  -- bps if percent, minor units if flat
  remind boolean not null default true,
  description text check (char_length(description) <= 500),
  created_at timestamptz not null, updated_at timestamptz not null,
  deleted_at timestamptz, server_updated_at timestamptz not null default now()
);

create table loan_payments (      -- money received back
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  loan_id uuid not null references loans(id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  paid_on date not null,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null, updated_at timestamptz not null,
  deleted_at timestamptz, server_updated_at timestamptz not null default now()
);

create table recurring_rules (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  kind entry_kind not null,
  frequency repeat_plan not null check (frequency in ('weekly','monthly')),
  amount_minor bigint not null check (amount_minor > 0),
  category_id uuid not null references categories(id),
  counterparty text, description text,
  next_due_on date not null,
  is_paused boolean not null default false,
  created_at timestamptz not null, updated_at timestamptz not null,
  deleted_at timestamptz, server_updated_at timestamptz not null default now()
);

create table share_links (       -- server only, not synced to Dexie
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  token text not null unique,     -- 22-char random, URL-safe
  period_start date not null, period_end date not null,
  kinds text[] not null,
  hide_details boolean not null default true,
  snapshot jsonb not null,        -- totals, category breakdown, entry rows
  expires_at timestamptz,         -- null = never
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table push_subscriptions ( -- server only
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null,
  created_at timestamptz not null default now()
);
```

### 6.2 Security rules

- Row Level Security is on for every table. Policy on each: `user_id = auth.uid()` for select, insert, update and delete.

- `share_links` public reads never go through RLS: the `/s/[token]` page uses the service role on the server, selects by token, and checks `revoked_at is null` and `expires_at` is null or in the future.

- A trigger `set_server_updated_at()` sets `server_updated_at = now()` on insert and update for every syncable table.

- The service role key is only used in server code (`app/api/**`, cron) and never shipped to the browser.

### 6.3 Dexie tables (on the device)

``` ts
db.version(1).stores({
  profiles: 'user_id',
  categories: 'id, user_id, scope, [scope+is_hidden], updated_at',
  entries: 'id, user_id, kind, category_id, occurred_on, [kind+occurred_on], updated_at, deleted_at',
  loans: 'id, user_id, due_on, updated_at',
  loan_payments: 'id, loan_id, paid_on, updated_at',
  recurring_rules: 'id, next_due_on, updated_at',
  outbox: '++seq, table, row_id',   // pending changes to push
  meta: 'key'                       // last_pull_at, guest flag, banner dismissals
});
```

Rows in Dexie use the same column names as Postgres. Booleans are stored as booleans; dates as `YYYY-MM-DD` strings. On first launch the app writes the default categories from section 4 into Dexie with `is_default = true` and their `slug`.

## 7. API endpoints

All endpoints are Next.js route handlers under `app/api`. Authenticated endpoints read the Supabase session from cookies and return `401 {"error":"unauthorized"}` without one. Bodies are JSON validated with Zod; a failed check returns `422 {"error":"invalid","issues":[...]}`. Everyday reads and writes do not have their own endpoints: the app reads Dexie, and sync moves data.

| Method and path                  | Auth        | Request                                                                             | Response                                                                          | Notes                                                                                                                                                                                                                                                                                               |
|----------------------------------|-------------|-------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `POST /api/sync/push`            | User        | `{ changes: [{ table, row }] }`, max 500 per call                                   | `200 { applied: [ids], skipped: [ids] }`                                          | Upsert by `id`; a row is skipped when the server copy has a later `updated_at`. `user_id` is forced to the caller. Tables: categories, entries, loans, loan_payments, recurring_rules, profiles                                                                                                     |
| `GET /api/sync/pull?since=<iso>` | User        | none                                                                                | `200 { rows: { <table>: [row] }, server_time }`                                   | Rows with `server_updated_at > since`, deleted ones included, max 2,000 per table; `has_more: true` asks the client to call again                                                                                                                                                                   |
| `POST /api/share-links`          | User        | `{ period_start, period_end, kinds, hide_details, expires_in_days: 7 | 30 | null }` | `201 { id, url, expires_at }`                                                     | Server builds the snapshot from Postgres after a push, so the link matches the app                                                                                                                                                                                                                  |
| `GET /api/share-links`           | User        | none                                                                                | `200 [{ id, url, period_start, period_end, expires_at, revoked_at, created_at }]` | For Settings \> Share links                                                                                                                                                                                                                                                                         |
| `DELETE /api/share-links/:id`    | User        | none                                                                                | `204`                                                                             | Sets `revoked_at`                                                                                                                                                                                                                                                                                   |
| `GET /s/[token]`                 | Public      | none                                                                                | HTML page                                                                         | Server-rendered; 404 page with "This link is no longer available" if missing, revoked or expired; `noindex`                                                                                                                                                                                         |
| `POST /api/push/subscribe`       | User        | Web Push subscription `{ endpoint, keys: { p256dh, auth } }`                        | `201`                                                                             | Upsert by endpoint                                                                                                                                                                                                                                                                                  |
| `DELETE /api/push/subscribe`     | User        | `{ endpoint }`                                                                      | `204`                                                                             |                                                                                                                                                                                                                                                                                                     |
| `GET /api/cron/reminders`        | Vercel Cron | header `Authorization: Bearer $CRON_SECRET`                                         | `200 { sent }`                                                                    | Runs daily at 07:00 Africa/Lagos (06:00 UTC). Sends Money I lent follow-up reminders (3 days before and on each expected date, balance left \> 0, `remind = true`) and repeating-entry reminders (rules due today, not paused). Push first; email via Resend when the user has no push subscription |
| `POST /api/account/delete`       | User        | `{ confirm: "DELETE" }`                                                             | `204`                                                                             | Deletes the auth user with the service role; cascades remove all rows                                                                                                                                                                                                                               |
| `GET /auth/callback`             | Public      | Supabase `code`                                                                     | Redirect to `/`                                                                   | Exchanges the code for a session                                                                                                                                                                                                                                                                    |

Rate limits: 60 requests a minute per user on `/api/sync/*`, 10 a minute on `/api/share-links`, returning `429`.

## 8. Offline-first and sync

The screens never wait for the network: they read and write Dexie through `lib/repo`, and a background sync engine in `lib/sync` keeps Dexie and Supabase in step.

**App shell (Serwist service worker):**

- Precache the app shell, all route bundles, fonts and icons at install. Navigations use network-first with a 3 s timeout, then the cache.

- The web app manifest sets name "Money Map", `display: standalone`, theme colour, and 192 px and 512 px maskable icons so the app installs to the home screen.

- When a new version is ready, show "Update available" with a Reload button; never reload on its own while a form is open.

**Writing locally:** every create, edit or delete in `lib/repo` does two things in one Dexie transaction: writes the row (with a new `updated_at`, and `deleted_at` for deletes) and appends `{ table, row_id }` to `outbox`.

**Sync cycle** (`lib/sync/run()`), only when signed in and online:

1.  Push: read up to 500 outbox items, send the current rows to `POST /api/sync/push`, and remove the items that came back as applied or skipped.

2.  Pull: call `GET /api/sync/pull?since=<meta.last_pull_at>` until `has_more` is false; for each row, keep whichever copy has the later `updated_at`; save `server_time` as the new `last_pull_at`.

3.  Run triggers: on app start, on the browser's `online` event, 2 s after any local write (debounced), every 60 s while the app is visible, and when the tab becomes visible.

4.  On a network error, retry with backoff (5 s, 15 s, 60 s, then every 5 min). The header icon shows Offline with the outbox count.

**Conflicts:** last edit wins per row, judged by `updated_at`. A soft delete is an edit, so a later delete beats an earlier change and the other way round.

**Guests:** guest rows have `user_id = null` and are never pushed. On first sign-in (US-1.3), one transaction sets `user_id` on every row, adds them all to the outbox, then runs sync. If the account already has data from another device, both sets are kept; default categories with the same `slug` are merged into the server's copy and entries are re-pointed to it.

**Sign out:** run one last push if online, then clear every Dexie table.

## 9. Non-functional requirements

| Area           | Requirement                                                                                                                                                                                                                                           |
|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Speed          | Lighthouse mobile Performance ≥ 90 on `/` and `/insights`; first load JS under 200 KB gzipped for `/`; saving an entry updates the screen in under 100 ms                                                                                             |
| Scale          | Smooth with 5,000 entries per user: Records list is virtualised; dashboard calculations under 300 ms on a mid-range Android phone                                                                                                                     |
| Accessibility  | WCAG 2.2 AA: colour contrast ≥ 4.5:1, every control has a label, tap targets ≥ 44 px, full keyboard use on desktop, charts have a text summary for screen readers                                                                                     |
| Responsive     | Designed at 360 to 430 px first; tested at 390 px, 768 px and 1280 px; no horizontal scrolling at any width                                                                                                                                           |
| Visual design  | shadcn/ui on Tailwind, one accent colour, green for income and red for expenses used consistently, light and dark mode following the device setting                                                                                                |
| Browsers       | Last 2 versions of Chrome, Safari (iOS 16.4+ for push), Firefox, Edge, Samsung Internet                                                                                                                                                               |
| Security       | RLS on every table; Zod validation on every endpoint; security headers (CSP, HSTS, X-Frame-Options DENY) via `next.config`; share tokens 22 random URL-safe characters; secrets only in Vercel environment variables; run gstack `/cso` before launch |
| Privacy        | No analytics or tracking that sends amounts or descriptions anywhere; account deletion removes all data within 1 minute                                                                                                                               |
| Reliability    | No data loss offline: any entry saved on the device survives app restarts and syncs later; sync is safe to run twice                                                                                                                                  |
| Money accuracy | Integer minor units everywhere; unit tests cover every formula in section 5 with fixtures                                                                                                                                                             |

## 10. Deployment, environments and testing

Code lives in Chinedum's existing GitHub repository, connected to Vercel; every finished prompt is committed and pushed so the work is never lost. Every pull request gets a preview deploy; merging to `main` deploys production. The app uses the free `*.vercel.app` address until a domain is bought.

| Environment | Vercel                          | Supabase project                                                                                         | Used for           |
|-------------|---------------------------------|----------------------------------------------------------------------------------------------------------|--------------------|
| Local       | `bun dev`                       | Supabase CLI local stack (`supabase start`)                                                              | Building and tests |
| Preview     | Preview deploy per pull request | `Chinedum's existing project until launch; add a free second project for staging before real users join` | Review and QA      |
| Production  | `main` branch                   | `Chinedum's existing project`                                                                            | Real users         |

**Environment variables** (set in Vercel per environment, listed in `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`.

**Auth setup:** in Supabase, enable Email (magic link) and Google providers; add each environment's `/auth/callback` URL to the allowed redirect list; customise the magic link email with Money Map branding.

**Cron:** `vercel.json` schedules `/api/cron/reminders` at `0 6 * * *` (06:00 UTC, 07:00 in Lagos).

**CI (GitHub Actions on every pull request):** `bun install`, `bun run lint`, `bun run typecheck`, `bun test` (Vitest unit tests), `bunx playwright test` against the local Supabase stack, and `supabase db lint`. A failing step blocks the merge.

**Database changes:** only through migration files; apply to staging when merged to a release branch, then to production with `supabase db push` just before the production deploy.

**Tests that must exist:**

- Unit: every formula in section 5, Zod schemas, the sync merge rule.

- End-to-end (Playwright, phone and desktop viewports): guest records an entry; sign in keeps guest data; each of the four forms saves; edit and delete with Undo; a loan with two repayments reaches Paid off; a repeat reminder is confirmed; dashboard totals match Records; PDF downloads; share link opens signed out and stops working once turned off; the app works with the network switched off.

**gstack process per feature:** `/plan-eng-review` before building, `/review` and `/qa` before merging, `/ship` to open the pull request; `/cso` and `/benchmark` before launch; `/land-and-deploy` then `/canary` for each production release.

## 11. Out of scope for v1

The agent must not build these yet; each is a candidate for v2.

- Money I borrowed (tracking debts the user owes)

- Savings and investments, and savings goals (other apps cover these)

- Receipt photos on entries

- Monthly budgets per category and budget alerts

- Phone number (SMS) login

- Several currencies in one account, or currency conversion

- Bank account or card connections and automatic imports

- CSV or Excel export and import

- Shared accounts for couples or families

- Native iOS and Android apps (the installable PWA covers phones in v1)

- A custom domain (use the `vercel.app` address until one is bought)

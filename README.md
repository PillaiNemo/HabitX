# HabitX

HabitX is a habit tracking app. You add the habits you want to build, check them off each day, and the app keeps track of how consistent you are over time. It also has a marketing landing page that explains what the app does.

## What it does

The app has two parts:

1. A landing page that explains the product to someone visiting for the first time.
2. The actual app, where a signed-in user tracks their habits day to day.

## Features

**Sign up and sign in.** Users can create an account with an email and password, or sign in with Google. This is handled by Supabase, so passwords are never stored by this app directly.

**Set up your habits.** When someone signs up, they walk through a short setup where they pick the habits they want to track (up to five) and can also set one or two goals, like "run 100km" or "read 12 books."

**One-tap check-ins.** Each day, the user taps a habit to mark it done. There are no forms to fill in.

**Streaks.** The app counts how many days in a row a habit has been checked off, so a user can see their current streak at a glance.

**Visual heatmap.** A grid of colored squares, similar to a GitHub contribution graph, shows which days were more or less consistent over the last several weeks.

**Goals and milestones.** Users can set a target for something they're working toward (like a distance to run or a number of books to read) and log progress toward it over time.

**Analysis.** A sidebar shows which day of the week the user is most consistent on, their overall completion rate, and how stable each individual habit has been.

**Monthly report.** At the end of each month, the app rolls everything up into one report: total check-ins, average consistency, and the longest streak that month, with the option to look back at past months too.

**Monthly wrapped.** A shareable, story-style recap of the month, similar to how music apps show a yearly recap. It highlights the user's top habit, best day, and gives them an "archetype" based on their patterns (for example, someone who is far more consistent on weekdays than weekends).

## How it's built

- **React** and **TypeScript** for the app itself
- **Vite** as the build tool
- **Tailwind CSS** for styling the app screens (the landing page uses plain CSS)
- **Supabase** for authentication and as the database
- **React Router** for moving between the landing page, sign-up flow, and the app

## Running it locally

You'll need Node.js installed, and a Supabase project (a free one is enough).

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy `.env.example` to a new file called `.env.local`, and fill in your own Supabase project's URL and public API key:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find both of these in your Supabase project settings, under API.

3. Set up the database tables (see below), then start the app:

```bash
npm run dev
```

The app will be running at `http://localhost:3000`.

To build it for deployment:

```bash
npm run build
```

## Database setup

The app expects three tables in your Supabase project: `habits`, `goals`, and `daily_logs`. Open the SQL Editor in your Supabase dashboard and run the following:

```sql
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  icon text not null,
  color text not null,
  position int not null default 0
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  icon text not null,
  color text not null,
  target numeric not null,
  current numeric not null default 0,
  unit text not null,
  created_at timestamptz not null default now()
);

create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  habit_id uuid references habits not null,
  log_date date not null,
  completed boolean not null default false,
  unique (user_id, habit_id, log_date)
);

alter table habits enable row level security;
alter table goals enable row level security;
alter table daily_logs enable row level security;

create policy "Users manage own habits" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own daily_logs" on daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

The last part (`row level security`) makes sure each user can only see and change their own data, not anyone else's.

## Project structure

- `src/pages/Landing.tsx` — the marketing landing page
- `src/pages/Onboarding.tsx` — sign-up and initial habit setup
- `src/App.tsx` — the main dashboard once a user is signed in
- `src/lib/db.ts` — all the database read/write functions
- `src/lib/auth.ts` — sign up, sign in, and sign out
- `src/components/` — the individual pieces of UI (habit cards, the heatmap, the monthly report, and so on)

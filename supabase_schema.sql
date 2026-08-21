-- HabitX schema — run in Supabase SQL Editor

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  position int not null default 0
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  target numeric not null,
  current numeric not null default 0,
  unit text not null default 'units',
  created_at timestamptz not null default now()
);

create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  log_date date not null,
  completed boolean not null default false,
  unique (user_id, habit_id, log_date)
);

alter table habits enable row level security;
alter table goals enable row level security;
alter table daily_logs enable row level security;

create policy "habits_owner" on habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "goals_owner" on goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "daily_logs_owner" on daily_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

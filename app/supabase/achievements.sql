-- Achievements and XP
-- Run this once in the Supabase SQL Editor. It's safe to run again.
--
-- Each person gets one row:
--   unlocked: which achievements they have and when they got them, like {"1": "2026-11-19T21:00:00Z"}
--   events:   counts of things that aren't mode sessions, like {"modesCreated": 3, "presetsEdited": 1}
-- Everything else (time in modes, streaks, ...) is worked out from mode_sessions in the app.

create table if not exists public.user_achievements (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  unlocked jsonb not null default '{}'::jsonb,
  events jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_achievements enable row level security;

grant select, insert, update on public.user_achievements to authenticated;

-- People can only see and change their own row
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_achievements'
      and policyname = 'Achievements: users can read their own'
  ) then
    create policy "Achievements: users can read their own"
      on public.user_achievements for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_achievements'
      and policyname = 'Achievements: users can add their own'
  ) then
    create policy "Achievements: users can add their own"
      on public.user_achievements for insert to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_achievements'
      and policyname = 'Achievements: users can update their own'
  ) then
    create policy "Achievements: users can update their own"
      on public.user_achievements for update to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end
$$;

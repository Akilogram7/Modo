-- Group mode sync: the host controls a shared mode, and friends follow along.
-- Paste into Supabase: SQL Editor -> New query -> Run.
-- Run mode_groups.sql first if you haven't yet. This one is safe to run more than once.

-- What the host's timer is doing, so friends see the same countdown and the same breaks.
--   timer_state: 'waiting' (not started yet), 'running' or 'paused'. Empty = waiting.
--   timer_started_at: when the timer would have been at 0 (only while it's running)
--   timer_elapsed: how long it has run in total (while waiting or paused)
--   timer_focus_seconds / timer_break_seconds: the host's focus and break lengths (break 0 = no breaks)
alter table public.mode_groups
  add column if not exists timer_state text,
  add column if not exists timer_started_at timestamptz,
  add column if not exists timer_elapsed integer,
  add column if not exists timer_focus_seconds integer,
  add column if not exists timer_break_seconds integer;

-- Leftovers from an earlier version of this file, in case it was already run
alter table public.mode_groups
  drop column if exists timer_ends_at,
  drop column if exists timer_seconds_left;
drop function if exists public.set_group_timer(uuid, text, integer);

-- HOST: mark a shared mode as running (true) or ended (false).
-- Same as in mode_groups.sql, but it also clears the timer so every session starts fresh.
create or replace function public.set_group_mode_running(p_mode_id uuid, p_running boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A host only runs one mode at a time, so end any of theirs that were running
  update public.mode_groups
    set started_at = null,
        timer_state = null,
        timer_started_at = null,
        timer_elapsed = null,
        timer_focus_seconds = null,
        timer_break_seconds = null
    where host_id = auth.uid() and started_at is not null;

  if p_running then
    update public.mode_groups
      set started_at = now()
      where mode_id = p_mode_id and host_id = auth.uid();
  end if;
end;
$$;

-- HOST: tell friends what the timer is doing.
-- Only works for the host, and only while the mode is running.
create or replace function public.set_group_timer(
  p_mode_id uuid,
  p_state text,
  p_elapsed_seconds integer,
  p_focus_seconds integer,
  p_break_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_state not in ('waiting', 'running', 'paused') then
    raise exception 'Unknown timer state.';
  end if;

  update public.mode_groups
    set timer_state = p_state,
        -- Saved on the server's clock, so it doesn't matter if a phone's clock is off
        timer_started_at = case
          when p_state = 'running' then now() - make_interval(secs => greatest(p_elapsed_seconds, 0))
          else null
        end,
        timer_elapsed = case
          when p_state = 'running' then null
          else greatest(p_elapsed_seconds, 0)
        end,
        timer_focus_seconds = greatest(p_focus_seconds, 0),
        timer_break_seconds = greatest(p_break_seconds, 0)
    where mode_id = p_mode_id
      and host_id = auth.uid()
      and started_at is not null;
end;
$$;

-- EVERYONE: every shared mode you host or joined, with the mode's settings.
-- Same as in mode_groups.sql, plus what the host's timer is doing.
create or replace function public.get_mode_groups()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by created_at), '[]'::jsonb)
  from (
    select
      g.created_at,
      jsonb_build_object(
        'group_id', g.id,
        'role', case when g.host_id = auth.uid() then 'host' else 'member' end,
        -- Only the host gets to see the code
        'code', case when g.host_id = auth.uid() then g.code end,
        'host_name', coalesce(nullif(trim(h.raw_user_meta_data ->> 'display_name'), ''), 'A friend'),
        'members', (
          select coalesce(
            jsonb_agg(
              coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), 'A friend')
              order by gm.joined_at
            ),
            '[]'::jsonb
          )
          from public.mode_group_members gm
          join auth.users u on u.id = gm.user_id
          where gm.group_id = g.id
        ),
        -- How long ago the host started it (empty when it isn't running)
        'running_for_seconds', extract(epoch from (now() - g.started_at)),
        'timer_state', coalesce(g.timer_state, 'waiting'),
        -- While the timer runs this counts up, worked out on the server's clock
        'timer_elapsed_seconds', case
          when g.timer_started_at is not null
            then greatest(0, extract(epoch from (now() - g.timer_started_at)))
          else coalesce(g.timer_elapsed, 0)
        end,
        'timer_focus_seconds', g.timer_focus_seconds,
        'timer_break_seconds', g.timer_break_seconds,
        'mode', to_jsonb(m)
      ) as item
    from public.mode_groups g
    join public.modes m on m.id = g.mode_id
    join auth.users h on h.id = g.host_id
    where g.host_id = auth.uid()
      or exists (
        select 1 from public.mode_group_members gm
        where gm.group_id = g.id and gm.user_id = auth.uid()
      )
  ) groups;
$$;

-- Only logged in users can call the new function
revoke execute on function public.set_group_timer(uuid, text, integer, integer, integer) from public, anon;
grant execute on function public.set_group_timer(uuid, text, integer, integer, integer) to authenticated;

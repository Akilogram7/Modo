-- Sharing modes with friends (groups).
-- Paste into Supabase: SQL Editor -> New query -> Run.
-- Run modes_screen.sql first if you haven't yet. This one is safe to run more than once.

-- One row for every mode that is being shared.
-- started_at is filled in while the host is running the mode, and empty when they aren't.
create table if not exists public.mode_groups (
  id uuid primary key default gen_random_uuid(),
  mode_id uuid not null unique references public.modes (id) on delete cascade,
  host_id uuid not null references auth.users (id) on delete cascade,
  code text not null unique,
  started_at timestamptz,
  created_at timestamptz not null default now()
);

-- Who joined which shared mode
create table if not exists public.mode_group_members (
  group_id uuid not null references public.mode_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists mode_group_members_user_idx
  on public.mode_group_members (user_id);

-- Nobody can read or change these tables directly.
-- The app can only use the functions below, and each one checks who is asking.
alter table public.mode_groups enable row level security;
alter table public.mode_group_members enable row level security;
revoke all on public.mode_groups from anon, authenticated;
revoke all on public.mode_group_members from anon, authenticated;

-- HOST: start sharing one of your modes. Gives back the 6 character code.
-- If the mode is already shared, it gives back the same code.
create or replace function public.share_mode(p_mode_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  -- No O, 0, I, 1 or L, so codes are easy to read out loud
  v_letters constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if not exists (
    select 1 from public.modes where id = p_mode_id and user_id = auth.uid()
  ) then
    raise exception 'You can only share your own modes.';
  end if;

  select code into v_code from public.mode_groups where mode_id = p_mode_id;
  if v_code is not null then
    return v_code;
  end if;

  -- Keep making codes until we get one nobody else has
  loop
    select string_agg(substr(v_letters, 1 + floor(random() * length(v_letters))::int, 1), '')
      into v_code
      from generate_series(1, 6);
    exit when not exists (select 1 from public.mode_groups where code = v_code);
  end loop;

  insert into public.mode_groups (mode_id, host_id, code)
    values (p_mode_id, auth.uid(), v_code);

  return v_code;
end;
$$;

-- HOST: stop sharing a mode. Everyone who joined loses it.
create or replace function public.stop_sharing_mode(p_mode_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.mode_groups
    where mode_id = p_mode_id and host_id = auth.uid();
$$;

-- FRIEND: join a shared mode with its code. Gives back the mode's id.
create or replace function public.join_mode_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.mode_groups;
begin
  if auth.uid() is null then
    raise exception 'You need to be logged in to join a mode.';
  end if;

  select * into v_group
    from public.mode_groups
    where code = upper(trim(p_code));

  if not found then
    raise exception 'No mode found with that code. Check it and try again.';
  end if;

  if v_group.host_id = auth.uid() then
    raise exception 'That code is for your own mode.';
  end if;

  insert into public.mode_group_members (group_id, user_id)
    values (v_group.id, auth.uid())
    on conflict do nothing;

  return v_group.mode_id;
end;
$$;

-- FRIEND: leave a shared mode you joined
create or replace function public.leave_mode_group(p_group_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.mode_group_members
    where group_id = p_group_id and user_id = auth.uid();
$$;

-- HOST: mark a shared mode as running (true) or ended (false).
-- This is what makes it start for friends who have the app open.
-- p_mode_id can be empty when ending, which just ends whatever the host had running.
create or replace function public.set_group_mode_running(p_mode_id uuid, p_running boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A host only runs one mode at a time, so end any of theirs that were running
  update public.mode_groups
    set started_at = null
    where host_id = auth.uid() and started_at is not null;

  if p_running then
    update public.mode_groups
      set started_at = now()
      where mode_id = p_mode_id and host_id = auth.uid();
  end if;
end;
$$;

-- EVERYONE: every shared mode you host or joined, with the mode's settings.
-- Friends always get the host's latest settings, so the host's edits show up for everyone.
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

-- Only logged in users can call these
revoke execute on function public.share_mode(uuid) from public, anon;
revoke execute on function public.stop_sharing_mode(uuid) from public, anon;
revoke execute on function public.join_mode_group(text) from public, anon;
revoke execute on function public.leave_mode_group(uuid) from public, anon;
revoke execute on function public.set_group_mode_running(uuid, boolean) from public, anon;
revoke execute on function public.get_mode_groups() from public, anon;
grant execute on function public.share_mode(uuid) to authenticated;
grant execute on function public.stop_sharing_mode(uuid) to authenticated;
grant execute on function public.join_mode_group(text) to authenticated;
grant execute on function public.leave_mode_group(uuid) to authenticated;
grant execute on function public.set_group_mode_running(uuid, boolean) to authenticated;
grant execute on function public.get_mode_groups() to authenticated;

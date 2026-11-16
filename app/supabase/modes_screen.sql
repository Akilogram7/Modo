-- Modes screen: lets people edit, delete and reorder their own modes.
-- Paste into Supabase: SQL Editor -> New query -> Run. Only run it once.

-- Remembers the order someone put their modes in.
-- Empty for modes that were never moved (those show last, oldest first).
alter table public.modes
  add column if not exists sort_order integer;

-- Logged in users are allowed to change and delete rows...
grant update, delete on public.modes to authenticated;

-- ...but only their OWN modes
create policy "Modes screen: users can update their own modes"
  on public.modes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Modes screen: users can delete their own modes"
  on public.modes for delete to authenticated
  using ((select auth.uid()) = user_id);

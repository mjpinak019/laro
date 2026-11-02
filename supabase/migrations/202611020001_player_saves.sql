-- Run in the LARO Supabase project's SQL editor. No keys or passwords belong here.
create table if not exists public.player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint player_save_size check (octet_length(save::text) <= 100000),
  constraint player_save_format check (save->>'format' = 'laro-save' and save->>'version' = '1' and jsonb_typeof(save->'profile') = 'object')
);
alter table public.player_saves enable row level security;
revoke all on public.player_saves from anon, authenticated;
grant select on public.player_saves to authenticated;
drop policy if exists "Players read their own save" on public.player_saves;
create policy "Players read their own save" on public.player_saves
  for select to authenticated using ((select auth.uid()) = user_id);

-- Writes go through this function so two devices cannot silently replace each other's updates.
-- SECURITY DEFINER is restricted to the current authenticated user's row and an empty search path.
create or replace function public.save_laro_progress(p_save jsonb, p_expected_revision bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  player uuid := auth.uid();
  new_revision bigint;
  saved_at timestamptz;
begin
  if player is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_save is null or octet_length(p_save::text) > 100000
     or p_save->>'format' is distinct from 'laro-save'
     or p_save->>'version' is distinct from '1'
     or jsonb_typeof(p_save->'profile') is distinct from 'object'
  then raise exception 'Invalid LARO save' using errcode = '22023'; end if;

  if p_expected_revision is null then
    insert into public.player_saves(user_id, save)
      values (player, p_save) on conflict (user_id) do nothing
      returning revision, updated_at into new_revision, saved_at;
  else
    update public.player_saves
      set save = p_save, revision = revision + 1, updated_at = now()
      where user_id = player and revision = p_expected_revision
      returning revision, updated_at into new_revision, saved_at;
  end if;
  if new_revision is null then
    raise exception 'Cloud copy changed; review it before saving again' using errcode = '40001';
  end if;
  return jsonb_build_object('revision', new_revision, 'updated_at', saved_at);
end;
$$;
revoke all on function public.save_laro_progress(jsonb,bigint) from public, anon;
grant execute on function public.save_laro_progress(jsonb,bigint) to authenticated;

create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Spelare',
  avatar text not null default '🧩',
  avatar_image text,
  country text not null default 'SE',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.app_events (
  id bigserial primary key,
  user_id uuid,
  kind text not null,
  device_id text,
  platform text,
  detail jsonb,
  created_at timestamptz not null default now()
);
grant all on public.app_events to service_role;
alter table public.app_events enable row level security;
create index app_events_created_at_idx on public.app_events (created_at);
create index app_events_device_created_idx on public.app_events (device_id, created_at desc);
create index app_events_kind_created_idx on public.app_events (kind, created_at);

create table public.admin_activity_exclusions (
  user_id uuid primary key,
  device_id text,
  created_at timestamptz not null default now()
);
grant all on public.admin_activity_exclusions to service_role;
alter table public.admin_activity_exclusions enable row level security;

create table public.rate_limit_hits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
grant all on public.rate_limit_hits to service_role;
alter table public.rate_limit_hits enable row level security;

create or replace function public.rate_hit(_key text, _max integer, _window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.rate_limit_hits as r (key, window_start, hits) values (_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => _window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => _window_seconds) then now() else r.window_start end
  returning hits into n;
  return n <= _max;
end $$;
create or replace function public.rate_peek(_key text, _window_seconds integer)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select hits from public.rate_limit_hits where key = _key and window_start >= now() - make_interval(secs => _window_seconds)), 0)
$$;
revoke all on function public.rate_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.rate_peek(text, integer) from public, anon, authenticated;
grant execute on function public.rate_hit(text, integer, integer) to service_role;
grant execute on function public.rate_peek(text, integer) to service_role;

create or replace function public.unique_default_name() returns text
language plpgsql security definer set search_path = public as $$
declare n text; i int := 0;
begin
  loop
    n := 'Spelare ' || (1000 + floor(random() * 9000))::int;
    i := i + 1;
    exit when i > 20 or not exists (select 1 from public.profiles where display_name = n);
  end loop;
  return n;
end $$;
revoke all on function public.unique_default_name() from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''), public.unique_default_name()), 20));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- ============================================================
-- KIND App — Neon Postgres schema (run once against the project DB)
-- Auth: Neon Auth (users live in neon_auth.users_sync)
-- Access: Neon Data API (PostgREST) + Row Level Security
-- ============================================================

-- Families: created by a parent; join_code is how kids/other parents link up.
create table if not exists families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  join_code   text not null unique,
  created_by  text not null,                 -- neon_auth user id
  created_at  timestamptz not null default now()
);

-- Members: one row per signed-in user (parent or kid) OR per parent-managed
-- kid who has no account yet (user_id null until the kid signs in and links).
create table if not exists members (
  id           uuid primary key default gen_random_uuid(),
  user_id      text unique,                  -- neon_auth user id; null = managed kid profile
  family_id    uuid references families(id) on delete cascade,
  role         text not null check (role in ('parent','kid')),
  display_name text not null,
  emoji        text not null default '🌟',
  gems         int  not null default 0,
  god_code     text,                         -- optional goDs University code (attendance link)
  created_at   timestamptz not null default now()
);
create index if not exists members_family on members(family_id);

-- Daily devotional check-ins (one per member per day per month-series).
create table if not exists checkins (
  id          bigint generated always as identity primary key,
  family_id   uuid not null references families(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  series      text not null,                 -- e.g. 'secrets-of-longevity'
  day         int  not null,
  streak      int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (member_id, series, day)
);
create index if not exists checkins_family on checkins(family_id);

-- ------------------------------------------------------------
-- Row Level Security
-- Neon Data API exposes the signed-in user's id as auth.user_id()
-- ------------------------------------------------------------
alter table families enable row level security;
alter table members  enable row level security;
alter table checkins enable row level security;

-- Helper: the family the current user belongs to.
create or replace function my_family_id() returns uuid
  language sql stable security definer as
$$ select family_id from members where user_id = auth.user_id() limit 1 $$;

-- families: members can read their own family; any signed-in user can create one;
-- looking up a family by join code happens through the join_family() RPC below.
create policy families_read on families for select to authenticated
  using (id = my_family_id() or created_by = auth.user_id());
create policy families_insert on families for insert to authenticated
  with check (created_by = auth.user_id());
create policy families_update on families for update to authenticated
  using (created_by = auth.user_id());

-- members: family members see each other; users manage their own row;
-- parents manage managed-kid rows (user_id is null) in their family.
create policy members_read on members for select to authenticated
  using (family_id = my_family_id() or user_id = auth.user_id());
create policy members_insert on members for insert to authenticated
  with check (
    user_id = auth.user_id()
    or (user_id is null and family_id = my_family_id())
  );
create policy members_update on members for update to authenticated
  using (
    user_id = auth.user_id()
    or (family_id = my_family_id()
        and exists (select 1 from members me
                    where me.user_id = auth.user_id() and me.role = 'parent'))
  );
create policy members_delete on members for delete to authenticated
  using (
    user_id is null and family_id = my_family_id()
    and exists (select 1 from members me
                where me.user_id = auth.user_id() and me.role = 'parent')
  );

-- checkins: family members read family checkins; write your own family's.
create policy checkins_read on checkins for select to authenticated
  using (family_id = my_family_id());
create policy checkins_insert on checkins for insert to authenticated
  with check (family_id = my_family_id());

-- ------------------------------------------------------------
-- RPC: join a family by code (security definer so the code lookup
-- works before the user can see the family row).
-- Call via Data API: POST /rpc/join_family {"code": "ABC123"}
-- ------------------------------------------------------------
create or replace function join_family(code text) returns uuid
  language plpgsql security definer as
$$
declare fid uuid;
begin
  select id into fid from families where join_code = upper(trim(code));
  if fid is null then
    raise exception 'unknown_code';
  end if;
  update members set family_id = fid where user_id = auth.user_id();
  return fid;
end;
$$;

-- RPC: create a family and put the creator in it as parent.
create or replace function create_family(family_name text) returns table (id uuid, join_code text)
  language plpgsql security definer as
$$
declare fid uuid; code text;
begin
  code := upper(substr(md5(random()::text), 1, 6));
  insert into families (name, join_code, created_by)
    values (family_name, code, auth.user_id()) returning families.id into fid;
  update members set family_id = fid, role = 'parent' where user_id = auth.user_id();
  return query select fid, code;
end;
$$;

grant execute on function join_family(text), create_family(text), my_family_id() to authenticated;

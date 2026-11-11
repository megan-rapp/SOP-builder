create extension if not exists pgcrypto;

create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  logo_path text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_members (
  practice_id uuid not null references public.practices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (practice_id, user_id)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  address text not null default '' check (length(address) <= 240),
  source_location_id uuid references public.locations(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, practice_id)
);

create table if not exists public.practice_invitations (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role = 'member'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);

create unique index if not exists practice_invitations_pending_email
  on public.practice_invitations (practice_id, lower(email))
  where accepted_at is null;

create table if not exists public.practice_sops (
  practice_id uuid not null references public.practices(id) on delete cascade,
  location_id uuid not null,
  sop_id text not null,
  data jsonb not null,
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (location_id, sop_id),
  foreign key (location_id, practice_id)
    references public.locations(id, practice_id) on delete cascade
);

create table if not exists public.practice_resources (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  url text not null check (url ~ '^https?://'),
  created_at timestamptz not null default now()
);

create or replace function public.is_practice_member(target_practice uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.practice_members m
    where m.practice_id = target_practice
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_practice_member(uuid) from public, anon;
grant execute on function public.is_practice_member(uuid) to authenticated;

create or replace function public.is_practice_admin(target_practice uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.practice_members m
    where m.practice_id = target_practice
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_practice_admin(uuid) from public, anon;
grant execute on function public.is_practice_admin(uuid) to authenticated;

create or replace function public.create_practice_with_owner(
  p_name text,
  p_location_name text,
  p_location_address text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_practice_id uuid;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'email', '') = '' then
    raise exception 'Verified email sign-in is required.';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 120 then
    raise exception 'Practice name must be between 1 and 120 characters.';
  end if;
  if length(trim(coalesce(p_location_name, ''))) not between 1 and 100 then
    raise exception 'Location name must be between 1 and 100 characters.';
  end if;

  insert into public.practices (name, created_by)
  values (trim(p_name), auth.uid())
  returning id into new_practice_id;

  insert into public.practice_members (practice_id, user_id, email, role)
  values (new_practice_id, auth.uid(), lower(auth.jwt() ->> 'email'), 'owner');

  insert into public.locations (practice_id, name, address)
  values (new_practice_id, trim(p_location_name), left(trim(coalesce(p_location_address, '')), 240));

  return new_practice_id;
end;
$$;

create or replace function public.accept_pending_practice_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_count integer;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'email', '') = '' then
    raise exception 'A verified email is required.';
  end if;

  insert into public.practice_members (practice_id, user_id, email, role)
  select i.practice_id, auth.uid(), lower(auth.jwt() ->> 'email'), 'member'
  from public.practice_invitations i
  where lower(i.email) = lower(auth.jwt() ->> 'email')
    and i.accepted_at is null
    and i.expires_at > now()
  on conflict (practice_id, user_id) do nothing;

  update public.practice_invitations
  set accepted_at = now()
  where lower(email) = lower(auth.jwt() ->> 'email')
    and accepted_at is null
    and expires_at > now();

  get diagnostics accepted_count = row_count;
  return accepted_count;
end;
$$;

alter table public.practices enable row level security;
alter table public.practice_members enable row level security;
alter table public.locations enable row level security;
alter table public.practice_invitations enable row level security;
alter table public.practice_sops enable row level security;
alter table public.practice_resources enable row level security;

create policy "Practice members can view their practices"
  on public.practices for select to authenticated
  using (public.is_practice_member(id));
create policy "Practice admins can update their practice"
  on public.practices for update to authenticated
  using (public.is_practice_admin(id))
  with check (public.is_practice_admin(id));

create policy "Practice members can view membership"
  on public.practice_members for select to authenticated
  using (public.is_practice_member(practice_id));
create policy "Practice admins can manage membership"
  on public.practice_members for delete to authenticated
  using (public.is_practice_admin(practice_id) and role <> 'owner');

create policy "Practice members can view locations"
  on public.locations for select to authenticated
  using (public.is_practice_member(practice_id));
create policy "Practice admins can create locations"
  on public.locations for insert to authenticated
  with check (
    public.is_practice_admin(practice_id)
    and (source_location_id is null or exists (
      select 1 from public.locations source
      where source.id = locations.source_location_id
        and source.practice_id = locations.practice_id
    ))
  );
create policy "Practice admins can update locations"
  on public.locations for update to authenticated
  using (public.is_practice_admin(practice_id))
  with check (
    public.is_practice_admin(practice_id)
    and (source_location_id is null or exists (
      select 1 from public.locations source
      where source.id = locations.source_location_id
        and source.practice_id = locations.practice_id
        and source.id <> locations.id
    ))
  );
create policy "Practice admins can delete locations"
  on public.locations for delete to authenticated
  using (public.is_practice_admin(practice_id));

create policy "Invitees and practice admins can view invitations"
  on public.practice_invitations for select to authenticated
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_practice_admin(practice_id)
  );
create policy "Practice admins can create invitations"
  on public.practice_invitations for insert to authenticated
  with check (
    public.is_practice_admin(practice_id)
    and invited_by = (select auth.uid())
    and accepted_at is null
  );
create policy "Practice admins can cancel invitations"
  on public.practice_invitations for delete to authenticated
  using (public.is_practice_admin(practice_id));

create policy "Practice members can view SOPs"
  on public.practice_sops for select to authenticated
  using (public.is_practice_member(practice_id));
create policy "Practice members can create SOPs"
  on public.practice_sops for insert to authenticated
  with check (
    public.is_practice_member(practice_id)
    and updated_by = (select auth.uid())
    and exists (
      select 1 from public.locations l
      where l.id = practice_sops.location_id and l.practice_id = practice_sops.practice_id
    )
  );
create policy "Practice members can update SOPs"
  on public.practice_sops for update to authenticated
  using (public.is_practice_member(practice_id))
  with check (
    public.is_practice_member(practice_id)
    and updated_by = (select auth.uid())
    and exists (
      select 1 from public.locations l
      where l.id = practice_sops.location_id and l.practice_id = practice_sops.practice_id
    )
  );
create policy "Practice members can delete SOPs"
  on public.practice_sops for delete to authenticated
  using (public.is_practice_member(practice_id));

create policy "Practice members can view resources"
  on public.practice_resources for select to authenticated
  using (public.is_practice_member(practice_id));
create policy "Practice members can create resources"
  on public.practice_resources for insert to authenticated
  with check (public.is_practice_member(practice_id));
create policy "Practice members can delete resources"
  on public.practice_resources for delete to authenticated
  using (public.is_practice_member(practice_id));

grant execute on function public.create_practice_with_owner(text, text, text) to authenticated;
grant execute on function public.accept_pending_practice_invitations() to authenticated;
revoke all on function public.create_practice_with_owner(text, text, text) from public, anon;
revoke all on function public.accept_pending_practice_invitations() from public, anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'practice-assets',
  'practice-assets',
  false,
  3145728,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 3145728,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Practice members can view their assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'practice-assets'
    and (storage.foldername(name))[1] in (
      select m.practice_id::text from public.practice_members m where m.user_id = (select auth.uid())
    )
  );
create policy "Practice members can upload their assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'practice-assets'
    and (storage.foldername(name))[1] in (
      select m.practice_id::text from public.practice_members m where m.user_id = (select auth.uid())
    )
  );
create policy "Practice members can update their assets"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'practice-assets'
    and (storage.foldername(name))[1] in (
      select m.practice_id::text from public.practice_members m where m.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'practice-assets'
    and (storage.foldername(name))[1] in (
      select m.practice_id::text from public.practice_members m where m.user_id = (select auth.uid())
    )
  );
create policy "Practice members can delete their assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'practice-assets'
    and (storage.foldername(name))[1] in (
      select m.practice_id::text from public.practice_members m where m.user_id = (select auth.uid())
    )
  );

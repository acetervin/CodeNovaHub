-- CodeNova project hub: Kevin sees everything, each client sees only their own projects.
-- Who is who comes from the signed-in email or phone, so a contact can log in without a separate invite step.

create table admins (
  email text primary key check (email = lower(email))
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- People allowed to log in for a client. Phone in E.164 without "+", e.g. 254712345678 (how Supabase stores it).
create table contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete cascade,
  name text not null,
  email text unique check (email = lower(email)),
  phone text unique check (phone ~ '^[0-9]{10,15}$'),
  check (email is not null or phone is not null)
);

create type project_status as enum ('enquiry', 'quoted', 'signed', 'building', 'review', 'live', 'care', 'closed');
create type payment_plan as enum ('per_job', 'monthly', 'lease', 'hourly');

create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete restrict,
  name text not null,
  folder text,                -- folder in C:\Coding
  status project_status not null default 'enquiry',
  brief text,
  plan payment_plan,
  value_kes integer check (value_kes >= 0),
  review_days smallint check (review_days in (5, 10)),
  live_url text,
  repo text,
  worker text,
  next_step text,             -- shown to the client too, so write it for them
  internal_note text,         -- Kevin only, hidden by the client view below
  started_on date,
  created_at timestamptz not null default now()
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  title text not null,
  due_on date,
  done_on date,
  waiting_on text not null default 'codenova' check (waiting_on in ('codenova', 'client')),
  position smallint not null default 0
);

-- Signed agreements, addenda, options sheets, schedules, invoices. The PDF sits in storage at `path`.
create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  kind text not null check (kind in ('agreement', 'addendum', 'options', 'schedule', 'invoice', 'other')),
  ref text,                   -- e.g. CN246J56-SCH-08
  title text not null,
  signed_on date,             -- the newest signed document prevails
  path text not null unique,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  label text not null,        -- "Deposit 40%", "Day 15 30%"
  amount_kes integer not null check (amount_kes > 0),
  due_on date,
  paid_on date,
  method text                 -- M-Pesa code, bank, card
);

-- Files a client uploads for their project (logos, photos, copy).
create table assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  path text not null unique,
  name text not null,
  size_bytes bigint not null check (size_bytes between 1 and 26214400), -- 25 MB
  note text,
  uploaded_by uuid not null default auth.uid() references auth.users,
  created_at timestamptz not null default now()
);

create index on contacts (client_id);
create index on projects (client_id);
create index on milestones (project_id);
create index on documents (project_id);
create index on payments (project_id);
create index on assets (project_id);

-- Helpers. security definer so they can read admins/contacts, which callers can't read directly.
-- Each one only answers about the caller. The two used by policies live in `private`, which the API doesn't expose.
create schema private;
create function is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where email = lower(auth.jwt() ->> 'email'))
$$;

create function private.my_client_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select client_id from public.contacts
  where email = lower(auth.jwt() ->> 'email') or phone = auth.jwt() ->> 'phone'
$$;

create function private.can_see_project(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.projects where id = p and client_id in (select private.my_client_ids())
  )
$$;

alter table admins enable row level security;
alter table clients enable row level security;
alter table contacts enable row level security;
alter table projects enable row level security;
alter table milestones enable row level security;
alter table documents enable row level security;
alter table payments enable row level security;
alter table assets enable row level security;

-- Kevin: full access everywhere.
create policy admin_all on clients for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy admin_all on contacts for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy admin_all on projects for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy admin_all on milestones for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy admin_all on documents for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy admin_all on payments for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy admin_all on assets for all to authenticated using ((select is_admin())) with check ((select is_admin()));
-- admins has no policy: only the dashboard SQL editor or service key can change it.

-- Clients: read their own, upload assets, nothing else.
create policy client_read on clients for select to authenticated using (id in (select private.my_client_ids()));
create policy client_read on projects for select to authenticated using (client_id in (select private.my_client_ids()));
create policy client_read on milestones for select to authenticated using (private.can_see_project(project_id));
create policy client_read on documents for select to authenticated using (private.can_see_project(project_id));
create policy client_read on payments for select to authenticated using (private.can_see_project(project_id));
create policy client_read on assets for select to authenticated using (private.can_see_project(project_id));
create policy client_upload on assets for insert to authenticated
  with check (private.can_see_project(project_id) and uploaded_by = auth.uid() and path like project_id || '/assets/%');

-- internal_note must never reach a client: they can't select that column.
revoke select on projects from authenticated;
grant select (id, client_id, name, folder, status, brief, plan, value_kes, review_days, live_url, repo, worker,
  next_step, started_on, created_at) on projects to authenticated;
grant insert, update, delete on projects to authenticated; -- still limited to Kevin by admin_all
create function project_note(p uuid) returns text
language sql stable security definer set search_path = '' as $$
  select internal_note from public.projects where id = p and public.is_admin()
$$;

-- Storage: one private bucket, files under <project_id>/documents/ or <project_id>/assets/.
insert into storage.buckets (id, name, public, file_size_limit)
values ('hub', 'hub', false, 26214400);

create policy hub_read on storage.objects for select to authenticated
  using (bucket_id = 'hub' and private.can_see_project(((storage.foldername(name))[1])::uuid));
create policy hub_admin on storage.objects for all to authenticated
  using (bucket_id = 'hub' and (select is_admin())) with check (bucket_id = 'hub' and (select is_admin()));
create policy hub_client_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'hub' and (storage.foldername(name))[2] = 'assets'
    and private.can_see_project(((storage.foldername(name))[1])::uuid));

-- Functions are callable by everyone by default. Logged-out visitors get none; logged-in people get the helpers.
revoke execute on all functions in schema public, private from public, anon;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;
grant execute on function public.is_admin(), public.project_note(uuid) to authenticated;

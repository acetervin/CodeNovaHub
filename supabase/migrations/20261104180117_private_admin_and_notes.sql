-- Supabase advisor fixes: no privileged functions left in the API schema.

-- Kevin's private notes get their own admin-only table instead of a hidden column plus a privileged reader function.
create table project_notes (
  project_id uuid primary key references projects on delete cascade,
  note text not null
);
insert into project_notes (project_id, note) select id, internal_note from projects where internal_note is not null;
drop function project_note(uuid);
alter table projects drop column internal_note;
grant select on projects to authenticated; -- the column-by-column grant only existed to hide internal_note

-- is_admin moves out of the API. Policies point at the function itself, so they follow it.
alter function public.is_admin() set schema private;
create or replace function private.can_see_project(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists (
    select 1 from public.projects where id = p and client_id in (select private.my_client_ids())
  )
$$;

alter table project_notes enable row level security;
create policy admin_all on project_notes for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- The app asks "is this Kevin?" by reading the caller's own admins row.
create policy self_read on admins for select to authenticated
  using (email = lower((select auth.jwt()) ->> 'email'));

-- Check the uploader once per query instead of once per row.
drop policy client_upload on assets;
create policy client_upload on assets for insert to authenticated
  with check (private.can_see_project(project_id) and uploaded_by = (select auth.uid()) and path like project_id || '/assets/%');

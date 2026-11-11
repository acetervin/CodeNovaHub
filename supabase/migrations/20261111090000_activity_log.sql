-- Project history both sides can trust. The database writes a row for every change a client should know
-- about. Nobody can add, edit or delete rows through the app (not even Kevin), so the record of what was
-- agreed, paid, delivered or removed stays as it happened. Private notes and logins are not logged.

create table activity (
  id bigint generated always as identity primary key,
  project_id uuid not null references projects on delete cascade,
  at timestamptz not null default now(),
  actor text not null,   -- "CodeNova" or the client contact's name at the time
  summary text not null
);
create index on activity (project_id, at desc);

alter table activity enable row level security;
create policy read_visible on activity for select to authenticated using (private.can_see_project(project_id));
revoke insert, update, delete, truncate on activity from anon, authenticated;

-- Who made the change. No signed-in user (SQL editor, secret key) means it was Kevin.
create function private.actor() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when auth.jwt() ->> 'sub' is null or private.is_admin() then 'CodeNova'
    else coalesce(
      (select name from public.contacts where email = lower(auth.jwt() ->> 'email') or phone = auth.jwt() ->> 'phone' limit 1),
      'A client')
  end
$$;

create function private.log(pid uuid, what text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- A project being deleted takes its history with it; don't log the cascade.
  if not exists (select 1 from public.projects where id = pid) then return; end if;
  insert into public.activity (project_id, actor, summary) values (pid, private.actor(), what);
end $$;

create function private.day(d date) returns text language sql immutable set search_path = '' as $$
  select to_char(d, 'FMDD Mon YYYY')
$$;
create function private.kes(n integer) returns text language sql immutable set search_path = '' as $$
  select 'KES ' || to_char(n, 'FM999,999,999,999')
$$;

create function private.log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  stage text;
begin
  case tg_table_name
  when 'projects' then
    if tg_op = 'INSERT' then
      perform private.log(new.id, 'Opened the project');
    else
      if new.status is distinct from old.status then
        stage := case new.status
          when 'enquiry' then 'Enquiry' when 'quoted' then 'Quoted' when 'signed' then 'Signed'
          when 'building' then 'Building' when 'review' then 'In review' when 'live' then 'Live'
          when 'care' then 'Care plan' else 'Closed' end;
        perform private.log(new.id, 'Moved the project to ' || stage);
      end if;
      if new.next_step is distinct from old.next_step and new.next_step is not null then
        perform private.log(new.id, 'Next step: ' || new.next_step);
      end if;
    end if;

  when 'milestones' then
    if tg_op = 'INSERT' then
      perform private.log(new.project_id, 'Added the task "' || new.title || '"'
        || coalesce(', due ' || private.day(new.due_on), ''));
    elsif tg_op = 'DELETE' then
      perform private.log(old.project_id, 'Removed the task "' || old.title || '"');
    elsif new.done_on is not null and old.done_on is null then
      perform private.log(new.project_id, 'Finished "' || new.title || '"');
    elsif new.done_on is null and old.done_on is not null then
      perform private.log(new.project_id, 'Reopened "' || new.title || '"');
    elsif new.due_on is distinct from old.due_on then
      perform private.log(new.project_id, 'Moved "' || new.title || '" to '
        || coalesce(private.day(new.due_on), 'no due date'));
    end if;

  when 'payments' then
    if tg_op = 'INSERT' then
      perform private.log(new.project_id, 'Added the payment "' || new.label || '", ' || private.kes(new.amount_kes)
        || coalesce(', due ' || private.day(new.due_on), ''));
    elsif tg_op = 'DELETE' then
      perform private.log(old.project_id, 'Removed the payment "' || old.label || '", ' || private.kes(old.amount_kes));
    elsif new.paid_on is not null and old.paid_on is null then
      perform private.log(new.project_id, 'Received ' || private.kes(new.amount_kes) || ' for "' || new.label || '"'
        || coalesce(', ref ' || new.method, ''));
    elsif new.paid_on is null and old.paid_on is not null then
      perform private.log(new.project_id, 'Marked "' || new.label || '" as not paid');
    elsif new.amount_kes <> old.amount_kes then
      perform private.log(new.project_id, 'Changed "' || new.label || '" from ' || private.kes(old.amount_kes)
        || ' to ' || private.kes(new.amount_kes));
    end if;

  when 'documents' then
    if tg_op = 'INSERT' then
      perform private.log(new.project_id, 'Added "' || new.title || '"'
        || coalesce(', signed ' || private.day(new.signed_on), ''));
    elsif tg_op = 'DELETE' then
      perform private.log(old.project_id, 'Removed "' || old.title || '"');
    end if;

  when 'assets' then
    if tg_op = 'INSERT' then
      perform private.log(new.project_id, 'Uploaded "' || new.name || '"');
    elsif tg_op = 'DELETE' then
      perform private.log(old.project_id, 'Removed the upload "' || old.name || '"');
    end if;
  end case;
  return null;
end $$;

create trigger log_change after insert or update on projects for each row execute function private.log_change();
create trigger log_change after insert or update or delete on milestones for each row execute function private.log_change();
create trigger log_change after insert or update or delete on payments for each row execute function private.log_change();
create trigger log_change after insert or delete on documents for each row execute function private.log_change();
create trigger log_change after insert or delete on assets for each row execute function private.log_change();

-- History starts today for projects that already exist.
insert into activity (project_id, actor, summary) select id, 'CodeNova', 'History starts here' from projects;

-- The portal greets a client by name, so they may read their own contact row (and only that one).
create policy self_read on contacts for select to authenticated
  using (email = lower((select auth.jwt()) ->> 'email') or phone = (select auth.jwt()) ->> 'phone');

-- The triggers run the helpers; nobody calls them directly.
revoke execute on function private.actor(), private.log(uuid, text), private.log_change(), private.day(date), private.kes(integer)
  from public, anon, authenticated;

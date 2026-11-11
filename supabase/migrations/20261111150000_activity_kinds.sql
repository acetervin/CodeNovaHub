-- Each history row says what kind of thing changed, so an invoice never looks like an upload.
alter table activity add column kind text not null default 'project'
  check (kind in ('project', 'task', 'payment', 'invoice', 'agreement', 'file'));

-- Label the rows written before today from the sentences the triggers wrote. Only the new column is filled in;
-- every summary, time and name stays exactly as it was.
-- shortcut: an invoice deleted before this ran is labelled an agreement; fine while history is a day old.
update activity a set kind = case
  when summary like 'Uploaded "%' or summary like 'Removed the upload "%' then 'file'
  when summary like 'Added the task "%' or summary like 'Removed the task "%' or summary like 'Finished "%'
    or summary like 'Reopened "%' or summary like 'Moved "%' then 'task'
  when summary like 'Added the payment "%' or summary like 'Removed the payment "%' or summary like 'Received KES %'
    or summary like 'Marked "%" as not paid' or summary like 'Changed "%" from KES %' then 'payment'
  when summary like 'Added "%' or summary like 'Removed "%' then
    case when exists (select 1 from documents d where d.project_id = a.project_id and d.kind = 'invoice'
                      and a.summary like ('% "' || d.title || '"%')) then 'invoice' else 'agreement' end
  else 'project' end;

drop function private.log(uuid, text);
create function private.log(pid uuid, what text, kind text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- A project being deleted takes its history with it; don't log the cascade.
  if not exists (select 1 from public.projects where id = pid) then return; end if;
  insert into public.activity (project_id, actor, summary, kind) values (pid, private.actor(), what, kind);
end $$;

-- What a document is, in words: "the invoice", "the billing schedule".
create function private.doc_word(kind text) returns text language sql immutable set search_path = '' as $$
  select case kind when 'invoice' then 'the invoice' when 'agreement' then 'the agreement' when 'addendum' then 'the addendum'
    when 'options' then 'the options sheet' when 'schedule' then 'the billing schedule' else 'the document' end
$$;

create or replace function private.log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  stage text;
begin
  case tg_table_name
  when 'projects' then
    if tg_op = 'INSERT' then
      perform private.log(new.id, 'Opened the project', 'project');
    else
      if new.status is distinct from old.status then
        stage := case new.status
          when 'enquiry' then 'Enquiry' when 'quoted' then 'Quoted' when 'signed' then 'Signed'
          when 'building' then 'Building' when 'review' then 'In review' when 'live' then 'Live'
          when 'care' then 'Care plan' else 'Closed' end;
        perform private.log(new.id, 'Moved the project to ' || stage, 'project');
      end if;
      if new.next_step is distinct from old.next_step and new.next_step is not null then
        perform private.log(new.id, 'Next step: ' || new.next_step, 'project');
      end if;
    end if;

  when 'milestones' then
    if tg_op = 'INSERT' then
      perform private.log(new.project_id, 'Added the task "' || new.title || '"'
        || coalesce(', due ' || private.day(new.due_on), ''), 'task');
    elsif tg_op = 'DELETE' then
      perform private.log(old.project_id, 'Removed the task "' || old.title || '"', 'task');
    elsif new.done_on is not null and old.done_on is null then
      perform private.log(new.project_id, 'Finished "' || new.title || '"', 'task');
    elsif new.done_on is null and old.done_on is not null then
      perform private.log(new.project_id, 'Reopened "' || new.title || '"', 'task');
    elsif new.due_on is distinct from old.due_on then
      perform private.log(new.project_id, 'Moved "' || new.title || '" to '
        || coalesce(private.day(new.due_on), 'no due date'), 'task');
    end if;

  when 'payments' then
    if tg_op = 'INSERT' then
      perform private.log(new.project_id, 'Added the payment "' || new.label || '", ' || private.kes(new.amount_kes)
        || coalesce(', due ' || private.day(new.due_on), ''), 'payment');
    elsif tg_op = 'DELETE' then
      perform private.log(old.project_id, 'Removed the payment "' || old.label || '", ' || private.kes(old.amount_kes), 'payment');
    elsif new.paid_on is not null and old.paid_on is null then
      perform private.log(new.project_id, 'Received ' || private.kes(new.amount_kes) || ' for "' || new.label || '"'
        || coalesce(', ref ' || new.method, ''), 'payment');
    elsif new.paid_on is null and old.paid_on is not null then
      perform private.log(new.project_id, 'Marked "' || new.label || '" as not paid', 'payment');
    elsif new.amount_kes <> old.amount_kes then
      perform private.log(new.project_id, 'Changed "' || new.label || '" from ' || private.kes(old.amount_kes)
        || ' to ' || private.kes(new.amount_kes), 'payment');
    end if;

  when 'documents' then
    if tg_op = 'INSERT' then
      perform private.log(new.project_id, 'Added ' || private.doc_word(new.kind) || ' "' || new.title || '"'
        || coalesce(', signed ' || private.day(new.signed_on), ''),
        case when new.kind = 'invoice' then 'invoice' else 'agreement' end);
    elsif tg_op = 'DELETE' then
      perform private.log(old.project_id, 'Removed ' || private.doc_word(old.kind) || ' "' || old.title || '"',
        case when old.kind = 'invoice' then 'invoice' else 'agreement' end);
    end if;

  when 'assets' then
    if tg_op = 'INSERT' then
      perform private.log(new.project_id, 'Uploaded "' || new.name || '"', 'file');
    elsif tg_op = 'DELETE' then
      perform private.log(old.project_id, 'Removed the upload "' || old.name || '"', 'file');
    end if;
  end case;
  return null;
end $$;

revoke execute on function private.log(uuid, text, text), private.doc_word(text) from public, anon, authenticated;

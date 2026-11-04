// Run: npm run test:db
// Runs the hub migration + seed on in-process Postgres with Supabase stubs, then checks who can see what.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

import { fileURLToPath } from "node:url";
const hub = fileURLToPath(new URL("..", import.meta.url));
const db = new PGlite();

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  create schema auth; grant usage on schema auth to authenticated;
  create table auth.users (id uuid primary key);
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;
  create schema storage; grant usage on schema storage to authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant all on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
`);
for (const f of readdirSync(`${hub}migrations`).sort()) await db.exec(readFileSync(`${hub}migrations/${f}`, "utf8"));
await db.exec(readFileSync(`${hub}seed.sql`, "utf8"));

const kevin = "00000000-0000-0000-0000-000000000001";
const tetezi = "00000000-0000-0000-0000-000000000002";
const stranger = "00000000-0000-0000-0000-000000000003";
const phoneUser = "00000000-0000-0000-0000-000000000004";
await db.exec(`
  insert into auth.users values ('${kevin}'), ('${tetezi}'), ('${stranger}'), ('${phoneUser}');
  insert into contacts (client_id, name, email) select id, 'Tetezi owner', 'owner@tetezi.test' from clients where name = 'Tetezi Properties';
  insert into contacts (client_id, name, phone) select id, 'FPA lead', '254712345678' from clients where name = 'Family Peace Association Kenya';
`);
const ids = Object.fromEntries((await db.query("select name, id from projects")).rows.map((r) => [r.name, r.id]));
const teteziProject = ids["Tetezi Properties website"], fpaProject = ids["FPA website 2.0"];

async function as(claims, sql) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claims', '${JSON.stringify(claims)}', false);`);
  try { return (await db.query(sql)).rows; } finally { await db.exec("reset role;"); }
}
const rejects = async (claims, sql) => assert.rejects(() => as(claims, sql));
const K = { sub: kevin, email: "kamaukevin871@gmail.com" };
const T = { sub: tetezi, email: "Owner@Tetezi.test" }; // case differs on purpose
const S = { sub: stranger, email: "someone@else.test" };
const P = { sub: phoneUser, phone: "254712345678" };

// Kevin sees all 11 projects and the internal note.
assert.equal((await as(K, "select id from projects")).length, 11);
assert.match((await as(K, `select note from project_notes where project_id = '${teteziProject}'`))[0].note, /Phase 2/);
assert.equal((await as(K, "select email from admins")).length, 1);

// A client sees only their own project, via email (any case) or phone.
assert.deepEqual((await as(T, "select name from projects")).map((r) => r.name), ["Tetezi Properties website"]);
assert.deepEqual((await as(P, "select name from projects")).map((r) => r.name), ["FPA website 2.0"]);
assert.equal((await as(S, "select id from projects")).length, 0);
assert.equal((await as(T, "select id from clients")).length, 1);

// Clients never see Kevin's notes, other contacts, or the admin list.
assert.equal((await as(T, "select note from project_notes")).length, 0);
await rejects(T, `insert into project_notes values ('${teteziProject}', 'x')`);
assert.deepEqual((await as(T, "select name from contacts")).map((r) => r.name), ["Tetezi owner"]); // only themselves
assert.equal((await as(T, "select email from admins")).length, 0);

// Clients can't change projects or record payments.
await rejects(T, `insert into projects (client_id, name) select client_id, 'x' from projects limit 1`);
assert.equal((await as(T, `update projects set name = 'hacked' returning id`)).length, 0);
await rejects(T, `insert into payments (project_id, label, amount_kes) values ('${teteziProject}', 'x', 1)`);

// Uploads: own project only, under assets/, recorded as themselves.
await as(T, `insert into assets (project_id, path, name, size_bytes) values ('${teteziProject}', '${teteziProject}/assets/logo.png', 'logo.png', 100)`);
await rejects(T, `insert into assets (project_id, path, name, size_bytes) values ('${fpaProject}', '${fpaProject}/assets/x.png', 'x', 100)`);
await rejects(T, `insert into assets (project_id, path, name, size_bytes) values ('${teteziProject}', '${teteziProject}/documents/fake.pdf', 'x', 100)`);
await rejects(T, `insert into assets (project_id, path, name, size_bytes, uploaded_by) values ('${teteziProject}', '${teteziProject}/assets/y.png', 'y', 100, '${kevin}')`);
await rejects(T, `insert into assets (project_id, path, name, size_bytes) values ('${teteziProject}', '${teteziProject}/assets/big.mov', 'big', 26214401)`);

// Storage: same rules on the files themselves.
await as(T, `insert into storage.objects (bucket_id, name) values ('hub', '${teteziProject}/assets/logo.png')`);
await rejects(T, `insert into storage.objects (bucket_id, name) values ('hub', '${teteziProject}/documents/fake.pdf')`);
await rejects(T, `insert into storage.objects (bucket_id, name) values ('hub', '${fpaProject}/assets/x.png')`);
await as(K, `insert into storage.objects (bucket_id, name) values ('hub', '${fpaProject}/documents/agreement.pdf')`);
assert.equal((await as(T, "select name from storage.objects")).length, 1);
assert.equal((await as(P, "select name from storage.objects")).length, 1);
assert.equal((await as(S, "select name from storage.objects")).length, 0);
assert.equal((await as(K, "select name from storage.objects")).length, 2);

// History: the database writes it, each side reads only its own, and nobody can rewrite it.
await as(K, `insert into milestones (project_id, title, due_on) values ('${teteziProject}', 'Homepage', '2026-11-20')`);
await as(K, `update milestones set done_on = '2026-11-18' where title = 'Homepage'`);
await as(K, `insert into documents (project_id, kind, title, path) values ('${teteziProject}', 'invoice', 'INV-0042', '${teteziProject}/documents/i.pdf')`);
await as(K, `insert into documents (project_id, kind, title, path, signed_on) values ('${teteziProject}', 'agreement', 'Website agreement', '${teteziProject}/documents/a.pdf', '2026-11-03')`);
const history = await as(T, `select actor, summary, kind from activity where project_id = '${teteziProject}' order by id`);
assert.deepEqual(history.slice(-5).map((r) => [r.actor, r.summary, r.kind]), [
  ["Tetezi owner", 'Uploaded "logo.png"', "file"],
  ["CodeNova", 'Added the task "Homepage", due 20 Nov 2026', "task"],
  ["CodeNova", 'Finished "Homepage"', "task"],
  ["CodeNova", 'Added the invoice "INV-0042"', "invoice"],
  ["CodeNova", 'Added the agreement "Website agreement", signed 3 Nov 2026', "agreement"],
]);
assert.ok((await as(T, "select project_id from activity")).every((r) => r.project_id === teteziProject));
assert.equal((await as(S, "select id from activity")).length, 0);
await rejects(T, `insert into activity (project_id, actor, summary) values ('${teteziProject}', 'CodeNova', 'Paid in full')`);
await rejects(K, `update activity set summary = 'x'`);
await rejects(K, `delete from activity`);
await rejects(T, `select private.log('${teteziProject}', 'x', 'payment')`);
// Deleting a whole project still works; its history goes with it.
await db.exec(`delete from projects where id = '${fpaProject}'`);
assert.equal((await db.query(`select id from activity where project_id = '${fpaProject}'`)).rows.length, 0);

// Logged-out visitors can't call any helper.
for (const fn of ["private.is_admin()", "private.my_client_ids()", `private.can_see_project('${teteziProject}')`]) {
  await db.exec("set role anon;");
  await assert.rejects(() => db.query(`select ${fn}`), `anon could call ${fn}`);
  await db.exec("reset role;");
}

console.log("all RLS checks passed");

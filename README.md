# CodeNova project hub

Kevin's dashboard of every CodeNova project, and the client portal where each client follows their own project.
Next.js on a Cloudflare Worker (`hub.codenovaone.com`), with Supabase for the database, logins and files.

The same screens serve both: row-level security in Postgres decides what each login sees. Kevin (listed in
`admins`) sees everything and gets the editing controls. A client sees only projects of the client their email or
phone is listed under in `contacts`.

## Set up Supabase (hosted for now, self-hosted later)

1. Create a project on supabase.com. Copy the URL, publishable key and secret key into `.env.local` (see `.env.example`).
2. Apply the schema and starting data: paste every file in `supabase/migrations/` in name order, then
   `supabase/seed.sql`, into the SQL editor. Or use `npx supabase link` then `npx supabase db push --remote`.
3. **Auth > Emails > SMTP:** add a real sender (Amazon SES, as on Minada). Supabase's built-in sender only mails
   the project's own team and only a few emails an hour.
4. **Auth > Emails > Magic Link** template: point the link at
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   so it works when the client opens it on a different device.
5. **Auth > URL Configuration:** Site URL `https://hub.codenovaone.com` (or `http://localhost:3000` while testing).

Add a client's people in `contacts` before they can log in. Unknown emails get the same "link is on its way" reply
but no email, so nobody can find out who your clients are.

## Run

```
npm install
npm run dev        # http://localhost:3000
npm run test:db    # checks the access rules on a throwaway Postgres
```

## Deploy

Like the other demos: Workers Builds deploys on push to `main`. Set `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL` as **build** variables (Next bakes them in), and
`npx wrangler secret put SUPABASE_SECRET_KEY` for the runtime secret.

## Screens

| Route | Kevin | Client |
|---|---|---|
| `/` | Studio dashboard: every project as a stage-coloured card, search, stage filters, latest updates | Sent straight to their project (or picks one, if they have several) |
| `/due` | Schedule: every open task and unpaid payment across projects, late first | – |
| `/p/[id]` | Overview: completion, stage, value, paid, coming up, latest updates | Same, greeted by name |
| `/p/[id]/tasks` | Timeline, add, finish, reopen, remove | Timeline, read only |
| `/p/[id]/files` | Agreements and invoices (upload, delete), client files | Agreements, and their own uploads (25 MB, no programs) |
| `/p/[id]/payments` | Schedule, mark paid with M-Pesa ref, add, delete | Schedule and what's paid |
| `/p/[id]/history` | Full history | Full history |
| `/p/[id]/settings` | Stage, details, private note, client logins | – |

Forms open in native popovers (a bottom sheet on phones), so they work before JavaScript loads.

## Trust

- **History** (`activity` table): database triggers write a line for every change to stage, next step, tasks,
  payments, documents and uploads, with who did it. Nobody can add, edit or delete history through the API, not
  even Kevin; only the SQL editor can. Private notes and logins are never logged.
- **Access**: row-level security decides every read and write. A client sees only their own client's projects
  and their own contact row. Clients can upload files but not delete them.
- **Files**: a private bucket. `/f/...` hands out a signed link that works for one minute.
- **Headers** (`next.config.ts`): no framing by other sites, HTTPS only, no referrer leaks, camera, mic,
  location and payments turned off.

Tests: `npm test` (progress maths, form parsing) and `npm run test:db` (access rules and history).

## Not built yet

WhatsApp login code. Email to the client when something changes (needs the SMTP sender decided first).
Client sign-off on a task. Messages between Kevin and a client.

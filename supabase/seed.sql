-- Starting data from C:\Coding\CLAUDE.md (4 Nov 2026). Statuses are a first guess: fix them in the dashboard.
-- Contacts are left out on purpose: add each client's real email or phone before they can log in.
-- Runs after all migrations.

insert into admins (email) values ('kamaukevin871@gmail.com');

with v (client, name, folder, status, live_url, repo, worker, note) as (values
  ('CodeNova', 'CodeNova agency site', 'codenova-next', 'live', 'https://codenovaone.com', 'acetervin/CodeNovaa', 'codenovaa', null),
  ('CodeNova', 'Garage website demo (Autoworks)', 'auto-garage', 'live', 'https://garage.codenovaone.com', 'acetervin/autogarage', 'autogarage', 'D1 autoworks, secret ADMIN_PASSWORD'),
  ('CodeNova', 'Law firm website demo (Lawxxx Advocates)', 'Advocates B', 'live', 'https://lawx.codenovaone.com', 'acetervin/Advocates', 'advocates', null),
  ('CodeNova', 'Allen''s Kitchen restaurant product', 'Allen''s_Kitchen', 'building', null, null, null, 'No git yet'),
  ('CodeNova', 'Interior portfolio (luxe-portfolio-studio)', 'luxe-portfolio-studio', 'building', null, 'Tervin43/luxe-portfolio-studio', null, 'Not confirmed: First Interiors or the Interior designer portfolio product'),
  ('Family Peace Association Kenya', 'FPA website 2.0', 'FPA-UPDATED-2.0', 'live', 'https://familypeaceassociationkenya.org', 'acetervin/FPA-UPDATED-2.0', null, null),
  ('Tetezi Properties', 'Tetezi Properties website', 'TeteziEstates', 'live', 'https://teteziproperties.co.ke', 'acetervin/Tetezi-Properties', null, 'Phase 2 proposal in draft'),
  ('Stationery Central', 'Stationery Central website', 'Stationeryke/react-stationery-ke', 'live', 'https://stationerycentraldepot.ke', 'acetervin/wordpress-static-export-reactV1', null, null),
  ('Minada', 'Minada multi-store platform', 'Minada', 'care', 'https://minada.ke', 'CodeNovaaaaaaaaaa/Minada', null, 'Still in Downloads\Minada. Latest schedule CN246J56-SCH-08'),
  ('Designs by Wanjiru J', 'Designs by Wanjiru J website', 'designs-by-wanjiru-j', 'enquiry', null, null, null, 'Company profile PDFs and content in folder. No site yet'),
  ('Kingster College', 'Kingster College homepage rebuild', 'kingster-nextjs', 'enquiry', null, null, null, 'Prospect, not a client')
),
c as (
  insert into clients (name) select distinct client from v returning id, name
),
p as (
  insert into projects (client_id, name, folder, status, live_url, repo, worker)
  select c.id, v.name, v.folder, v.status::project_status, v.live_url, v.repo, v.worker from v join c on c.name = v.client
  returning id, name
)
insert into project_notes (project_id, note)
select p.id, v.note from p join v on v.name = p.name where v.note is not null;

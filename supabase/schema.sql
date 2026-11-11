-- ═══════════════════════════════════════════════════════════════════════════
--  BELLA FOUNDATION WEBSITE — DATABASE SETUP
--
--  How to use this file (one time):
--    1. Open your Supabase project → SQL Editor → New query.
--    2. Paste the WHOLE of this file and press Run.
--    3. Then follow "Create your administrator" at the very bottom.
--
--  It is safe to run this file again later; it does not delete any content.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Administrators ─────────────────────────────────────────────────────
-- Only people listed in this table may add, change, publish or delete content.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.bf_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── 2. Projects ───────────────────────────────────────────────────────────
create table if not exists public.projects (
  id                      uuid primary key default gen_random_uuid(),
  code                    text unique,                         -- Project ID shown on the site, e.g. BF-2026-001
  title                   text not null,
  slug                    text,                                -- web address of the project page: /projects/<slug>
  states                  text[] not null default '{}',        -- state / UT codes, e.g. {UK,HP}
  district                text not null default '',
  location                text not null default '',
  lat                     double precision,
  lng                     double precision,
  category                text not null default '',
  status                  text not null default 'ongoing' check (status in ('planned', 'ongoing', 'completed')),
  start_date              date,
  end_date                date,
  summary                 text not null default '',
  background              text not null default '',
  objectives              text not null default '',
  scope                   text not null default '',
  activities              text not null default '',
  outcomes                text not null default '',
  target_beneficiaries    text not null default '',
  beneficiaries_reached   integer check (beneficiaries_reached is null or beneficiaries_reached >= 0),
  beneficiaries_note      text not null default '',
  indicators              jsonb not null default '[]',         -- [{ "label": "...", "value": "..." }]
  updates                 jsonb not null default '[]',         -- [{ "date": "2026-06-15", "title": "...", "text": "..." }]
  partner_ids             uuid[] not null default '{}',
  implementation_partners text not null default '',
  stakeholders            text not null default '',
  cover_image             text not null default '',
  cover_focus             text not null default '50% 50%',
  cover_caption           text not null default '',
  gallery                 jsonb not null default '[]',         -- [{ "url": "...", "caption": "...", "date": "..." }]
  videos                  jsonb not null default '[]',         -- [{ "title": "...", "url": "..." }]
  documents               jsonb not null default '[]',         -- [{ "title": "...", "url": "..." }]
  visibility              text not null default 'draft' check (visibility in ('draft', 'published', 'archived')),
  featured                boolean not null default false,
  sort_order              integer not null default 0,
  published_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
alter table public.projects add column if not exists slug text;
create unique index if not exists projects_slug_key on public.projects (slug);
create index if not exists projects_visibility_idx on public.projects (visibility);

-- ── 3. Corporate partners ─────────────────────────────────────────────────
create table if not exists public.partners (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  logo            text not null default '',
  website         text not null default '',
  description     text not null default '',
  status          text not null default 'active',              -- 'active', 'past' or ''
  logo_authorised boolean not null default false,              -- the company has authorised use of its name and logo
  visibility      text not null default 'draft' check (visibility in ('draft', 'published')),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 4. Editable website content (homepage wording, photographs, documents, contact details) ──
create table if not exists public.site_content (
  key        text primary key,
  value      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ── 5. Media library (a list of the files kept in Storage) ────────────────
create table if not exists public.media (
  id         uuid primary key default gen_random_uuid(),
  path       text not null unique,
  url        text not null,
  name       text not null default '',
  caption    text not null default '',
  kind       text not null default 'image' check (kind in ('image', 'document')),
  mime       text not null default '',
  size       bigint,
  width      integer,
  height     integer,
  focus      text not null default '50% 50%',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 6. Enquiries from the website contact form ────────────────────────────
create table if not exists public.enquiries (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  organisation text not null default '',
  email        text not null,
  phone        text not null default '',
  enquiry_type text not null default 'General Enquiry',
  message      text not null,
  handled      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- keep "updated_at" current
drop trigger if exists bf_projects_touch on public.projects;
create trigger bf_projects_touch before update on public.projects for each row execute function public.bf_touch_updated_at();
drop trigger if exists bf_partners_touch on public.partners;
create trigger bf_partners_touch before update on public.partners for each row execute function public.bf_touch_updated_at();
drop trigger if exists bf_content_touch on public.site_content;
create trigger bf_content_touch before update on public.site_content for each row execute function public.bf_touch_updated_at();
drop trigger if exists bf_media_touch on public.media;
create trigger bf_media_touch before update on public.media for each row execute function public.bf_touch_updated_at();

-- ── 7. Security rules (Row Level Security) ────────────────────────────────
-- Visitors can read published content only. Administrators can do everything.
alter table public.admins       enable row level security;
alter table public.projects     enable row level security;
alter table public.partners     enable row level security;
alter table public.site_content enable row level security;
alter table public.media        enable row level security;
alter table public.enquiries    enable row level security;

drop policy if exists "admins: read own row" on public.admins;
create policy "admins: read own row" on public.admins for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "projects: public reads published" on public.projects;
create policy "projects: public reads published" on public.projects for select to anon, authenticated
  using (visibility = 'published' or public.is_admin());
drop policy if exists "projects: admins insert" on public.projects;
create policy "projects: admins insert" on public.projects for insert to authenticated with check (public.is_admin());
drop policy if exists "projects: admins update" on public.projects;
create policy "projects: admins update" on public.projects for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "projects: admins delete" on public.projects;
create policy "projects: admins delete" on public.projects for delete to authenticated using (public.is_admin());

drop policy if exists "partners: public reads published" on public.partners;
create policy "partners: public reads published" on public.partners for select to anon, authenticated
  using (visibility = 'published' or public.is_admin());
drop policy if exists "partners: admins insert" on public.partners;
create policy "partners: admins insert" on public.partners for insert to authenticated with check (public.is_admin());
drop policy if exists "partners: admins update" on public.partners;
create policy "partners: admins update" on public.partners for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "partners: admins delete" on public.partners;
create policy "partners: admins delete" on public.partners for delete to authenticated using (public.is_admin());

drop policy if exists "content: public reads" on public.site_content;
create policy "content: public reads" on public.site_content for select to anon, authenticated using (true);
drop policy if exists "content: admins insert" on public.site_content;
create policy "content: admins insert" on public.site_content for insert to authenticated with check (public.is_admin());
drop policy if exists "content: admins update" on public.site_content;
create policy "content: admins update" on public.site_content for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "content: admins delete" on public.site_content;
create policy "content: admins delete" on public.site_content for delete to authenticated using (public.is_admin());

drop policy if exists "media: admins read" on public.media;
create policy "media: admins read" on public.media for select to authenticated using (public.is_admin());
drop policy if exists "media: admins insert" on public.media;
create policy "media: admins insert" on public.media for insert to authenticated with check (public.is_admin());
drop policy if exists "media: admins update" on public.media;
create policy "media: admins update" on public.media for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "media: admins delete" on public.media;
create policy "media: admins delete" on public.media for delete to authenticated using (public.is_admin());

-- Anyone may send an enquiry; only administrators may read, update or delete them.
drop policy if exists "enquiries: anyone may send" on public.enquiries;
create policy "enquiries: anyone may send" on public.enquiries for insert to anon, authenticated
  with check (handled = false
              and char_length(name) between 1 and 160
              and char_length(email) between 3 and 200
              and char_length(message) between 1 and 5000
              and char_length(organisation) <= 200
              and char_length(phone) <= 40
              and char_length(enquiry_type) <= 60);
drop policy if exists "enquiries: admins read" on public.enquiries;
create policy "enquiries: admins read" on public.enquiries for select to authenticated using (public.is_admin());
drop policy if exists "enquiries: admins update" on public.enquiries;
create policy "enquiries: admins update" on public.enquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "enquiries: admins delete" on public.enquiries;
create policy "enquiries: admins delete" on public.enquiries for delete to authenticated using (public.is_admin());

-- Table permissions (the rules above still decide which rows each person may touch)
grant usage on schema public to anon, authenticated;
revoke all on public.admins, public.projects, public.partners, public.site_content, public.media, public.enquiries from anon;
grant select on public.projects, public.partners, public.site_content to anon;
grant insert on public.enquiries to anon;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.projects, public.partners, public.site_content, public.media, public.enquiries to authenticated;

-- ── 8. File storage (photographs, logos, PDFs) ────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bf media: public read" on storage.objects;
create policy "bf media: public read" on storage.objects for select to anon, authenticated using (bucket_id = 'media');
drop policy if exists "bf media: admins upload" on storage.objects;
create policy "bf media: admins upload" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "bf media: admins replace" on storage.objects;
create policy "bf media: admins replace" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "bf media: admins delete" on storage.objects;
create policy "bf media: admins delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
--  CREATE YOUR ADMINISTRATOR  (do this once, after the lines above have run)
--
--    1. In Supabase, open Authentication → Users → Add user → Create new user.
--       Enter your email and a strong password, and tick "Auto Confirm User".
--    2. Open the SQL Editor again, paste the two lines below into a NEW query,
--       replace the email with yours, remove the two dashes at the start of
--       each line, and press Run.
--
-- insert into public.admins (user_id, email)
-- select id, email from auth.users where email = 'you@example.com';
--
--  To remove an administrator later:
-- delete from public.admins where email = 'someone@example.com';
-- ═══════════════════════════════════════════════════════════════════════════

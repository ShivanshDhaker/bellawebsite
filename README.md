# Bella Foundation website

This folder is the complete website: the homepage, the Projects & Impact page with the
India map, the admin dashboard, and everything needed to connect a database.

You do not need to write any code. There are two stages:

- **Stage 1 — put the site online.** It works straight away, with no database.
- **Stage 2 — switch on the dashboard.** After a one-time setup (about 20–30 minutes) you
  manage projects, partners, photographs and wording from `yoursite/admin`.

---

## What is in this folder

| File or folder | What it is |
|---|---|
| `index.html` | The homepage |
| `projects.html` | Projects & Impact: the India map, project records and corporate partners |
| `admin/` | The admin dashboard (opens at `yoursite/admin`) |
| `assets/` | Styles, scripts, the logo, photographs and the map |
| `data/` | Simple project and partner files, used only until the database is connected |
| `api/` | Four small server functions: one tells the site where its database is, one receives the contact form, one builds each project's own page, one builds the sitemap |
| `404.html`, `robots.txt` | The "page not found" page, and the note that tells search engines what to read |
| `supabase/schema.sql` | The one-time database setup script |
| `vercel.json` | Hosting settings for Vercel |

---

## Stage 1 — Put the site online with Vercel

Vercel publishes a website from a GitHub repository, so the files go to GitHub first.

1. Create a free account at **github.com** and a new, empty repository (for example
   `bella-foundation`). Private is fine.
2. On the repository page choose **Add file → Upload files**, then drag in **everything
   inside this folder** (the files and folders themselves, not the outer folder). Commit.
3. Create a free account at **vercel.com**, choose **Add New → Project**, and import that
   repository. Leave every setting as it is and press **Deploy**. There is no build step.
4. Vercel gives you an address such as `bella-foundation.vercel.app`. To use
   `bellafoundation.in`, add it under **Project → Settings → Domains** and follow the DNS
   instructions shown there.

The site is now live. At this point:

- the Projects & Impact page shows the map with no projects highlighted (none are published yet);
- the contact form emails info@bellafoundation.in once you have activated it (see "The contact form" below);
- `yoursite/admin` shows a "not connected yet" screen.

> Menu names on GitHub, Vercel and Supabase change from time to time. If a button is named
> slightly differently, look for the closest match.

---

## Stage 2 — Switch on the dashboard (one time)

The dashboard stores everything in **Supabase**, a hosted database with file storage and
secure logins. You do not run a server.

### Step 1. Create a Supabase project

1. Create an account at **supabase.com** and press **New project**.
2. Give it a name, choose a strong database password (keep it safe), and pick the region
   closest to India (Mumbai, if offered). Wait until the project is ready.

### Step 2. Set up the database

1. In the Supabase project open **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this folder in any text editor, copy **all** of it,
   paste it into the query box and press **Run**. You should see "Success".

This creates the tables, the security rules and the storage space for photographs.

### Step 3. Give the website its two settings

1. In Supabase, press **Connect** (top of the project page), or open
   **Settings → API Keys**. Copy:
   - the **Project URL** (looks like `https://abcdefgh.supabase.co`), and
   - the **Publishable key** (on older projects it is called the **anon** key).
   **Never** use the "secret" or "service_role" key. The site refuses it.
2. In Vercel open **Project → Settings → Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | the Project URL |
   | `SUPABASE_ANON_KEY` | the Publishable (anon) key |

3. Open **Deployments**, press the **⋯** menu on the latest deployment and choose
   **Redeploy** so the settings take effect.

### Step 4. Create your administrator login

1. In Supabase open **Authentication → Users → Add user → Create new user**. Enter your
   email and a strong password, and tick **Auto Confirm User**.
2. Open **SQL Editor → New query**, paste the two lines below, change the email to yours,
   and press **Run**:

   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'you@example.com';
   ```

3. Go to `yoursite/admin` and sign in.

That is the whole setup. From now on you do not touch code, GitHub or Vercel for ordinary
changes.

**Recommended:** in Supabase open **Authentication → Sign In / Providers** and switch off
"Allow new users to sign up". Strangers who sign up cannot change anything (only people
in the `admins` table can), but there is no reason to let them create accounts.

---

## Using the dashboard

| I want to… | Do this |
|---|---|
| Add a project | **Projects → + Add New Project** → fill in the details → upload photographs → **Publish** |
| Keep working on it privately | **Save as Draft**. Drafts are never visible to the public. **Save and preview** shows how it will look |
| Update a project | **Projects → Edit** → change → **Save and update website** |
| Mark a project completed | **Projects → Mark completed** |
| Take a project off the site | **Unpublish** (keeps it as a draft) or **Archive** |
| Add a corporate partner | **Corporate Partners → + Add Partner** → name, logo → tick the authorisation box → **Publish** |
| Change any wording on the site (headings, paragraphs, bullet points, registration numbers) | **Website Content** → open the section → edit → **Save and publish** |
| Change the phone number, email, address or map location | **Website Content → Contact details** → **Save and publish** |
| Add photographs, logos or PDFs | **Media Library** → drag files in |
| Change homepage photographs | **Homepage** → add, remove or reorder → **Save and publish** |
| Add a certificate or report PDF to the registration details | **Governance Documents → Upload PDF** |
| Read messages from the contact form | **Enquiries** |
| Change your password | **Settings** |

When you publish a project, these update by themselves: the state colours and counts on
the India map, the statistics at the top of the Projects page, the state lists, the
filters, the partner links and the three-project preview on the homepage.

**Map colours.** Terracotta = ongoing projects, olive = completed, striped = both,
sand-gold = planned only, pale = no published projects. A project that works in several
states is ticked once per state and appears under each.

**Only enter what you can evidence.** Empty fields are simply not shown. The
"Verified beneficiaries reached" total on the site is the sum of the verified numbers you
enter. Nothing is estimated.

**Partners.** A partner can be published only after you tick the box confirming that the
partnership is agreed and the company has authorised its name and logo.

---

## The contact form — do this once after going live

Every enquiry is **emailed to info@bellafoundation.in**. The email is delivered by a free
relay service called FormSubmit (formsubmit.co), so no mail server or password is needed.

**One-time activation (required):**

1. After the site is live, open it and send yourself a test enquiry through the contact form.
2. FormSubmit sends an email to **info@bellafoundation.in** with an **Activate Form** button.
   Open that inbox and press it. (Check the spam folder if it is not there in a few minutes.)
3. Send one more test enquiry. It should now arrive in the inbox. From here on, every
   enquiry does.

Until step 2 is done, enquiries are **not** delivered by email. During that time the form
tells the visitor it could not send and opens their own email app instead, so nothing is
silently lost.

Good to know:

- The visitor sees "sent" only when the relay (or the database, below) confirms it.
- Once the database is connected (Stage 2), each enquiry is **also** saved in the dashboard
  under **Enquiries**, so you have a record even if an email goes to spam.
- Enquiries pass through FormSubmit's servers on the way to your inbox. If you would rather
  not use a third party, use the alternative below and tell your developer to remove the
  FormSubmit call in `assets/js/site.js`.
- If you change the contact email in the dashboard, the new address must be activated the
  same way.
- **Alternative / additional email route:** create an account at resend.com, verify your
  domain there, and add `RESEND_API_KEY`, `ENQUIRY_NOTIFY_TO` and `ENQUIRY_NOTIFY_FROM` in
  Vercel. The site's own server function then emails each stored enquiry as well.

---

## Being found on Google — do this once after going live

The site is built so search engines can read it properly. What is already in place:

- Each page has its own title and description (the two lines Google shows), plus the tags
  that make a neat preview when a link is shared on WhatsApp or LinkedIn.
- Google is told, in its own format, that Bella Foundation is a non-profit, with its
  address, phone, email and areas of work. This follows the contact details you set in the
  dashboard.
- Every photograph carries a short description (its caption), which is what search engines
  and screen readers read.
- **Every published project gets its own page**, for example
  `bellafoundation.in/projects/solar-lighting-for-village-schools`. The address is made
  from the project name the first time you publish it and then never changes, so links
  stay valid even if you rename the project. The dashboard shows the address at the top of
  the project's edit screen.
- `bellafoundation.in/sitemap.xml` lists the homepage, the Projects page and every
  published project, and updates itself. Drafts, sample data and the dashboard are never
  listed.

**Two things only you can do:**

1. **Tell Google the site exists.** Go to <https://search.google.com/search-console>,
   choose **Add property → Domain**, type `bellafoundation.in`, and follow its
   instructions (it asks you to add one line at the company where you bought the domain).
   Then open **Sitemaps**, type `sitemap.xml` and press **Submit**. Do this after the
   domain is connected in Vercel. New sites usually take from a few days to a few weeks
   to appear.
2. **Create a free Google Business Profile** for the Dehradun office at
   <https://business.google.com>. This is what puts the foundation on Google Maps and in
   the panel beside search results.

**Changing what Google shows.** In the dashboard open **Website Content → Search engines
(SEO)**. You can edit the title (keep it near 60 characters) and the description (near 155
characters) for the homepage and the Projects page. For a project, Google shows its name
and its short summary, so write those carefully.

**What helps most from here.** Publish real projects with a clear name, a specific summary
and captioned photographs; and ask partners, funders and directories (NGO Darpan, CSR
listings) to link to `bellafoundation.in`. No site setting replaces those two things.

Project pages need the database (Stage 2). Until it is connected, projects open inside the
Projects page instead and only the two main pages are in the sitemap.

---

## Seeing how it looks with sample data

Open `yoursite/projects.html?demo=1`. This loads clearly labelled sample records from
`data/demo/` so you can see the map, lists and project pages in action. A banner states
that they are not real projects. Nothing in the demo appears on the normal site.

---

## Adding projects without the dashboard (optional)

Until the database is connected, the site reads `data/projects.json` and
`data/partners.json`. You can add records there by hand; `data/demo/projects.json` is a
complete worked example to copy from. Once the database is connected these files are
ignored (they are used again only if the database cannot be reached).

A project record:

```json
{
  "id": "school-learning-2026",
  "code": "BF-2026-001",
  "title": "Project name",
  "states": ["UK"],
  "district": "District name",
  "location": "Village, block or town",
  "category": "Education",
  "status": "ongoing",
  "start_date": "2026-04-01",
  "end_date": "",
  "summary": "One or two sentences.",
  "background": "<p>Text…</p>",
  "objectives": "<ul><li>First objective</li></ul>",
  "scope": "", "activities": "", "outcomes": "",
  "target_beneficiaries": "",
  "beneficiaries_reached": null,
  "beneficiaries_note": "",
  "indicators": [{ "label": "Schools covered", "value": "10" }],
  "updates": [{ "date": "2026-06-15", "title": "Heading", "text": "What happened." }],
  "partner_ids": ["partner-id-from-partners.json"],
  "implementation_partners": "", "stakeholders": "",
  "cover_image": "assets/projects/my-photo.jpg",
  "gallery": [{ "url": "assets/projects/photo-2.jpg", "caption": "Caption", "date": "2026-05-10" }],
  "videos": [{ "title": "Title", "url": "https://…" }],
  "documents": [{ "title": "Report", "url": "assets/projects/report.pdf" }],
  "visibility": "published",
  "featured": false
}
```

- `status` is `planned`, `ongoing` or `completed`. `visibility` is `published` or `draft`.
- `category` is one of: Education · Healthcare and Sanitation · Women's Empowerment ·
  Environment and Sustainability · Rural Development and Livelihoods · Skill Development.
- State and UT codes: AP Andhra Pradesh · AR Arunachal Pradesh · AS Assam · BR Bihar ·
  CG Chhattisgarh · GA Goa · GJ Gujarat · HR Haryana · HP Himachal Pradesh · JH Jharkhand ·
  KA Karnataka · KL Kerala · MP Madhya Pradesh · MH Maharashtra · MN Manipur · ML Meghalaya ·
  MZ Mizoram · NL Nagaland · OD Odisha · PB Punjab · RJ Rajasthan · SK Sikkim · TN Tamil Nadu ·
  TS Telangana · TR Tripura · UP Uttar Pradesh · UK Uttarakhand · WB West Bengal ·
  AN Andaman and Nicobar Islands · CH Chandigarh · DH Dadra and Nagar Haveli and Daman and Diu ·
  DL Delhi · JK Jammu and Kashmir · LA Ladakh · LD Lakshadweep · PY Puducherry.
- Put photographs in `assets/projects/` and logos in `assets/partners/`.

A partner record: `{ "id": "acme", "name": "Company name", "logo": "assets/partners/acme.png",
"website": "https://…", "description": "<p>…</p>", "status": "active",
"logo_authorised": true, "visibility": "published" }`

---

## Things you should know

**The map.** The outlines of the 28 states and 8 Union Territories were prepared from the
open dataset `udit-001/india-maps-data` on GitHub and simplified for the web. It shows
Jammu & Kashmir and Ladakh in full, as on Government of India maps, with Ladakh as a
separate Union Territory and the merged Dadra and Nagar Haveli and Daman and Diu. That
dataset does **not** state a licence or its original source, and it is not an official
Survey of India file. Because publishing an incorrect map of India can have legal
consequences, please have the map checked against the current Survey of India political
map before the site goes live. If you obtain an official boundary file, it can replace
`assets/maps/india-states.js`.

**What was tested, and what was not.** Before delivery, both public pages, the map, the
filters, the project pages and every screen of the dashboard were tested in a browser
against a local stand-in for Supabase, and `supabase/schema.sql` (including its security
rules) was run and tested in a real PostgreSQL database. It was **not** possible to test
against a live Supabase project or a live Vercel deployment, because that needs your
accounts. If anything in Stage 2 does not behave as described, the Troubleshooting notes
below cover the likely causes.

**Search engines.** The project pages and the sitemap were tested the same way (against the
local stand-in), not on live hosting, and nothing here can promise a ranking. After going
live, open `yoursite/sitemap.xml` and one project address to confirm both load.

**Free Supabase projects can be paused** after a period with no activity. If that happens
the site falls back to the files in `data/` (so published projects disappear from the
public pages until the project is restored from the Supabase dashboard). Check Supabase's
current policy; a paid plan avoids it.

**Registration details.** The homepage lists the foundation's legal form, CIN, PAN, TAN,
12A, 80G and NGO Darpan numbers, taken from the information sheet you supplied. Please
check each number against the certificates. Form CSR-1, annual reports, audited statements
and policies are not listed because the sheet gave no details; each appears automatically
when you upload its PDF under **Governance Documents**. Bank details are deliberately not
on the site.

**Logo.** The supplied logo was converted to a transparent PNG (`assets/logo/`). On dark
backgrounds the same artwork is shown in a single light colour. The browser-tab icon is a
plain "B" monogram, because the logo has no square version; send one and it can be swapped.

**Photographs.** The homepage photographs can be replaced under **Homepage** in the
dashboard. Uploaded photographs are resized automatically (longest side 1800 px).
When a file is replaced in the Media Library, returning visitors may see the old version
for up to an hour.

**Passwords.** If you forget the admin password, reset it in Supabase under
**Authentication → Users**.

---

## Troubleshooting

| What you see | Likely cause and fix |
|---|---|
| `/admin` says "not connected yet" | The two environment variables are missing or misspelt in Vercel, or the site was not redeployed after adding them |
| `/admin` says the database tables were not found | `supabase/schema.sql` has not been run (Stage 2, Step 2) |
| "…has not been made an administrator" | Stage 2, Step 4 was not completed for that email |
| "This account is not allowed to make changes" when saving | Same as above: the signed-in user is not in the `admins` table |
| The email or password is not correct | Check the user under Authentication → Users; make sure it was auto-confirmed |
| A published project does not appear | Refresh the page; check it is marked Published and has at least one state ticked |
| Uploads fail | The file is over 20 MB or not a JPG, PNG, WebP, SVG or PDF |
| Site shows no projects after working earlier | The Supabase project may be paused; restore it from the Supabase dashboard |

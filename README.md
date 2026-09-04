# Rebel Affiliate Game

Personalized RSVP links + public leaderboard + self-serve "become an affiliate"
signup, for the Rebel launch call campaign.

## How it works

- Every affiliate gets a page at `/[their-slug]` — collects an RSVP and credits it to them.
- After RSVPing, the visitor is offered their own link. If they take it, they
  get `/[new-slug]` immediately and show up on the leaderboard.
- `/leaderboard` is public, ranks affiliates by direct RSVP count, refreshes every 60s.
- Every RSVP and every new affiliate queues a Zapier notification, delivered
  by a separate scheduled job — see "Notification delivery" below.

## 1. Set up the database (Neon)

1. Create a project at [neon.tech](https://neon.tech) (or use an existing one).
2. Copy the **pooled** connection string — Neon dashboard → your project →
   Connection Details → toggle **"Pooled connection"** (hostname will contain `-pooler`).
   This matters: the pooled string is what keeps the app fast if RSVPs spike
   all at once during the live call.
3. Put it in `.env` (copy `.env.example` → `.env` and fill in `DATABASE_URL`).
4. Run the schema:
   ```
   npm install
   node scripts/init-db.js
   ```
5. Seed your first ("root") affiliates directly in Neon's SQL editor — these
   are the people who don't have a `referred_by_id`, e.g.:
   ```sql
   insert into affiliates (slug, display_name, email)
   values ('chris', 'Chris Beal', 'chris@stewards.loan'),
          ('ryan', 'Ryan Miracle', 'ryan@stewards.loan');
   ```

## 2. Set up the Zapier webhook

1. In Zapier, create a new Zap with trigger **"Catch Hook"**.
2. Copy the webhook URL it gives you into `.env` as `ZAPIER_WEBHOOK_URL`.
3. The app sends two event types to that one URL — build separate Zap paths
   (Filter or Paths by Zapier) keyed on the `event` field:
   - `event: "new_rsvp"` → payload includes `affiliate_name`, `affiliate_slug`,
     `rsvp_name`, `rsvp_email`, `rsvp_phone`, `affiliate_total_count`
   - `event: "new_affiliate"` → payload includes `affiliate_name`,
     `affiliate_slug`, `affiliate_email`, `referred_by_slug`
4. Wire each path to whatever you want — SMS via Twilio, Slack message, email, etc.

## 2b. Set up the GHL webhook (for the RSVP confirmation SMS)

1. In GoHighLevel, create a workflow with trigger **"Inbound Webhook"**.
2. Copy the webhook URL it gives you into `.env` as `GHL_WEBHOOK_URL`.
3. Same two event types as Zapier land on this one URL — filter on the
   `event` field the same way (`new_rsvp`, `new_affiliate`).
4. Inside the workflow: a **"Create/Update Contact"** action maps the
   payload fields (`rsvp_first_name`, `rsvp_last_name`, `rsvp_email`,
   `rsvp_phone`) onto the contact, then chain an SMS action after it.
5. This runs independently of the Zapier webhook above — set one, both, or
   neither. Nothing in the app needs to change either way.

## 3. Deploy to Netlify

1. Push this project to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project**, connect the repo.
   `netlify.toml` already tells it how to build (it uses `@netlify/plugin-nextjs`,
   which Netlify will install automatically) and schedules the notification
   sender — see below.
3. In Site settings → Environment variables, add `DATABASE_URL` and whichever
   of `ZAPIER_WEBHOOK_URL` / `GHL_WEBHOOK_URL` you're using (same values as
   your `.env`).
4. Deploy. Note the `*.netlify.app` URL it gives you.

### Notification delivery (why RSVPs stay fast under load)

`/api/rsvp` and `/api/affiliates` never call Zapier or GHL directly — they
just insert a row into the `notifications` table (a few ms) and return.
Actual delivery happens in `netlify/functions/send-notifications.js`, a
**scheduled function** that Netlify runs on its own once a minute
(`netlify.toml` sets `schedule = "* * * * *"` — no manual setup beyond
deploying with the webhook URL(s) set in Netlify's env vars).

This means a slow or momentarily-down webhook can never add latency to
someone's RSVP, no matter how much traffic is hitting the site at once —
the only thing on the request path is a fast Neon insert. Zapier and GHL
are delivered to independently (a slow/down one doesn't block or duplicate
the other); notifications typically land within a minute, and failed sends
retry automatically (up to 5 attempts per target) on the next run.

## 4. Point join.therebelevent.com at it (Squarespace)

1. **Add a subdomain.** In Squarespace DNS settings, add a CNAME record:
   ```
   join.therebelevent.com  →  [your-site].netlify.app
   ```
   In Netlify, also add `join.therebelevent.com` as a custom domain on the site
   (Site settings → Domain management) so SSL provisions correctly.

2. **Affiliate links use `join.therebelevent.com/[slug]` directly** — this is
   what's shown and copied everywhere in the app (the signup form's live
   preview, the success screen). Don't try to route affiliate slugs through
   the bare `therebelevent.com` domain via Squarespace's URL Mappings: it
   only supports wildcard variables (`[name]`) when they follow a static
   path prefix (e.g. `/blog/[name]`), not as the entire root path
   (`/[slug]`). A bare root-level wildcard mapping silently fails — every
   slug 404s instead of redirecting, which is exactly what happened when
   this was tried. Squarespace's own docs never show a prefix-less example,
   and testing confirmed it doesn't work.

   A single **literal** mapping (no wildcard) still works fine if you want
   the main domain to redirect a specific static path:
   ```
   /leaderboard -> https://join.therebelevent.com/leaderboard 302
   ```

3. Test with a real affiliate slug before sending it out.

## Guardrails already built in

- **Self-RSVP block** — affiliates can't RSVP themselves on their own page (matched by email).
- **One RSVP per person, globally** — enforced at the database level; whoever
  brings someone in first gets the credit, duplicate attempts get a clear error.
- **Reserved slugs** — `leaderboard`, `admin`, `api`, `join`, etc. can never be
  claimed as an affiliate slug (see `lib/slug.ts` to add more).
- **Slug race conditions** — handled with a database-level unique constraint
  and automatic retry on the next candidate slug, not just a client-side check.
- **Honeypot field** on both forms — invisible to real users, silently drops bot submissions.
- **Rate limiting** — 20 submissions per IP per hour on RSVP and signup, 30 per
  5 minutes on the slug-availability check. Generous on purpose: a group
  RSVPing from the same venue/office wifi shares an IP and shouldn't get
  blocked, while a scripted flood still gets stopped.
- **SMS consent** — checkbox appears whenever a phone number is entered, stored with the RSVP.
- **Zapier notifications are fully decoupled from the request** — they're
  queued to a table, not called inline, so Zapier's latency or uptime can
  never slow down or fail someone's RSVP. See "Notification delivery" above.

## What's not built in (worth knowing)

- **Collusion between affiliates** (two people trading fake RSVPs) isn't
  technically preventable — worth stating the rule publicly and spot-checking
  the data if the stakes get high.
- **Admin UI** for adding/editing affiliates isn't built — new "root" affiliates
  (ones with no referrer) need to be added directly in Neon's SQL editor for now.
  Say the word if you want a simple password-gated admin page for this.

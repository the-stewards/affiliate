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

## 3. Deploy to Netlify

1. Push this project to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project**, connect the repo.
   `netlify.toml` already tells it how to build (it uses `@netlify/plugin-nextjs`,
   which Netlify will install automatically) and schedules the notification
   sender — see below.
3. In Site settings → Environment variables, add `DATABASE_URL` and
   `ZAPIER_WEBHOOK_URL` (same values as your `.env`).
4. Deploy. Note the `*.netlify.app` URL it gives you.

### Notification delivery (why RSVPs stay fast under load)

`/api/rsvp` and `/api/affiliates` never call Zapier directly — they just
insert a row into the `notifications` table (a few ms) and return. Actual
delivery to Zapier happens in `netlify/functions/send-notifications.js`, a
**scheduled function** that Netlify runs on its own once a minute
(`netlify.toml` sets `schedule = "* * * * *"` — no manual setup beyond
deploying with `ZAPIER_WEBHOOK_URL` set in Netlify's env vars).

This means a slow or momentarily-down Zapier hook can never add latency to
someone's RSVP, no matter how much traffic is hitting the site at once —
the only thing on the request path is a fast Neon insert. Notifications
typically land within a minute; failed sends retry automatically (up to 5
attempts) on the next run.

## 4. Point therebelevent.com at it (Squarespace)

To keep affiliate links on your own domain instead of the raw `.netlify.app` one:

1. **Add a subdomain.** In Squarespace DNS settings (or wherever therebelevent.com's
   DNS is managed), add a CNAME record:
   ```
   go.therebelevent.com  →  [your-site].netlify.app
   ```
   In Netlify, also add `go.therebelevent.com` as a custom domain on the site
   (Site settings → Domain management) so SSL provisions correctly.

2. **Map affiliate links to it.** In Squarespace: Settings → Advanced (or
   Developer Tools on older sites) → URL Mappings, add:
   ```
   /[slug] -> https://go.therebelevent.com/[slug] 302
   /leaderboard -> https://go.therebelevent.com/leaderboard 302
   ```
   This forwards `therebelevent.com/ember` to the live app while keeping the
   share-friendly domain you've already told people to use. Note: visitors'
   address bar will show `go.therebelevent.com` after the redirect, not the
   bare `therebelevent.com` — that's a hard limit of how Squarespace redirects
   work, not something the app can change.

3. Test with a real affiliate slug before sending it out, and check that
   `/leaderboard` also resolves correctly.

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

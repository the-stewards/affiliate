-- Rebel Affiliate Program — schema
-- Run this once against your Neon database (see README for how).

create table if not exists affiliates (
  id                     bigserial primary key,
  slug                   text not null,
  display_name           text not null,
  email                  text not null,
  phone                  text,
  photo_url              text,
  referred_by_id         bigint references affiliates(id),
  hidden_from_leaderboard boolean not null default false,
  created_at             timestamptz not null default now()
);

-- Backfill for tables created before this column existed.
alter table affiliates add column if not exists hidden_from_leaderboard boolean not null default false;

-- Case-insensitive uniqueness so "Ember" and "ember" can't collide. This is
-- the ONLY uniqueness constraint on slug (deliberately not `unique` on the
-- column itself) — every slug reaching an insert is already lowercase, so a
-- second case-sensitive constraint would just fire first on every real
-- collision and never surface as "affiliates_slug_lower_idx", breaking the
-- collision-retry logic in app/api/affiliates/route.ts that matches on it.
create unique index if not exists affiliates_slug_lower_idx on affiliates (lower(slug));
create unique index if not exists affiliates_email_lower_idx on affiliates (lower(email));

create table if not exists rsvps (
  id              bigserial primary key,
  affiliate_id    bigint not null references affiliates(id),
  first_name      text not null,
  last_name       text not null,
  email           text not null,
  phone           text,
  sms_consent     boolean not null default false,
  created_at      timestamptz not null default now()
);

-- One RSVP per person, globally — first affiliate to bring them gets credit.
create unique index if not exists rsvps_email_lower_idx on rsvps (lower(email));

create index if not exists rsvps_affiliate_id_idx on rsvps (affiliate_id);
create index if not exists affiliates_referred_by_idx on affiliates (referred_by_id);

-- Outbound Zapier notifications, queued here instead of sent inline so an
-- RSVP/signup response never waits on Zapier's latency or uptime. A
-- scheduled Netlify function (netlify/functions/send-notifications.js)
-- flushes this on its own cadence.
create table if not exists notifications (
  id          bigserial primary key,
  event       text not null,
  payload     jsonb not null,
  sent_at     timestamptz,
  attempts    int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_unsent_idx on notifications (created_at) where sent_at is null;

-- Singleton row tracking whether the last health check saw the site up or
-- down, so the scheduled health-check function (see
-- netlify/functions/health-check.js) only alerts on state CHANGES - once
-- when it goes down, once when it recovers - instead of re-alerting every
-- few minutes for the same ongoing outage.
create table if not exists health_state (
  id          int primary key default 1,
  is_down     boolean not null default false,
  updated_at  timestamptz not null default now(),
  check (id = 1)
);
insert into health_state (id, is_down) values (1, false) on conflict (id) do nothing;

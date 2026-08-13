-- Rebel Affiliate Program — schema
-- Run this once against your Neon database (see README for how).

create table if not exists affiliates (
  id              bigserial primary key,
  slug            text unique not null,
  display_name    text not null,
  email           text not null,
  phone           text,
  photo_url       text,
  referred_by_id  bigint references affiliates(id),
  created_at      timestamptz not null default now()
);

-- Case-insensitive uniqueness so "Ember" and "ember" can't collide.
create unique index if not exists affiliates_slug_lower_idx on affiliates (lower(slug));
create unique index if not exists affiliates_email_lower_idx on affiliates (lower(email));

create table if not exists rsvps (
  id              bigserial primary key,
  affiliate_id    bigint not null references affiliates(id),
  name            text not null,
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

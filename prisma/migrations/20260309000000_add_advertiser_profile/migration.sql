-- Add advertiser_profile table (AdvertiserProfile)
-- advertiser.id is TEXT in this DB, so advertiser_id must be TEXT

create table if not exists "advertiser_profile" (
  "id" uuid primary key default gen_random_uuid(),
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  "advertiser_id" text not null,
  "key" text not null,
  "locale" text not null default 'pt-BR',
  "title" text null,
  "value" text not null,
  "sort_order" integer not null default 0,
  "is_visible" boolean not null default true,

  constraint "advertiser_profile_advertiser_id_fkey"
    foreign key ("advertiser_id") references "advertiser"("id")
    on delete cascade on update cascade,

  constraint "advertiser_profile_advertiser_id_key_locale_key"
    unique ("advertiser_id", "key", "locale")
);

create index if not exists "advertiser_profile_advertiser_id_idx"
  on "advertiser_profile" ("advertiser_id");

create index if not exists "advertiser_profile_key_idx"
  on "advertiser_profile" ("key");

create index if not exists "advertiser_profile_locale_idx"
  on "advertiser_profile" ("locale");

create index if not exists "advertiser_profile_sort_order_idx"
  on "advertiser_profile" ("sort_order");

create index if not exists "advertiser_profile_is_visible_idx"
  on "advertiser_profile" ("is_visible");


-- Run in Supabase SQL editor for durable Pinora scores on Vercel.
create table if not exists pinora_players (
  id text primary key,
  name text not null
);

create table if not exists pinora_rounds (
  player_id text not null references pinora_players (id) on delete cascade,
  day date not null,
  guesses jsonb not null default '[]'::jsonb,
  primary key (player_id, day)
);

create index if not exists pinora_rounds_day_idx on pinora_rounds (day);

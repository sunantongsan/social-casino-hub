-- Run once with a database administrator in Supabase SQL Editor.
-- Small-room starter: one atomic snapshot, not a high-volume accounting schema.
create schema if not exists hub_private;
revoke all on schema hub_private from public, anon, authenticated;
create table if not exists hub_private.state (
 id integer primary key check(id=1), data jsonb not null
);
alter table hub_private.state enable row level security;
revoke all on hub_private.state from public, anon, authenticated;
-- Use a dedicated backend login, created with your own generated password in a
-- secure admin session; never commit it. Grant ONLY the privileges below:
-- grant usage on schema hub_private to hub_backend;
-- grant select, insert, update on hub_private.state to hub_backend;
-- create policy backend_state on hub_private.state to hub_backend using(true) with check(true);
-- DATABASE_URL should use this role via direct/session pooler with TLS.

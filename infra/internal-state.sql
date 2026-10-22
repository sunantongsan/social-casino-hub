create table public.social_casino_internal_state (
 id integer primary key check(id=1),
 version bigint not null default 0,
 data jsonb
);
alter table public.social_casino_internal_state enable row level security;
revoke all on public.social_casino_internal_state from public,anon,authenticated;
grant select,update on public.social_casino_internal_state to service_role;
insert into public.social_casino_internal_state(id,data) values(1,null);
comment on table public.social_casino_internal_state is 'Social Casino Hub internal test only. Edge service role CAS writes; no client table access.';

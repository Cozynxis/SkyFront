-- SKYFRONT Community backend. Run in a NEW, dedicated Supabase project.
-- After your admin account has signed up, promote its auth.users.id using:
-- INSERT INTO public.sf_admins(user_id) VALUES ('YOUR_AUTH_USER_UUID');
create table if not exists public.sf_admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.sf_announcements (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 3 and 160),
 body text not null check(length(body) between 1 and 20000),
 image_url text check(image_url is null or (length(image_url)<=2000 and image_url ~ '^https://')),
 category text not null default 'News' check(category in ('News','Updates','Events','Patch Notes')),
 pinned boolean not null default false, published boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sf_polls (
 id uuid primary key default gen_random_uuid(), question text not null check(length(question) between 5 and 240),
 active boolean not null default true, created_at timestamptz not null default now(),
 closes_at timestamptz
);
create table if not exists public.sf_poll_options (
 id uuid primary key default gen_random_uuid(), poll_id uuid not null references public.sf_polls(id) on delete cascade,
 label text not null check(length(label) between 1 and 140), position integer not null default 0,
 unique(id,poll_id)
);
create table if not exists public.sf_poll_votes (
 poll_id uuid not null references public.sf_polls(id) on delete cascade,
 option_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(poll_id,user_id),
 foreign key(option_id,poll_id) references public.sf_poll_options(id,poll_id) on delete cascade
);
create index if not exists sf_news_date on public.sf_announcements(created_at desc);
create index if not exists sf_votes_poll on public.sf_poll_votes(poll_id);
create or replace function public.sf_is_admin() returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.sf_admins where user_id=(select auth.uid()))
$$;
revoke all on function public.sf_is_admin() from public;
grant execute on function public.sf_is_admin() to authenticated;
alter table public.sf_admins enable row level security;
alter table public.sf_announcements enable row level security;
alter table public.sf_polls enable row level security;
alter table public.sf_poll_options enable row level security;
alter table public.sf_poll_votes enable row level security;
create policy "Admin can see own role" on public.sf_admins for select to authenticated using (user_id=(select auth.uid()));
create policy "Published announcements readable" on public.sf_announcements for select to anon,authenticated using(published or (select public.sf_is_admin()));
create policy "Admin creates announcements" on public.sf_announcements for insert to authenticated with check((select public.sf_is_admin()));
create policy "Admin edits announcements" on public.sf_announcements for update to authenticated using((select public.sf_is_admin())) with check((select public.sf_is_admin()));
create policy "Admin removes announcements" on public.sf_announcements for delete to authenticated using((select public.sf_is_admin()));
create policy "Polls readable" on public.sf_polls for select to anon,authenticated using(true);
create policy "Admin creates polls" on public.sf_polls for insert to authenticated with check((select public.sf_is_admin()));
create policy "Admin edits polls" on public.sf_polls for update to authenticated using((select public.sf_is_admin())) with check((select public.sf_is_admin()));
create policy "Admin deletes polls" on public.sf_polls for delete to authenticated using((select public.sf_is_admin()));
create policy "Poll options readable" on public.sf_poll_options for select to anon,authenticated using(true);
create policy "Admin creates options" on public.sf_poll_options for insert to authenticated with check((select public.sf_is_admin()));
create policy "Admin edits options" on public.sf_poll_options for update to authenticated using((select public.sf_is_admin())) with check((select public.sf_is_admin()));
create policy "Admin deletes options" on public.sf_poll_options for delete to authenticated using((select public.sf_is_admin()));
create policy "Own votes and admin readable" on public.sf_poll_votes for select to authenticated using(user_id=(select auth.uid()) or (select public.sf_is_admin()));
create policy "Authenticated can vote once" on public.sf_poll_votes for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(
 select 1 from public.sf_polls p join public.sf_poll_options o on o.poll_id=p.id
 where p.id=poll_id and o.id=option_id and p.active and (p.closes_at is null or p.closes_at>now())
 ));
-- Public aggregate vote totals without exposing voter identities:
create or replace function public.sf_poll_results(p_poll_id uuid)
returns table(option_id uuid,votes bigint)
language sql stable security definer set search_path='' as $$
 select o.id,count(v.user_id)::bigint
 from public.sf_poll_options o left join public.sf_poll_votes v on v.option_id=o.id
 where o.poll_id=p_poll_id group by o.id
$$;
revoke all on function public.sf_poll_results(uuid) from public;
grant execute on function public.sf_poll_results(uuid) to anon,authenticated;
-- Add tables to realtime publication after confirming they are not already included:
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sf_announcements') then
  alter publication supabase_realtime add table public.sf_announcements;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sf_polls') then
  alter publication supabase_realtime add table public.sf_polls;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sf_poll_votes') then
  alter publication supabase_realtime add table public.sf_poll_votes;
 end if;
end $$;

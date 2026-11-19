-- Promote only a verified mailbox owner, never an unverified signup.
create or replace function public.sf_assign_owner_on_verified_email()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if lower(new.email)='levi.jvbcollege@gmail.com' and new.email_confirmed_at is not null then
  insert into public.sf_admins(user_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.sf_assign_owner_on_verified_email() from public,anon,authenticated;
create trigger sf_owner_email_verified
after insert or update of email_confirmed_at on auth.users
for each row execute function public.sf_assign_owner_on_verified_email();
insert into public.sf_admins(user_id)
select id from auth.users where lower(email)='levi.jvbcollege@gmail.com' and email_confirmed_at is not null
on conflict do nothing;
grant usage on schema public to anon,authenticated;
grant select on public.sf_announcements,public.sf_polls,public.sf_poll_options to anon,authenticated;
grant insert,update,delete on public.sf_announcements,public.sf_polls,public.sf_poll_options to authenticated;
grant select on public.sf_admins to authenticated;
grant select,insert on public.sf_poll_votes to authenticated;

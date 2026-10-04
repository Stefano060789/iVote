insert into public.creator_access (email)
values ('afelix470@gmail.com')
on conflict (email) do nothing;

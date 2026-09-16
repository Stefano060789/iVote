-- Enforce plan access for email-sharing benefits and public review invitations.
-- The client mirrors these rules, but database triggers remain the authoritative gate.

create or replace function public.enforce_poll_email_benefit_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.email_benefit_type, 'none') <> 'none'
     and public.workspace_plan(new.workspace_id) = 'free' then
    raise exception 'Email-sharing benefits are available on the Starter plan and above.';
  end if;
  return new;
end;
$$;

drop trigger if exists polls_enforce_email_benefit_plan on public.polls;
create trigger polls_enforce_email_benefit_plan
before insert or update on public.polls for each row
execute procedure public.enforce_poll_email_benefit_plan();

create or replace function public.enforce_review_platform_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(coalesce(new.review_platforms, '[]'::jsonb)) = 'array'
     and jsonb_array_length(coalesce(new.review_platforms, '[]'::jsonb)) > 0
     and public.workspace_plan(new.id) = 'free' then
    raise exception 'Public review invitations are available on the Starter plan and above.';
  end if;
  return new;
end;
$$;

drop trigger if exists workspaces_enforce_review_platform_plan on public.workspaces;
create trigger workspaces_enforce_review_platform_plan
before insert or update on public.workspaces for each row
execute procedure public.enforce_review_platform_plan();

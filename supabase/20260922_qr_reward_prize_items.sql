-- Adds "reward" as a fourth qr_campaign_items item_type, alongside poll/info/donation. Lets a QR
-- code carry its own reward-or-prize card (e.g. "Free coffee with any vote", "Enter to win a
-- $50 gift card") shown to every voter who scans that code - display-only, like an info card,
-- not tied to the existing poll-level reward_code/raffle redemption system. Reuses the generic
-- title/body/link_url/link_label columns already on this table (same shape as "info"), plus one
-- new optional reward_code column for a redemption code voters can show staff.

alter table public.qr_campaign_items
  add column if not exists reward_code text check (reward_code is null or char_length(trim(reward_code)) <= 60);

-- The item_type CHECK constraint has no fixed name from its origin migration (20260915), so find
-- and drop whatever Postgres auto-named it (and the explicitly-named _shape constraint, which also
-- references item_type) rather than guessing - both are recreated immediately below.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.qr_campaign_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%item_type%'
  loop
    execute format('alter table public.qr_campaign_items drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.qr_campaign_items
  add constraint qr_campaign_items_item_type_check check (item_type in ('poll', 'info', 'donation', 'reward'));

alter table public.qr_campaign_items add constraint qr_campaign_items_shape check (
  (item_type = 'poll' and poll_id is not null and title is null and body is null and link_url is null and link_label is null and reward_code is null)
  or
  (item_type = 'info' and poll_id is null and title is not null and char_length(trim(title)) > 0 and reward_code is null)
  or
  (item_type = 'donation' and poll_id is null and reward_code is null)
  or
  (item_type = 'reward' and poll_id is null and title is not null and char_length(trim(title)) > 0)
);

-- Re-expose the public QR-item lookup with the reward_code field attached.
drop function if exists public.get_public_qr_campaign_items(text);

create function public.get_public_qr_campaign_items(target_token text)
returns table(
  item_id bigint,
  campaign_id bigint,
  portal_title text,
  portal_message text,
  item_type text,
  sort_order int,
  poll_id bigint,
  poll_question text,
  poll_brand_name text,
  poll_brand_logo_url text,
  poll_brand_primary_color text,
  poll_brand_accent_color text,
  title text,
  body text,
  link_url text,
  link_label text,
  image_url text,
  accessibility_tags text[],
  reward_code text,
  donation_currency text,
  donation_suggested_amount numeric,
  donation_message text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.id,
    c.id,
    c.portal_title,
    c.portal_message,
    i.item_type,
    i.sort_order,
    i.poll_id,
    p.question,
    p.brand_name,
    p.brand_logo_url,
    p.brand_primary_color,
    p.brand_accent_color,
    i.title,
    i.body,
    i.link_url,
    i.link_label,
    i.image_url,
    i.accessibility_tags,
    i.reward_code,
    case when i.item_type = 'donation' then d.currency else null end,
    case when i.item_type = 'donation' then d.suggested_amount else null end,
    case when i.item_type = 'donation' then coalesce(i.body, d.message) else null end
  from public.qr_campaign_items i
  join public.qr_campaigns c on c.id = i.campaign_id
  left join public.polls p on p.id = i.poll_id
  left join public.donation_settings d on d.workspace_id = c.workspace_id and d.is_enabled and d.stripe_charges_enabled
  where c.token = target_token and c.is_active
  order by i.sort_order asc nulls last, i.id asc;
$$;

grant execute on function public.get_public_qr_campaign_items(text) to anon, authenticated;

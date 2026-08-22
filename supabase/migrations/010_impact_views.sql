-- 010 · Impact rollups.
--
-- Layer 1 of the impact story is the trade itself: what MUD actually paid
-- makers. Under wholesale that is computable from stock_intake rather than
-- estimated, which is why it can be published without qualification.
-- Materialised so the admin dashboard never pays for the aggregation.

create materialized view impact_by_maker as
select
  m.id                          as maker_id,
  m.display_name                as maker_name,
  m.slug                        as maker_slug,
  c.id                          as community_id,
  c.name                        as community_name,
  c.district                    as district,
  coalesce(sold.units_sold, 0)              as units_sold,
  coalesce(sold.revenue_paisa, 0)           as revenue_paisa,
  coalesce(bought.units_bought, 0)          as units_bought,
  coalesce(bought.paid_to_maker_paisa, 0)   as paid_to_maker_paisa,
  bought.first_intake_on                    as working_with_us_since
from makers m
join communities c on c.id = m.community_id
left join (
  select oi.maker_id,
         sum(oi.quantity)          as units_sold,
         sum(oi.line_total_paisa)  as revenue_paisa
    from order_items oi
    join orders o on o.id = oi.order_id
   where o.status in ('paid', 'confirmed', 'packed', 'shipped', 'delivered')
   group by oi.maker_id
) sold on sold.maker_id = m.id
left join (
  select si.maker_id,
         sum(si.quantity)                          as units_bought,
         sum(si.quantity * si.unit_cost_paisa)     as paid_to_maker_paisa,
         min(si.received_on)                       as first_intake_on
    from stock_intake si
   group by si.maker_id
) bought on bought.maker_id = m.id;

create unique index impact_by_maker_maker_id_uq on impact_by_maker(maker_id);

create materialized view impact_by_community as
select
  c.id       as community_id,
  c.name     as community_name,
  c.slug     as community_slug,
  c.district as district,
  count(distinct m.id)                          as maker_count,
  coalesce(sum(im.units_sold), 0)               as units_sold,
  coalesce(sum(im.revenue_paisa), 0)            as revenue_paisa,
  coalesce(sum(im.paid_to_maker_paisa), 0)      as paid_to_maker_paisa
from communities c
left join makers m           on m.community_id = c.id
left join impact_by_maker im on im.maker_id = m.id
group by c.id, c.name, c.slug, c.district;

create unique index impact_by_community_community_id_uq on impact_by_community(community_id);

-- Shape of the annual Impact Report in BUSINESS-MODEL.md §8.
create or replace function public.impact_summary()
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'revenue_paisa',        coalesce((select sum(revenue_paisa)        from impact_by_maker), 0),
    'paid_to_makers_paisa', coalesce((select sum(paid_to_maker_paisa)  from impact_by_maker), 0),
    'units_sold',           coalesce((select sum(units_sold)           from impact_by_maker), 0),
    'maker_count',          (select count(*) from makers      where status = 'published'),
    'community_count',      (select count(*) from communities where status = 'published'),
    'district_count',       (select count(distinct district) from communities where status = 'published'),
    'generated_at',         now()
  );
$$;
revoke execute on function public.impact_summary() from anon, authenticated;

create or replace function public.refresh_impact_views()
returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  refresh materialized view concurrently impact_by_maker;
  refresh materialized view concurrently impact_by_community;
end;
$$;
revoke execute on function public.refresh_impact_views() from anon, authenticated;

-- Materialised views are never exposed through the Data API (lint 0016).
revoke all on impact_by_maker     from anon, authenticated;
revoke all on impact_by_community from anon, authenticated;

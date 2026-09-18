alter table public.purchase_planning_product_decisions
add column if not exists color text;

update public.purchase_planning_product_decisions
set color = ''
where color is null;

alter table public.purchase_planning_product_decisions
alter column color set default '';

alter table public.purchase_planning_product_decisions
alter column color set not null;

alter table public.purchase_planning_product_decisions
drop constraint if exists purchase_planning_product_decisions_organization_id_product_id_key;

drop index if exists purchase_planning_product_decisions_organization_id_product_id_key;

create unique index if not exists purchase_planning_product_decisions_product_color_key
on public.purchase_planning_product_decisions (
  organization_id,
  product_id,
  color
);

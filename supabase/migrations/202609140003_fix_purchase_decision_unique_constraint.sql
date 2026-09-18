do $$
declare
  constraint_name text;
begin
  select c.conname
  into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'purchase_planning_product_decisions'
    and c.contype = 'u'
    and (
      select array_agg(a.attname::text order by x.ordinality)
      from unnest(c.conkey) with ordinality as x(attnum, ordinality)
      join pg_attribute a
        on a.attrelid = t.oid
       and a.attnum = x.attnum
    ) = ARRAY['organization_id', 'product_id'];

  if constraint_name is not null then
    execute format(
      'alter table public.purchase_planning_product_decisions drop constraint %I',
      constraint_name
    );
  end if;
end $$;

create unique index if not exists purchase_planning_product_decisions_product_color_key
on public.purchase_planning_product_decisions (
  organization_id,
  product_id,
  color
);

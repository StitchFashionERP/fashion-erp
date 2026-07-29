create or replace function public.claim_number_series(
  p_organization_id uuid,
  p_storage_key text,
  p_series_key text,
  p_user_id uuid,
  p_default_series jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_series jsonb;
  v_index integer;
  v_item jsonb;
  v_next_number integer;
  v_digits integer;
  v_prefix text;
  v_separator text;
  v_claimed text;
begin
  insert into public.shared_application_state (
    organization_id,
    storage_key,
    storage_value,
    updated_by,
    updated_at
  )
  values (
    p_organization_id,
    p_storage_key,
    p_default_series::text,
    p_user_id,
    now()
  )
  on conflict (organization_id, storage_key) do nothing;

  select storage_value::jsonb
    into v_series
  from public.shared_application_state
  where organization_id = p_organization_id
    and storage_key = p_storage_key
  for update;

  if v_series is null or jsonb_typeof(v_series) <> 'array' then
    v_series := p_default_series;
  end if;

  select ordinality::integer, value
    into v_index, v_item
  from jsonb_array_elements(v_series) with ordinality
  where value ->> 'key' = p_series_key
  limit 1;

  if v_item is null or coalesce((v_item ->> 'active')::boolean, true) = false then
    return null;
  end if;

  v_next_number := greatest(coalesce((v_item ->> 'nextNumber')::integer, 1), 1);
  v_digits := least(greatest(coalesce((v_item ->> 'digits')::integer, 5), 1), 10);
  v_prefix := coalesce(v_item ->> 'prefix', '');
  v_separator := case when v_prefix = '' then '' else coalesce(v_item ->> 'separator', '') end;
  v_claimed := v_prefix || v_separator || lpad(v_next_number::text, v_digits, '0');

  v_series := jsonb_set(
    v_series,
    array[(v_index - 1)::text, 'nextNumber'],
    to_jsonb(v_next_number + 1),
    false
  );

  update public.shared_application_state
  set storage_value = v_series::text,
      updated_by = p_user_id,
      updated_at = now()
  where organization_id = p_organization_id
    and storage_key = p_storage_key;

  return v_claimed;
end;
$$;

revoke all on function public.claim_number_series(uuid, text, text, uuid, jsonb) from public;
grant execute on function public.claim_number_series(uuid, text, text, uuid, jsonb) to authenticated;

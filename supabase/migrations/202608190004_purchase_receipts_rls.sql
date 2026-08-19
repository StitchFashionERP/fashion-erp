create policy "purchase receipts organization access"
on public.purchase_receipts
for all
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
      and active = true
  )
)
with check (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
      and active = true
  )
);

create policy "purchase receipt lines organization access"
on public.purchase_receipt_lines
for all
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
      and active = true
  )
)
with check (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
      and active = true
  )
);

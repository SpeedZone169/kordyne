begin;

drop policy if exists "provider_assets_select" on storage.objects;

create policy "provider_assets_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'provider-assets'
  and (
    public.is_org_member(((storage.foldername(name))[1])::uuid)
    or exists (
      select 1
      from public.provider_relationships pr
      where pr.provider_org_id = ((storage.foldername(objects.name))[1])::uuid
        and public.is_org_member(pr.customer_org_id)
        and pr.relationship_status in ('invited', 'active')
    )
  )
);

commit;

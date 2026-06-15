alter table public.part_collaboration_messages
  add column if not exists viewer_annotation jsonb null;

create index if not exists idx_part_collaboration_messages_viewer_annotation_file
  on public.part_collaboration_messages ((viewer_annotation->>'fileId'))
  where viewer_annotation is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'part_collaboration_messages_viewer_annotation_check'
  ) then
    alter table public.part_collaboration_messages
      add constraint part_collaboration_messages_viewer_annotation_check
      check (
        viewer_annotation is null
        or (
          jsonb_typeof(viewer_annotation) = 'object'
          and viewer_annotation ? 'kind'
          and viewer_annotation->>'kind' in ('stl_surface_point')
        )
      );
  end if;
end $$;

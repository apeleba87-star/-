-- Soft-delete / seed suppress for solution pages
alter table cleaning_solution_pages
  drop constraint if exists cleaning_solution_pages_status_check;

alter table cleaning_solution_pages
  add constraint cleaning_solution_pages_status_check
  check (status in ('draft', 'published', 'archived'));

comment on column cleaning_solution_pages.status is
  'draft | published | archived (archived hides seed override from public + admin list)';

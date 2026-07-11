-- 지식 허브 제품 판매 링크 (운영자 수동 등록, 자동 더미 링크 금지)

create table if not exists cleaning_product_sales (
  product_id text primary key,
  sales_url text not null,
  sales_label text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cleaning_product_sales_url_check check (sales_url ~* '^https?://')
);

create index if not exists idx_cleaning_product_sales_updated on cleaning_product_sales (updated_at desc);

alter table cleaning_product_sales enable row level security;

create policy "cleaning_product_sales_public_read"
  on cleaning_product_sales for select
  to anon, authenticated
  using (true);

create policy "cleaning_product_sales_admin_write"
  on cleaning_product_sales for all
  to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'editor')
    )
  );

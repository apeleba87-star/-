-- 검색어 솔루션 상세 본문 (한줄 요약·난이도·추천세제 별점·단계 등)
alter table cleaning_solution_pages
  add column if not exists detail jsonb;

comment on column cleaning_solution_pages.detail is
  'SolutionDetailBody: summary, difficulty, locations, recommendations, methodSteps, cautions, ifFails';

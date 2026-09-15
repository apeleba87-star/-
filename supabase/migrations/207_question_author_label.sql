-- 시드·표시용 가상 회원명 (profiles.display_name과 분리)

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS author_label TEXT;

COMMENT ON COLUMN public.questions.author_label IS
  '공개 표시용 작성자명(닉네임). 없으면 profiles.display_name 사용';

# 남용·다운·비용·불펌 방어 (적용 현황)

악의적 트래픽·비용 폭증·대량 수집에 대한 **앱 레이어** 대응입니다.  
DDoS 완전 차단은 Cloudflare/Vercel Firewall 등 엣지 제품이 담당합니다.

## 이번에 코드에 넣은 것

| 항목 | 내용 |
|------|------|
| 디버그 API | `/api/test-g2b`, `/api/supabase-test` — 프로덕션에서 admin/editor만 |
| `/api/admin/*` | middleware에서 세션 + admin/editor 검사 |
| Rate limit | 문의·지원 등 **쓰기 12/시간**, 이벤트 90/분, 무거운 GET 20/분, `/blog`도 공개 페이지 한도에 포함 |
| 문의 폼 | 허니팟(`website`) + 라우트 한도 8/시간 |
| 베타 지원 | 라우트 한도 6/시간 + 허니팟 필드 거절 |
| 보안 헤더 | `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |

## 운영에서 꼭 할 일

1. Vercel에 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` 설정  
2. Vercel·Supabase **비용/사용량 알림**  
3. (권장) Vercel Firewall / Bot Protection 또는 Cloudflare  
4. 이용약관·저작권 문구로 불펌 법적 근거 유지  

## AI 학습 봇 vs 인용

청소지식은 **인용·검색**이 목표라 `robots.txt`에서 GPTBot 등을 기본 차단하지 않았습니다.  
학습만 막으려면 `app/robots.ts`에 해당 userAgent `disallow: ["/"]` 규칙을 추가하세요.

## 한계

- 사람 한 명이 글을 복사하는 것은 기술로 막기 어렵습니다.  
- 인메모리 rate limit만 쓰면 서버리스에서 우회되기 쉽습니다 → Upstash 필수에 가깝습니다.  
- 대규모 DDoS는 엣지 WAF 없이는 앱만으로 버티기 어렵습니다.

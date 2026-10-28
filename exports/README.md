# 키엘 내보내기 파일

## 교육용 (추천)
폴더: `exports/kiehl-education/`

| 파일 | 용도 |
|------|------|
| `kiehl-education/00-교육가이드.md` | 분류별 교육 가이드 |
| `kiehl-education/01-제품카탈로그.csv` | 전 제품 DB (엑셀) |
| `kiehl-education/02-교육용빠른참조.csv` | 교안용 요약 |
| `kiehl-education/03-사용절차.csv` | 사용 절차 |
| `kiehl-education/04-현장사례.csv` | 현장 사례 |
| `kiehl-education/05-희석비매트릭스.csv` | 희석비표 |
| `kiehl-education/kiehl-education-full.json` | 전체 JSON |

제품 32 · 절차 62 · 사례 22

## 기존 전체 지식 내보내기
| 파일 | 용도 |
|------|------|
| `kiehl-knowledge-full.json` | AI/스크립트 입력용 |
| `kiehl-knowledge-full.md` | 사람이 읽기용 정리본 |

다시 만들기:
- 교육용: `python scripts/export-kiehl-education.py`
- 전체 지식: `node scripts/export-kiehl-knowledge.mjs`

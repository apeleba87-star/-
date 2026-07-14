# 키엘 내보내기 파일

파일이 **안 보이면** Cursor/VS Code의 Markdown **미리보기(Preview)** 가 빈 화면인 경우가 많습니다.

## 바로 보는 방법
1. 오른쪽 위 **Preview** 버튼을 끄고 원본 텍스트로 보기
2. 또는 `kiehl-knowledge-full.json` 열기 (다른 AI 입력용으로 더 적합)
3. 탐색기에서 파일 우클릭 → Open With → Text Editor

## 파일
| 파일 | 용도 |
|------|------|
| `kiehl-knowledge-full.json` | AI/스크립트 입력용 (제품 32 · 절차 60 · 사례 22) |
| `kiehl-knowledge-full.md` | 사람이 읽기용 정리본 |

다시 만들기:

```bash
node scripts/export-kiehl-knowledge.mjs
```

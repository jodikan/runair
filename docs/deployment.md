# RunAir — 배포 파이프라인

## 브랜치 구조

| 브랜치 | 역할 | Vercel 환경 | URL |
|--------|------|------------|-----|
| `main` | 실서비스 | Production | runair.vercel.app |
| `develop` | 개발·검증 | Preview | runair-git-develop-xxx.vercel.app |

---

## 작업 흐름

```
로컬(develop) → GitHub develop 푸시 → Vercel Preview 확인
                                           ↓ 문제 없으면
                               develop → main PR/Merge → Vercel Production 배포
```

### 일반 작업

```bash
# 1. develop 브랜치에서 작업
git checkout develop

# 2. 변경사항 커밋
git add <파일>
git commit -m "feat: ..."

# 3. develop 푸시 → Vercel Preview 자동 배포
git push

# 4. Preview URL에서 확인 후 main에 반영
git checkout main
git merge develop
git push
git checkout develop   # 다시 develop으로 복귀
```

---

## 환경별 동작 차이

| 기능 | 로컬 | develop (Preview) | main (Production) |
|------|------|-------------------|-------------------|
| `/test` 페이지 | 접근 가능 | 접근 가능 | `/`로 리다이렉트 |
| 목업 데이터 표시 | API 키 없으면 mock | API 키 있으면 실데이터 | 실데이터 |

- `/test` 차단 로직: `src/middleware.ts` — `VERCEL_ENV === "production"` 일 때 리다이렉트

---

## 환경변수

`.env.local` (로컬 전용, git 미포함):

```env
AIRKOREA_API_KEY=...          # 에어코리아 대기오염정보 API 키
KMA_API_KEY=...               # 기상청 단기예보 API 키
NEXT_PUBLIC_KAKAO_MAP_KEY=... # 카카오맵 JavaScript SDK 키
```

Vercel에도 동일하게 설정 필요:
- Vercel 대시보드 → 프로젝트 → **Settings → Environment Variables**
- `AIRKOREA_API_KEY`, `KMA_API_KEY`, `NEXT_PUBLIC_KAKAO_MAP_KEY` 세 가지 모두 등록

---

## API 등록 현황 (data.go.kr)

| API | 서비스명 | 상태 | 비고 |
|-----|---------|------|------|
| 에어코리아 대기오염정보 | `ArpltnInforInqireSvc` | 승인 | 측정소별 실시간 측정값 |
| 에어코리아 측정소정보 | `MsrstnInfoInqireSvc` | 승인 | 근처 측정소 조회 |
| 기상청 단기예보 | `VilageFcstInfoService_2.0` | 승인 | 기온·습도 |

- 개발계정 일일 트래픽: 각 500회
- 운영 확대 시 운영계정 신청 필요 (→ `docs/backlog.md` 참고)

---

## Vercel 프로젝트 설정 확인 사항

- **Settings → Git → Production Branch**: `main`
- develop 브랜치는 Vercel이 자동으로 Preview 배포 생성

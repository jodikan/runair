# RunAir

대기질 기반 러닝 페이스 추천 서비스

PM2.5 수치와 기온·습도를 분석해 오늘 달려도 괜찮은지, 어느 페이스로 얼마나 뛰면 좋은지 알려줍니다.

---

## 주요 기능

- 현재 위치 기반 PM2.5 실시간 조회 (에어코리아 API)
- 기온·습도 보정 옵션 (기상청 API)
- 위치 직접 검색 (카카오맵 API)
- 페이스 입력 → 조정 페이스 + 최대 운동 시간 계산
- 실내 운동 권장 여부 안내

## 기술 스택

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

## 로컬 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인

## 환경변수

`.env.local` 파일을 생성하고 아래 키를 입력하세요.

```
AIRKOREA_API_KEY=에어코리아_API_키
KMA_API_KEY=기상청_API_키
NEXT_PUBLIC_KAKAO_MAP_KEY=카카오_JavaScript_키
```

## 배포

[runair.vercel.app](https://runair.vercel.app)

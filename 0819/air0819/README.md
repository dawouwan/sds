# 대기 한눈에 — 지역별 대기질 조회 서비스

`0819air.md` PRD 기반 구현. 바닐라 HTML/CSS/JS + Vercel Serverless Function 프록시. 차트·지도 라이브러리 미사용.

## API 키 입력 위치 (2개)

이 프로젝트는 공공데이터포털 API 키 **2개**가 필요합니다. 클라이언트 코드에는 절대 넣지 말고, 아래 두 곳에만 넣으세요.

| 키 | 용도 | 사용하는 파일 |
|---|---|---|
| `AIRKOREA_SERVICE_KEY` | 한국환경공단 에어코리아 대기오염정보 | `api/sido.js`, `api/station.js` |
| `METAL_SERVICE_KEY` | 국립환경과학원 대기환경연구소 중금속(MetalService) | `api/metal.js` |

**로컬 개발**
1. `.env.example`을 복사해 `.env`로 저장
2. 두 키 값을 채운 뒤 `vercel dev` 실행

**Vercel 배포**
프로젝트 설정 → Environment Variables 에 위 두 이름 그대로 등록 (Production/Preview 모두).

## 실행

```
npm i -g vercel   # 최초 1회
vercel dev
```

## 디렉터리 구조

```
index.html / styles.css / app.js / data.js   프런트엔드 (SPA, 정적 파일)
api/sido.js       시도별 실시간 평균 프록시 (타일 지도)
api/station.js    측정소별 24시간 추이 + 가스 4종 프록시 (상세 카드)
api/metal.js      중금속(납) 프록시
manifest.json / sw.js / icon.svg              PWA
vercel.json / package.json / .env.example      배포·설정
```

## PRD 대비 구현 시 확정한 사항 (§11 미결 항목)

| # | 항목 | 이번 구현에서 채택한 값 |
|---|---|---|
| 1 | 서비스명 | "대기 한눈에" (쉽게 변경 가능, `index.html`의 `<title>`/`<h1>`) |
| 2 | 데스크톱 입력 매핑 | 클릭 = 4면 순환, 더블클릭 또는 우클릭 = 상세 카드 |
| 4 | 시도별 기본 측정소 17개 | `data.js`의 `DEFAULT_STATION` — **실제 에어코리아 측정소명과 다를 수 있어 키 발급 후 대조 필요** |
| 5 | 백령도 노출 방식 | 지도 밖 독립 카드 "서해 유입 감시" |
| 6 | 타일 현재 면 표시 | 도트 인디케이터 (타일 하단 4개 점) |

## 검증이 필요한 부분 (키 발급 후 확인)

- **`api/sido.js` 호출 횟수**: PRD는 타일 지도 렌더에 API 호출 1회를 명시하지만("시도별 실시간 평균정보 조회"), 현재는 시도마다 `getCtprvnRltmMesureDnsty`를 호출해 서버에서 평균을 내는 방식(17회, 각각 10분 엣지 캐시)으로 구현했습니다. 전국을 한 번에 반환하는 별도 통계 API(에어코리아_대기오염통계 현황, 15073855)가 있다면 `api/sido.js` 하나로 교체하는 게 더 스펙에 가깝습니다.
- **`api/metal.js`의 파라미터명**: PRD에도 실제 파라미터명이 명시되어 있지 않아 추정치(`msrstnCode`, `itemCode`, `estKind`)로 작성했습니다. 실제 데이터포털 활용가이드/샘플 응답을 받으면 파일 상단 `PARAM_*` 상수만 고치면 됩니다.
- **WHO 등급 관련 응답 필드명**: 에어코리아가 등급 필드를 두 벌 제공하므로(§11-3), 실제 키 발급 후 응답을 보고 `pm25Value`/`pm10Value` 파싱이 맞는지 확인하세요. 등급 자체는 명세대로 클라이언트(`data.js`)에서 직접 계산합니다.
- **일일 호출 한도**: 개발계정 한도를 확인한 뒤 `s-maxage` 값(현재 시도/측정소 600초, 중금속 3600초)을 재조정하세요.

## 배포

GitHub 레포로 올린 뒤 Vercel에 연결하면 PR 프리뷰 + 자동 배포가 됩니다. 이 저장소는 아직 git 저장소가 아니므로, 배포 전에 `git init` 후 원격 저장소를 연결하세요.

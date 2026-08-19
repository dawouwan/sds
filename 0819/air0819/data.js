// data.js — 정적 상수 테이블 (PRD §3.3, §5.1, §11-4)
// 좌표/측정소 값은 하드코딩되어 있으며 실제 API 응답을 받은 뒤 검증이 필요합니다 (README 참고).

// 시도 타일 위치: (경도,위도) 실측값을 %,% 로 환산한 뒤
// 겹치는 클러스터(서울·경기·인천 / 세종·대전 / 울산·부산 / 광주·전남)는 PRD §5.1 규칙에 따라 수동 보정.
const SIDO_LIST = [
  { code: "서울", name: "서울", x: 29, y: 20 },
  { code: "인천", name: "인천", x: 21, y: 23 },
  { code: "경기", name: "경기", x: 33, y: 26 },
  { code: "강원", name: "강원", x: 47, y: 18 },
  { code: "충북", name: "충북", x: 41, y: 38 },
  { code: "충남", name: "충남", x: 24, y: 38 },
  { code: "세종", name: "세종", x: 34, y: 38 },
  { code: "대전", name: "대전", x: 40, y: 44 },
  { code: "전북", name: "전북", x: 33, y: 52 },
  { code: "전남", name: "전남", x: 15, y: 72 },
  { code: "광주", name: "광주", x: 28, y: 62 },
  { code: "경북", name: "경북", x: 71, y: 39 },
  { code: "경남", name: "경남", x: 70, y: 62 },
  { code: "대구", name: "대구", x: 68, y: 51 },
  { code: "울산", name: "울산", x: 88, y: 54 },
  { code: "부산", name: "부산", x: 82, y: 64 },
  { code: "제주", name: "제주", x: 18, y: 92, isJeju: true },
];

// PRD §11-4: 시도별 기본 측정소(시도청 소재지 기준) — 실제 에어코리아 측정소명과
// 다를 수 있으므로 키 발급 후 반드시 대조 검증할 것 (TODO placeholder).
const DEFAULT_STATION = {
  서울: "중구",
  부산: "중앙동",
  대구: "수성구",
  인천: "구월동",
  광주: "농성동",
  대전: "문창동",
  울산: "신정동",
  세종: "세종연서",
  경기: "인계동",
  강원: "옥천동",
  충북: "육거리",
  충남: "성황동",
  전북: "삼천동",
  전남: "남악리",
  경북: "옥동",
  경남: "대원동",
  제주: "이도이동",
};

// PRD §3.3 — 시도 ↔ 대기환경연구소(중금속) 매핑. 값은 연구소 코드.
const METAL_REGION_CODE = {
  서울: 1, 인천: 1,
  경기: 7,
  강원: 10,
  충북: 11,
  충남: 8,
  대전: 4, 세종: 4,
  전북: 9,
  광주: 3, 전남: 3,
  부산: 6, 대구: 6, 울산: 6, 경북: 6, 경남: 6,
  제주: 5,
};
const METAL_REGION_NAME = {
  1: "수도권", 2: "백령도", 3: "호남권", 4: "중부권", 5: "제주도",
  6: "영남권", 7: "경기권", 8: "충청권", 9: "전북권", 10: "강원권", 11: "충북권",
};
const YEONGNAM_SIDO = new Set(["부산", "대구", "울산", "경북", "경남"]);

// PRD §4 — WHO 권고 기준
function pm25Grade(v) {
  if (v == null || Number.isNaN(v)) return null;
  if (v <= 15) return "good";
  if (v <= 25) return "moderate";
  if (v <= 50) return "bad";
  return "veryBad";
}
function pm10Grade(v) {
  if (v == null || Number.isNaN(v)) return null;
  if (v <= 30) return "good";
  if (v <= 50) return "moderate";
  if (v <= 100) return "bad";
  return "veryBad";
}
const GRADE_LABEL = { good: "좋음", moderate: "보통", bad: "나쁨", veryBad: "매우나쁨" };
const GRADE_ROLE = { good: "success", moderate: "accent", bad: "warning", veryBad: "danger" };

const LEAD_ANNUAL_STANDARD_NGM3 = 500; // 대기환경기준 연간 납 기준, ng/m³

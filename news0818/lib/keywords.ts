// 인기 키워드 칩 — 하드코딩 목록. 네이버가 실시간 검색어 API를 제공하지 않으므로
// 실시간 데이터가 아니다. 필요할 때 수동으로 갱신한다.
export interface KeywordGroup {
  label: string;
  keywords: string[];
}

export const KEYWORD_GROUPS: KeywordGroup[] = [
  { label: "경제", keywords: ["코스피", "금리", "환율", "부동산", "반도체"] },
  { label: "기술", keywords: ["AI", "스타트업", "전기차", "클라우드"] },
  { label: "사회", keywords: ["날씨", "교육", "취업", "교통", "부동산 정책"] },
];

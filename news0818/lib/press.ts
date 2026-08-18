// 호스트 → 한글 매체명 매핑. 하드코딩 목록이며 실시간 데이터가 아니다.
// 필요할 때 항목을 추가해 확장한다. 매핑에 없는 호스트는 호스트명을 그대로 노출한다.
const PRESS_NAME_MAP: Record<string, string> = {
  "chosun.com": "조선일보",
  "donga.com": "동아일보",
  "joongang.co.kr": "중앙일보",
  "hani.co.kr": "한겨레",
  "khan.co.kr": "경향신문",
  "hankookilbo.com": "한국일보",
  "seoul.co.kr": "서울신문",
  "munhwa.com": "문화일보",
  "segye.com": "세계일보",
  "kmib.co.kr": "국민일보",
  "edaily.co.kr": "이데일리",
  "mk.co.kr": "매일경제",
  "hankyung.com": "한국경제",
  "mt.co.kr": "머니투데이",
  "sedaily.com": "서울경제",
  "fnnews.com": "파이낸셜뉴스",
  "asiae.co.kr": "아시아경제",
  "heraldcorp.com": "헤럴드경제",
  "yna.co.kr": "연합뉴스",
  "news1.kr": "뉴스1",
  "newsis.com": "뉴시스",
  "ytn.co.kr": "YTN",
  "sbs.co.kr": "SBS",
  "imbc.com": "MBC",
  "kbs.co.kr": "KBS",
  "jtbc.co.kr": "JTBC",
  "mbn.co.kr": "MBN",
  "tvchosun.com": "TV조선",
  "ichannela.com": "채널A",
  "yonhapnewstv.co.kr": "연합뉴스TV",
  "nocutnews.co.kr": "노컷뉴스",
  "pressian.com": "프레시안",
  "ohmynews.com": "오마이뉴스",
  "inews24.com": "아이뉴스24",
  "zdnet.co.kr": "ZDNet Korea",
  "etnews.com": "전자신문",
  "bloter.net": "블로터",
  "ddaily.co.kr": "디지털데일리",
};

export function getPressName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return PRESS_NAME_MAP[host] ?? host;
  } catch {
    return url;
  }
}

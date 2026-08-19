// /api/sido — 에어코리아 시도별 실시간 측정정보 조회 프록시 (PRD §3.1, §7, §9)
// 클라이언트는 이 함수만 호출한다. 인증키는 서버 환경변수(AIRKOREA_SERVICE_KEY)에만 존재한다.
//
// TODO: 활용신청 승인 후 실제 응답으로 필드명(특히 등급 필드, resultCode 값)을 검증할 것 (PRD §11-3).

const ENDPOINT = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";

function mapResultCodeToReason(code) {
  if (code === "03") return "no_data";
  if (code === "22") return "quota";
  return "network";
}

function toNumber(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function average(nums) {
  const valid = nums.filter((n) => n != null);
  if (!valid.length) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

module.exports = async (req, res) => {
  const sido = req.query && req.query.sido;
  const serviceKey = process.env.AIRKOREA_SERVICE_KEY;

  if (!sido) {
    res.status(400).json({ ok: false, reason: "network" });
    return;
  }
  if (!serviceKey) {
    res.status(200).json({ ok: false, reason: "network" }); // 키 미설정: 결측 타일로 처리
    return;
  }

  const url =
    `${ENDPOINT}?serviceKey=${serviceKey}` +
    `&returnType=json&numOfRows=100&pageNo=1` +
    `&sidoName=${encodeURIComponent(sido)}&ver=1.3`;

  try {
    const apiRes = await fetch(url);
    const json = await apiRes.json();
    const header = json && json.response && json.response.header;
    if (!header || header.resultCode !== "00") {
      res.status(200).json({ ok: false, reason: mapResultCodeToReason(header && header.resultCode) });
      return;
    }
    const items = (json.response.body && json.response.body.items) || [];
    if (!items.length) {
      res.status(200).json({ ok: false, reason: "no_data" });
      return;
    }

    const pm25 = average(items.map((i) => toNumber(i.pm25Value)));
    const pm10 = average(items.map((i) => toNumber(i.pm10Value)));
    const khai = average(items.map((i) => toNumber(i.khaiValue)));
    const dataTime = items[0].dataTime || null;
    const stations = [...new Set(items.map((i) => i.stationName).filter(Boolean))];

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=60");
    res.status(200).json({ ok: true, dataTime, pm25, pm10, khai, stations });
  } catch {
    res.status(200).json({ ok: false, reason: "network" });
  }
};

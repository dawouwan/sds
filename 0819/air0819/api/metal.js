// /api/metal — 국립환경과학원 대기환경연구소 중금속(MetalService) 프록시 (PRD §3.2)
// 대표 물질: 납(90303) 고정, 시간구분: RH24(24시간 이동평균) 고정.
//
// 주의: 이 데이터셋은 PRD 작성 시점에 "키 발급 완료"로 표시되어 있으나, 실제 파라미터명
// (지점 코드 필드명, 시간구분 필드명 등)은 data.go.kr 활용가이드/샘플 응답으로 재검증이 필요하다.
// 아래 PARAM_* 상수만 고치면 되도록 응답 파싱과 분리해 두었다.

const ENDPOINT = "https://apis.data.go.kr/1480523/MetalMeasuringResultService/MetalService";
const PARAM_REGION_CODE = "msrstnCode"; // TODO: 실제 지점(연구소) 코드 파라미터명 확인
const PARAM_ITEM_CODE = "itemCode"; // 납 = 90303
const PARAM_TIME_TYPE = "estKind"; // TODO: 실제 시간구분(RH24) 파라미터명 확인
const LEAD_ITEM_CODE = "90303";
const TIME_TYPE_RH24 = "RH24";

function toNumber(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

module.exports = async (req, res) => {
  const region = req.query && req.query.region;
  const serviceKey = process.env.METAL_SERVICE_KEY;

  if (!region) {
    res.status(400).json({ ok: false, reason: "network" });
    return;
  }
  if (!serviceKey) {
    res.status(200).json({ ok: false, reason: "network" });
    return;
  }

  const url =
    `${ENDPOINT}?serviceKey=${serviceKey}` +
    `&resultType=json&numOfRows=1&pageNo=1` +
    `&${PARAM_REGION_CODE}=${encodeURIComponent(region)}` +
    `&${PARAM_ITEM_CODE}=${LEAD_ITEM_CODE}` +
    `&${PARAM_TIME_TYPE}=${TIME_TYPE_RH24}`;

  try {
    const apiRes = await fetch(url);
    const json = await apiRes.json();
    const header = json && json.response && json.response.header;
    if (!header || (header.resultCode !== "00" && header.resultCode !== undefined)) {
      res.status(200).json({ ok: false, reason: header && header.resultCode === "22" ? "quota" : "network" });
      return;
    }
    const items = (json.response && json.response.body && json.response.body.items) || [];
    if (!items.length) {
      res.status(200).json({ ok: false, reason: "no_data" });
      return;
    }
    const latest = items[0];
    const lead = toNumber(latest.value ?? latest.itemValue ?? latest.msrValue);

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=300");
    res.status(200).json({ ok: true, dataTime: latest.msrDt || latest.dataTime || null, lead });
  } catch {
    res.status(200).json({ ok: false, reason: "network" });
  }
};

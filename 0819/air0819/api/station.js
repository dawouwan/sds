// /api/station — 에어코리아 측정소별 실시간 측정정보 조회 프록시, dataTerm=DAILY (PRD §3.1, §5.2)
// 상세 카드의 24시간 추이 그래프 + 가스상 4종 데이터를 제공한다.

const ENDPOINT = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty";

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

module.exports = async (req, res) => {
  const station = req.query && req.query.station;
  const serviceKey = process.env.AIRKOREA_SERVICE_KEY;

  if (!station) {
    res.status(400).json({ ok: false, reason: "network" });
    return;
  }
  if (!serviceKey) {
    res.status(200).json({ ok: false, reason: "network" });
    return;
  }

  const url =
    `${ENDPOINT}?serviceKey=${serviceKey}` +
    `&returnType=json&numOfRows=24&pageNo=1` +
    `&stationName=${encodeURIComponent(station)}&dataTerm=DAILY&ver=1.3`;

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

    // API는 최신순으로 내려오므로 시간순으로 뒤집는다.
    const chronological = [...items].reverse();
    const hourly = chronological.map((i) => ({
      time: i.dataTime,
      pm25: toNumber(i.pm25Value),
    }));
    const latest = items[0];
    const gases = {
      o3: toNumber(latest.o3Value),
      no2: toNumber(latest.no2Value),
      co: toNumber(latest.coValue),
      so2: toNumber(latest.so2Value),
    };

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=60");
    res.status(200).json({ ok: true, dataTime: latest.dataTime || null, hourly, gases });
  } catch {
    res.status(200).json({ ok: false, reason: "network" });
  }
};

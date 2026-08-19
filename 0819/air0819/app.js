// app.js — 프런트엔드 로직 (지도 렌더, 4면 순환, 롱프레스, 상세 카드, 새로고침 쿨다운)
// PRD 0819air.md 기반. 외부 차트/지도 라이브러리 미사용.

const REASON_TEXT = {
  station_maintenance: "해당 측정소 점검 중입니다.",
  no_data: "해당 시간 자료가 없습니다.",
  quota: "서비스가 일시 제한되었습니다. (일일 호출 한도 초과)",
  network: "연결 실패. 잠시 후 다시 시도해주세요.",
};

const FACES = ["pm25", "pm10", "khai", "lead"];
const REFRESH_COOLDOWN_MS = 30_000;

const tileState = {}; // sido -> { faceIndex, missing, reason, pm25, pm10, khai, stations, dataTime, leadRatio, regionName }
const tileEls = {}; // sido -> element
let latestDataTime = null;
let currentDetailSido = null;
let refreshCooldownUntil = 0;

const els = {
  tileLayer: document.getElementById("tileLayer"),
  tileTemplate: document.getElementById("tileTemplate"),
  dataTime: document.getElementById("dataTime"),
  refreshBtn: document.getElementById("refreshBtn"),
  errorScreen: document.getElementById("errorScreen"),
  errorMessage: document.getElementById("errorMessage"),
  retryBtn: document.getElementById("retryBtn"),
  mapSection: document.getElementById("mapSection"),
  baekryeongValue: document.getElementById("baekryeongValue"),
  detailOverlay: document.getElementById("detailOverlay"),
  detailCard: document.getElementById("detailCard"),
  detailTitle: document.getElementById("detailTitle"),
  detailClose: document.getElementById("detailClose"),
  stationSelect: document.getElementById("stationSelect"),
  trendChart: document.getElementById("trendChart"),
  chartStatus: document.getElementById("chartStatus"),
  gasList: document.getElementById("gasList"),
  metalRegionName: document.getElementById("metalRegionName"),
  metalValue: document.getElementById("metalValue"),
  metalRatio: document.getElementById("metalRatio"),
  offlineBanner: document.getElementById("offlineBanner"),
};

// ---------- 타일 생성 ----------

function buildTiles() {
  SIDO_LIST.forEach((sido) => {
    const frag = els.tileTemplate.content.cloneNode(true);
    const tile = frag.querySelector('[data-role="tile"]');
    tile.style.left = sido.x + "%";
    tile.style.top = sido.y + "%";
    if (sido.isJeju) tile.classList.add("jeju");
    tile.dataset.sido = sido.code;
    tile.setAttribute("aria-label", `${sido.name} 대기질`);

    tileState[sido.code] = {
      faceIndex: 0,
      missing: true,
      reason: "network",
      pm25: null,
      pm10: null,
      khai: null,
      stations: [],
      dataTime: null,
      leadRatio: null,
      regionName: METAL_REGION_NAME[METAL_REGION_CODE[sido.code]] || "",
    };

    attachTileGestures(tile, sido.code);
    els.tileLayer.appendChild(tile);
    tileEls[sido.code] = tile;
  });
}

// ---------- 제스처: 짧게 탭=순환, 길게 탭=상세 (터치) / 클릭=순환, 더블클릭·우클릭=상세 (데스크톱) ----------

function attachTileGestures(tile, sidoCode) {
  let press = null; // {x,y,timer,longFired}
  let ignoreNextClick = false;
  const LONG_MS = 450;
  const MOVE_TOLERANCE = 10;

  tile.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    press = { x: e.clientX, y: e.clientY, longFired: false };
    press.timer = setTimeout(() => {
      if (!press) return;
      press.longFired = true;
      openDetail(sidoCode);
    }, LONG_MS);
  });

  tile.addEventListener("pointermove", (e) => {
    if (!press) return;
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (Math.hypot(dx, dy) > MOVE_TOLERANCE) {
      clearTimeout(press.timer);
      press = null;
    }
  });

  const endPress = () => {
    if (!press) return;
    clearTimeout(press.timer);
    if (!press.longFired) {
      handleShortTap(sidoCode);
      ignoreNextClick = true;
    }
    press = null;
  };
  tile.addEventListener("pointerup", endPress);
  tile.addEventListener("pointercancel", () => {
    if (press) clearTimeout(press.timer);
    press = null;
  });

  tile.addEventListener("click", () => {
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
    handleShortTap(sidoCode); // 데스크톱: 클릭 = 순환
  });

  tile.addEventListener("dblclick", () => openDetail(sidoCode)); // 데스크톱: 더블클릭 = 상세
  tile.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openDetail(sidoCode); // 데스크톱: 우클릭 = 상세
  });
}

function handleShortTap(sidoCode) {
  const state = tileState[sidoCode];
  if (state.missing) {
    openDetail(sidoCode); // 결측 타일: 사유 안내
    return;
  }
  state.faceIndex = (state.faceIndex + 1) % FACES.length;
  renderTile(sidoCode);
}

// ---------- 타일 렌더 ----------

function renderTile(sidoCode) {
  const tile = tileEls[sidoCode];
  const state = tileState[sidoCode];
  const sidoMeta = SIDO_LIST.find((s) => s.code === sidoCode);
  const faceLabelEl = tile.querySelector('[data-role="faceLabel"]');
  const regionEl = tile.querySelector('[data-role="regionName"]');
  const valueEl = tile.querySelector('[data-role="value"]');
  const dots = tile.querySelectorAll('[data-role="dots"] i');

  regionEl.textContent = sidoMeta.name;
  tile.classList.remove("success", "accent", "warning", "danger", "missing", "neutral");

  if (state.missing) {
    tile.classList.add("missing");
    faceLabelEl.textContent = "결측";
    valueEl.textContent = "–";
    tile.setAttribute("aria-label", `${sidoMeta.name} 대기질 결측 — ${REASON_TEXT[state.reason] || ""}`);
    dots.forEach((d) => d.classList.remove("active"));
    return;
  }

  const face = FACES[state.faceIndex];
  dots.forEach((d, i) => d.classList.toggle("active", i === state.faceIndex));

  if (face === "pm25") {
    const grade = pm25Grade(state.pm25);
    faceLabelEl.textContent = "PM2.5";
    valueEl.textContent = state.pm25 != null ? `${state.pm25} · ${GRADE_LABEL[grade] || ""}` : "–";
    tile.classList.add(grade ? GRADE_ROLE[grade] : "missing");
  } else if (face === "pm10") {
    const grade = pm10Grade(state.pm10);
    faceLabelEl.textContent = "PM10";
    valueEl.textContent = state.pm10 != null ? `${state.pm10} · ${GRADE_LABEL[grade] || ""}` : "–";
    tile.classList.add(grade ? GRADE_ROLE[grade] : "missing");
  } else if (face === "khai") {
    faceLabelEl.textContent = "통합대기환경지수";
    valueEl.textContent = state.khai != null ? String(state.khai) : "–";
    tile.classList.add("neutral");
  } else if (face === "lead") {
    faceLabelEl.textContent = `납 · ${state.regionName}`;
    valueEl.textContent = state.leadRatio != null ? `기준대비 ${state.leadRatio}%` : "–";
    tile.classList.add("neutral");
  }

  tile.setAttribute(
    "aria-label",
    `${sidoMeta.name} ${faceLabelEl.textContent} ${valueEl.textContent}`
  );
}

// ---------- 데이터 로드 ----------

async function loadAll(bustCache = false) {
  hideError();
  const bust = bustCache ? `&_=${Date.now()}` : "";

  const results = await Promise.allSettled(
    SIDO_LIST.map((s) => fetch(`/api/sido?sido=${encodeURIComponent(s.code)}${bust}`).then((r) => r.json()))
  );

  let anySuccess = false;
  results.forEach((res, idx) => {
    const sido = SIDO_LIST[idx];
    const state = tileState[sido.code];
    if (res.status === "fulfilled" && res.value && res.value.ok) {
      anySuccess = true;
      const d = res.value;
      state.missing = false;
      state.pm25 = d.pm25;
      state.pm10 = d.pm10;
      state.khai = d.khai;
      state.stations = d.stations || [];
      state.dataTime = d.dataTime;
      if (!latestDataTime || (d.dataTime && d.dataTime > latestDataTime)) {
        latestDataTime = d.dataTime;
      }
    } else {
      state.missing = true;
      state.reason = (res.status === "fulfilled" && res.value && res.value.reason) || "network";
    }
    renderTile(sido.code);
  });

  await loadLeadForAllTiles(bust);
  await loadBaekryeong(bust);

  if (!anySuccess) {
    showError("데이터를 불러오지 못했습니다.");
  } else if (latestDataTime) {
    els.dataTime.textContent = `측정 기준 ${latestDataTime}`;
  }
}

async function loadLeadForAllTiles(bust) {
  const codes = [...new Set(Object.values(METAL_REGION_CODE))];
  const results = await Promise.allSettled(
    codes.map((code) => fetch(`/api/metal?region=${code}${bust}`).then((r) => r.json()))
  );
  const byCode = {};
  codes.forEach((code, i) => {
    const res = results[i];
    byCode[code] = res.status === "fulfilled" && res.value && res.value.ok ? res.value.lead : null;
  });
  SIDO_LIST.forEach((s) => {
    const code = METAL_REGION_CODE[s.code];
    const lead = byCode[code];
    const state = tileState[s.code];
    state.leadRatio = lead != null ? Math.round((lead / LEAD_ANNUAL_STANDARD_NGM3) * 1000) / 10 : null;
    if (!state.missing) renderTile(s.code);
  });
}

async function loadBaekryeong(bust) {
  try {
    const res = await fetch(`/api/metal?region=2${bust}`).then((r) => r.json());
    els.baekryeongValue.textContent = res.ok ? `납 ${res.lead} ng/㎥` : "결측";
  } catch {
    els.baekryeongValue.textContent = "결측";
  }
}

function showError(msg) {
  els.errorMessage.textContent = msg;
  els.errorScreen.classList.remove("hidden");
  els.mapSection.classList.add("hidden");
}
function hideError() {
  els.errorScreen.classList.add("hidden");
  els.mapSection.classList.remove("hidden");
}

// ---------- 새로고침 (30초 쿨다운) ----------

function updateRefreshButton() {
  const remain = refreshCooldownUntil - Date.now();
  if (remain <= 0) {
    els.refreshBtn.disabled = false;
    els.refreshBtn.textContent = "새로고침";
    return;
  }
  els.refreshBtn.disabled = true;
  els.refreshBtn.textContent = `새로고침 (${Math.ceil(remain / 1000)}초)`;
  setTimeout(updateRefreshButton, 500);
}

els.refreshBtn.addEventListener("click", () => {
  if (Date.now() < refreshCooldownUntil) return;
  refreshCooldownUntil = Date.now() + REFRESH_COOLDOWN_MS;
  updateRefreshButton();
  loadAll(true);
});

els.retryBtn.addEventListener("click", () => loadAll(true));

// ---------- 상세 카드 ----------

async function openDetail(sidoCode) {
  const state = tileState[sidoCode];
  const sidoMeta = SIDO_LIST.find((s) => s.code === sidoCode);
  currentDetailSido = sidoCode;
  els.detailTitle.textContent = sidoMeta.name;
  els.detailOverlay.classList.remove("hidden");

  if (state.missing) {
    els.stationSelect.innerHTML = "";
    els.stationSelect.disabled = true;
    els.trendChart.innerHTML = "";
    els.chartStatus.textContent = REASON_TEXT[state.reason] || "데이터를 표시할 수 없습니다.";
    els.gasList.innerHTML = "";
    els.metalRegionName.textContent = state.regionName || "–";
    els.metalValue.textContent = "–";
    els.metalRatio.textContent = "";
    return;
  }

  els.stationSelect.disabled = false;
  const stations = state.stations.length ? state.stations : [DEFAULT_STATION[sidoCode]].filter(Boolean);
  const defaultStation = DEFAULT_STATION[sidoCode] && stations.includes(DEFAULT_STATION[sidoCode])
    ? DEFAULT_STATION[sidoCode]
    : stations[0];
  els.stationSelect.innerHTML = stations
    .map((name) => `<option value="${name}" ${name === defaultStation ? "selected" : ""}>${name}</option>`)
    .join("");

  els.metalRegionName.textContent = state.regionName;
  els.metalValue.textContent = state.leadRatio != null ? "조회 중…" : "–";
  els.metalRatio.textContent = state.leadRatio != null ? `대기환경기준(${LEAD_ANNUAL_STANDARD_NGM3} ng/㎥) 대비 ${state.leadRatio}%` : "";

  await loadStationDetail(defaultStation);
}

els.stationSelect.addEventListener("change", (e) => loadStationDetail(e.target.value));

async function loadStationDetail(stationName) {
  els.chartStatus.textContent = "불러오는 중…";
  els.trendChart.innerHTML = "";
  els.gasList.innerHTML = "";
  try {
    const res = await fetch(`/api/station?station=${encodeURIComponent(stationName)}`).then((r) => r.json());
    if (!res.ok) {
      els.chartStatus.textContent = REASON_TEXT[res.reason] || "데이터를 불러오지 못했습니다.";
      return;
    }
    renderChart(res.hourly || []);
    els.chartStatus.textContent = `측정 기준 ${res.dataTime || "-"}`;
    renderGases(res.gases || {});
  } catch {
    els.chartStatus.textContent = REASON_TEXT.network;
  }
}

function renderGases(gases) {
  const labels = { o3: "오존(O₃)", no2: "이산화질소(NO₂)", co: "일산화탄소(CO)", so2: "아황산가스(SO₂)" };
  els.gasList.innerHTML = Object.entries(labels)
    .map(([key, label]) => `<dt>${label}</dt><dd>${gases[key] != null ? gases[key] : "–"}</dd>`)
    .join("");
}

function renderChart(hourly) {
  const w = 240, h = 120;
  const values = hourly.map((p) => p.pm25);
  const numeric = values.filter((v) => v != null);
  const yMax = Math.max(60, ...(numeric.length ? numeric : [0])) * 1.15;
  const scale = h / yMax;
  const bandY = (v) => Math.max(0, h - v * scale);

  const bands = [
    { from: 0, to: 15, cls: "success" },
    { from: 15, to: 25, cls: "accent" },
    { from: 25, to: 50, cls: "warning" },
    { from: 50, to: yMax, cls: "danger" },
  ];
  const bandColors = { success: "#2e8f5b", accent: "#3b82c4", warning: "#d99a2b", danger: "#cf4646" };

  let svg = "";
  bands.forEach((b) => {
    const yTop = bandY(b.to);
    const yBot = bandY(b.from);
    svg += `<rect x="0" y="${yTop}" width="${w}" height="${yBot - yTop}" fill="${bandColors[b.cls]}" opacity="0.12"></rect>`;
  });

  if (numeric.length) {
    const step = w / Math.max(1, values.length - 1);
    const points = values
      .map((v, i) => `${i * step},${v == null ? "" : bandY(v)}`)
      .filter((p) => !p.endsWith(","))
      .join(" ");
    svg += `<polyline points="${points}" fill="none" stroke="#e8ecf5" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>`;
    values.forEach((v, i) => {
      if (v == null) return;
      svg += `<circle cx="${i * step}" cy="${bandY(v)}" r="1.8" fill="#e8ecf5"></circle>`;
    });
  }

  els.trendChart.innerHTML = svg;
}

function closeDetail() {
  els.detailOverlay.classList.add("hidden");
  currentDetailSido = null;
}
els.detailClose.addEventListener("click", closeDetail);
els.detailOverlay.addEventListener("click", (e) => {
  if (e.target === els.detailOverlay) closeDetail();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetail();
});

// 상세가 열린 상태에서 다른 타일을 탭하면 즉시 전환 (PRD §5.2)
els.tileLayer.addEventListener(
  "pointerup",
  (e) => {
    if (els.detailOverlay.classList.contains("hidden")) return;
    const tile = e.target.closest(".tile");
    if (tile && tile.dataset.sido !== currentDetailSido) {
      openDetail(tile.dataset.sido);
    }
  },
  true
);

// ---------- 오프라인 배너 ----------

function updateOnlineStatus() {
  els.offlineBanner.classList.toggle("hidden", navigator.onLine);
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

// ---------- 초기화 ----------

buildTiles();
SIDO_LIST.forEach((s) => renderTile(s.code));
updateOnlineStatus();
loadAll(false);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

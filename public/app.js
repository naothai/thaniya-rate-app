const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
const bestRateEl = document.getElementById("bestRate");
const bestAmountEl = document.getElementById("bestAmount");
const fetchedAtEl = document.getElementById("fetchedAt");
const reloadBtn = document.getElementById("reloadBtn");
const locateBtn = document.getElementById("locateBtn");
const locationStatusEl = document.getElementById("locationStatus");
const sortRateBtn = document.getElementById("sortRateBtn");
const sortDistanceBtn = document.getElementById("sortDistanceBtn");
const sortThaniyaBtn = document.getElementById("sortThaniyaBtn");
const yenInput = document.getElementById("yenInput");

const SHOPS = {
  "thaniya-spirit": {
    short: "TS",
    badgeClass: "badge-thaniya-spirit",
    group: "thaniya",
    kicker: "タニヤ本命",
    areaLabel: "Thaniya",
    tags: ["👑 タニヤ本命", "📌 参照値"],
    lat: 13.72910,
    lng: 100.53465,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.72910,100.53465"
  },
  "thaniya-gold": {
    short: "TG",
    badgeClass: "badge-thaniya-gold",
    group: "thaniya",
    kicker: "タニヤ本命",
    areaLabel: "Thaniya",
    tags: ["🏆 タニヤ内", "🔥 リアル強め"],
    lat: 13.728667,
    lng: 100.534934,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.728667,100.534934"
  },
  "value-plus-thaniya": {
    short: "VP",
    badgeClass: "badge-value-plus",
    group: "thaniya",
    kicker: "タニヤ本命",
    areaLabel: "Thaniya",
    tags: ["💎 タニヤ内", "🔥 リアル強め"],
    lat: 13.72895,
    lng: 100.53495,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.72895,100.53495"
  },
  "x-one": {
    short: "X",
    badgeClass: "badge-x-one",
    group: "nearby",
    kicker: "近場強レート",
    areaLabel: "Sukhumvit Soi 22",
    tags: ["🚶 近い", "📈 強レート"],
    lat: 13.72820,
    lng: 100.53185,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.72820,100.53185"
  },
  "superrich-green": {
    short: "SG",
    badgeClass: "badge-superrich-green",
    group: "benchmark",
    kicker: "比較ベンチマーク",
    areaLabel: "Sukhumvit Soi 3/1",
    tags: ["💵 有名店", "🟢 緑"],
    lat: 13.74958,
    lng: 100.53995,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.74958,100.53995"
  },
  "superrich-orange": {
    short: "SO",
    badgeClass: "badge-superrich-orange",
    group: "benchmark",
    kicker: "比較ベンチマーク",
    areaLabel: "Sukhumvit Soi 22",
    tags: ["💵 有名店", "🟠 オレンジ"],
    lat: 13.75074,
    lng: 100.53721,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.75074,100.53721"
  },
  "sia": {
    short: "S",
    badgeClass: "badge-sia",
    group: "benchmark",
    kicker: "比較ベンチマーク",
    areaLabel: "Bangkok",
    tags: ["🏢 比較用", "🏙 プラトゥーナム"],
    lat: 13.750221,
    lng: 100.538381,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.750221,100.538381"
  },
  "vasu": {
    short: "V",
    badgeClass: "badge-vasu",
    group: "benchmark",
    kicker: "比較ベンチマーク",
    areaLabel: "Asok",
    tags: ["🏢 比較用", "🚇 アソーク"],
    lat: 13.738089,
    lng: 100.556420,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.738089,100.556420"
  }
};

let latestItems = [];
let currentSort = "rate";
let userLocation = null;

function formatNumber(v) {
  return new Intl.NumberFormat("ja-JP").format(v);
}

function formatRate(v) {
  if (v == null) return "店頭確認";
  return Number(v).toFixed(4);
}

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

function calcDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getDistanceParts(km) {
  if (km == null) return { main: "距離未取得", sub: "現在地取得後" };
  const minutes = Math.round(km * 12);
  return { main: `徒歩${minutes}分`, sub: `(${km.toFixed(2)}km)` };
}

function getYenAmount() {
  const raw = (yenInput?.value || "").replace(/,/g, "").trim();
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

function calcAmount(rate, yen) {
  if (rate == null || !yen) return null;
  return +(yen * rate).toFixed(2);
}

function uniqueTags(tags) {
  return [...new Set(tags)];
}

function enrichItem(item) {
  const meta = SHOPS[item.id] || {};
  let distanceKm = null;

  if (userLocation && meta.lat && meta.lng) {
    distanceKm = calcDistanceKm(userLocation.lat, userLocation.lng, meta.lat, meta.lng);
  }

  const tags = [...(meta.tags || [])];
  if (item.sourceType === "reference" && !tags.includes("📌 参照値")) tags.push("📌 参照値");
  if (item.sourceType === "manual_reference" && !tags.includes("📍 店頭確認")) tags.push("📍 店頭確認");
  if (item.sourceType === "manual" && !tags.includes("📍 店頭確認")) tags.push("📍 店頭確認");
  if (item.sourceType === "official" && !tags.includes("🏢 公式レート")) tags.push("🏢 公式レート");

  return {
    ...item,
    ...meta,
    kicker: meta.kicker || "比較ベンチマーク",
    areaLabel: meta.areaLabel || item.area,
    tags: uniqueTags(tags),
    distanceKm,
    routeUrl: userLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${meta.lat},${meta.lng}&travelmode=walking`
      : meta.mapUrl
  };
}

function sortItems(items) {
  const arr = items.map(enrichItem);

  if (currentSort === "distance") {
    return arr.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }

  if (currentSort === "thaniya") {
    const priority = { thaniya: 0, nearby: 1, benchmark: 2 };
    return arr.sort((a, b) => {
      const gp = (priority[a.group] ?? 9) - (priority[b.group] ?? 9);
      if (gp !== 0) return gp;
      if (a.rate == null && b.rate == null) return 0;
      if (a.rate == null) return 1;
      if (b.rate == null) return -1;
      return b.rate - a.rate;
    });
  }

  return arr.sort((a, b) => {
    if (a.rate == null && b.rate == null) return 0;
    if (a.rate == null) return 1;
    if (b.rate == null) return -1;
    return b.rate - a.rate;
  });
}

function getRankedItems() {
  return latestItems.filter(i => i.rate != null).sort((a, b) => b.rate - a.rate);
}

function getBestItem() {
  return getRankedItems()[0] || null;
}

function getSecondItem() {
  return getRankedItems()[1] || null;
}

function updateSortButtons() {
  [sortRateBtn, sortDistanceBtn, sortThaniyaBtn].forEach(btn => btn?.classList.remove("active"));
  if (currentSort === "rate") sortRateBtn?.classList.add("active");
  if (currentSort === "distance") sortDistanceBtn?.classList.add("active");
  if (currentSort === "thaniya") sortThaniyaBtn?.classList.add("active");
}

function renderTags(tags = []) {
  return tags.map(tag => `<span class="shop-tag">${tag}</span>`).join("");
}

function renderCard(item, index) {
  const yen = getYenAmount();
  const amount = calcAmount(item.rate, yen);
  const best = getBestItem();
  const isTop = best && best.id === item.id;
  const diff = (best && item.rate != null && yen) ? Math.round((best.rate - item.rate) * yen) : null;
  const dist = getDistanceParts(item.distanceKm);

  return `
    <article class="card ${isTop ? "top-card" : ""}">
      <div class="card-head">
        <div class="card-head-left">
          <div class="shop-badge ${item.badgeClass || "badge-sia"}">${item.short || "?"}</div>
          <div class="shop-meta">
            <div class="shop-kicker">${item.kicker}</div>
            <div class="shop-name">${item.name}</div>
            <div class="shop-area">${item.areaLabel}</div>
            <div class="shop-tags">${renderTags(item.tags)}</div>
          </div>
        </div>

        <div class="card-head-right">
          <div class="rank-badge">${index + 1}</div>
          ${isTop ? `<div class="best-chip">🔥 今日いちばん得</div>` : ``}
          <div class="head-rate">
            <div class="head-rate-value">${item.rate != null ? formatRate(item.rate) : "確認"}</div>
            <div class="head-rate-unit">${item.rate != null ? "THB / JPY" : "店頭確認"}</div>
          </div>
        </div>
      </div>

      <div class="card-divider"></div>

      <div class="card-bottom">
        <div class="metric">
          <div class="metric-label">${formatNumber(yen || 0)}円で</div>
          <div class="metric-value">${amount != null ? `${formatNumber(amount)} THB` : "店頭確認"}</div>
          ${(diff != null && diff > 0) ? `<div class="metric-sub">+${formatNumber(diff)} THBお得</div>` : (isTop ? `<div class="metric-sub">最上位レート</div>` : ``)}
        </div>

        <div class="metric">
          <div class="metric-label">10,000円</div>
          <div class="metric-value">${item.amount10000 != null ? `${formatNumber(item.amount10000)} THB` : "店頭確認"}</div>
        </div>

        <div class="metric distance">
          <div class="metric-label">距離</div>
          <div class="metric-value">${dist.main}</div>
          <div class="metric-sub">${dist.sub}</div>
        </div>

        <div class="action-col">
          <a class="action-btn primary" href="${item.routeUrl || item.mapUrl || item.sourceUrl}" target="_blank" rel="noopener noreferrer">今すぐ行く</a>
          <a class="action-btn secondary" href="${item.mapUrl || item.sourceUrl}" target="_blank" rel="noopener noreferrer">地図</a>
        </div>
      </div>
    </article>
  `;
}

function updateHero() {
  const best = getBestItem();
  const second = getSecondItem();
  const yen = getYenAmount();

  if (!best) {
    bestRateEl.classList.add("small");
    bestRateEl.textContent = "取得中";
    bestAmountEl.textContent = "取得中";
    return;
  }

  bestRateEl.classList.remove("small");
  bestRateEl.textContent = formatRate(best.rate);

  const bestAmount = calcAmount(best.rate, yen);
  const secondAmount = second ? calcAmount(second.rate, yen) : null;

  if (bestAmount != null) {
    if (secondAmount != null) {
      const diff = Math.round(bestAmount - secondAmount);
      if (diff > 0) {
        bestAmountEl.innerHTML = `<span class="main">${formatNumber(bestAmount)} THB</span><span class="sub">+${formatNumber(diff)} THBお得</span>`;
      } else {
        bestAmountEl.innerHTML = `<span class="main">${formatNumber(bestAmount)} THB</span>`;
      }
    } else {
      bestAmountEl.innerHTML = `<span class="main">${formatNumber(bestAmount)} THB</span>`;
    }
  } else {
    bestAmountEl.textContent = "店頭確認";
  }
}

function renderItems() {
  const sorted = sortItems(latestItems);
  listEl.innerHTML = sorted.map((item, index) => renderCard(item, index)).join("");
  statusEl.textContent = `${sorted.length}件のレートを表示中`;
  updateSortButtons();
}

function refreshUi() {
  updateHero();
  renderItems();
}

async function loadRates() {
  statusEl.textContent = "最新レートを取得中...";
  try {
    const res = await fetch("/api/rates");
    const data = await res.json();
    latestItems = Array.isArray(data.results) ? data.results : [];
    fetchedAtEl.textContent = formatDateTime(data.fetchedAt);
    refreshUi();
  } catch (e) {
    statusEl.textContent = "レート取得に失敗しました";
  }
}

function requestLocation() {
  locationStatusEl.textContent = "位置情報：取得中...";

  navigator.geolocation.getCurrentPosition(pos => {
    userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    currentSort = "distance";
    locationStatusEl.textContent = "位置情報：取得済み";
    renderItems();
  }, () => {
    locationStatusEl.textContent = "位置情報が許可されていません";
  });
}

reloadBtn.onclick = loadRates;
locateBtn.onclick = requestLocation;

sortRateBtn.onclick = () => {
  currentSort = "rate";
  locationStatusEl.textContent = userLocation ? "位置情報：取得済み" : "位置情報：未取得";
  renderItems();
};

sortDistanceBtn.onclick = () => {
  currentSort = "distance";
  locationStatusEl.textContent = userLocation ? "位置情報：取得済み" : "現在地取得後に近い順";
  renderItems();
};

sortThaniyaBtn.onclick = () => {
  currentSort = "thaniya";
  locationStatusEl.textContent = "タニヤ優先で表示中";
  renderItems();
};

["input", "change", "keyup"].forEach(evt => {
  yenInput.addEventListener(evt, refreshUi);
});

loadRates();

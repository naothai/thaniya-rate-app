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
const yenInput = document.getElementById("yenInput");

const SHOPS = {
  "thaniya-spirit": {
    short: "TS",
    badgeClass: "badge-thaniya-spirit",
    group: "thaniya",
    tags: ["👑 タニヤ本命", "📌 参照値"],
    lat: 13.72910,
    lng: 100.53465,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.72910,100.53465"
  },
  "thaniya-gold": {
    short: "TG",
    badgeClass: "badge-thaniya-gold",
    group: "thaniya",
    tags: ["🏆 タニヤ内", "🔥 リアル強め"],
    lat: 13.728667,
    lng: 100.534934,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.728667,100.534934"
  },
  "value-plus-thaniya": {
    short: "VP",
    badgeClass: "badge-value-plus",
    group: "thaniya",
    tags: ["💎 タニヤ内", "🔥 リアル強め"],
    lat: 13.72895,
    lng: 100.53495,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.72895,100.53495"
  },
  "x-one": {
    short: "X",
    badgeClass: "badge-x-one",
    group: "nearby",
    tags: ["🚶 近い", "💹 強レート"],
    lat: 13.72820,
    lng: 100.53185,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.72820,100.53185"
  },
  "superrich-green": {
    short: "SG",
    badgeClass: "badge-superrich-green",
    group: "benchmark",
    tags: ["💵 有名店", "🟢 緑"],
    lat: 13.74958,
    lng: 100.53995,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.74958,100.53995"
  },
  "superrich-orange": {
    short: "SO",
    badgeClass: "badge-superrich-orange",
    group: "benchmark",
    tags: ["💵 有名店", "🟠 オレンジ"],
    lat: 13.75074,
    lng: 100.53721,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.75074,100.53721"
  },
  "sia": {
    short: "S",
    badgeClass: "badge-sia",
    group: "benchmark",
    tags: ["📊 比較用", "🏙 プラトゥーナム"],
    lat: 13.750221,
    lng: 100.538381,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=13.750221,100.538381"
  },
  "vasu": {
    short: "V",
    badgeClass: "badge-vasu",
    group: "benchmark",
    tags: ["📊 比較用", "🚇 アソーク"],
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

function formatDistance(km) {
  if (km == null) return "近い順で探すと表示されます";
  const minutes = Math.round(km * 12);
  return `徒歩${minutes}分（${km.toFixed(2)}km）`;
}

function getYenAmount() {
  const raw = (yenInput?.value || "").replace(/,/g, "").trim();
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

function calcCustomAmount(rate) {
  const yen = getYenAmount();
  if (rate == null || !yen) return null;
  return +(yen * rate).toFixed(2);
}

function enrichItem(item) {
  const meta = SHOPS[item.id] || {};
  let distanceKm = null;

  if (userLocation && meta.lat && meta.lng) {
    distanceKm = calcDistanceKm(
      userLocation.lat,
      userLocation.lng,
      meta.lat,
      meta.lng
    );
  }

  const tags = [...(meta.tags || [])];

  if (item.sourceType === "reference") tags.push("📍 参照値");
  if (item.sourceType === "manual_reference") tags.push("📍 店頭確認");
  if (item.sourceType === "manual") tags.push("📍 店頭確認");
  if (item.sourceType === "official") tags.push("🏢 公式レート");

  let headline = "";
  if (meta.group === "thaniya") headline = "タニヤ本命";
  if (meta.group === "nearby") headline = "近場強レート";
  if (meta.group === "benchmark") headline = "比較ベンチマーク";

  return {
    ...item,
    ...meta,
    tags,
    headline,
    distanceKm,
    customAmount: calcCustomAmount(item.rate),
    routeUrl: userLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${meta.lat},${meta.lng}&travelmode=walking`
      : meta.mapUrl
  };
}

function sortItems(items) {
  const arr = items.map(enrichItem);

  const groupPriority = {
    thaniya: 0,
    nearby: 1,
    benchmark: 2
  };

  if (currentSort === "distance") {
    return arr.sort((a, b) => {
      const gp = (groupPriority[a.group] ?? 9) - (groupPriority[b.group] ?? 9);
      if (gp !== 0) return gp;
      return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    });
  }

  return arr.sort((a, b) => {
    const gp = (groupPriority[a.group] ?? 9) - (groupPriority[b.group] ?? 9);
    if (gp !== 0) return gp;

    const aRank = a.rate == null ? -1 : a.rate;
    const bRank = b.rate == null ? -1 : b.rate;
    return bRank - aRank;
  });
}

function renderTags(tags = []) {
  return tags.map(tag => `<span class="shop-tag">${tag}</span>`).join("");
}

function renderAmount(v, item) {
  if (v != null) return `${formatNumber(v)} THB`;
  if (item.sourceType === "manual") return "店頭確認";
  if (item.sourceType === "manual_reference") return "店頭確認";
  return "確認中";
}

function renderRateLabel(item) {
  if (item.rate != null) return "THB / JPY";
  if (item.sourceType === "manual") return "リアル確認向け";
  if (item.sourceType === "manual_reference") return "リアル確認向け";
  return "";
}

function renderTopMessage(item) {
  if (item.rate != null) return formatRate(item.rate);
  if (item.sourceType === "manual") return "店頭確認";
  if (item.sourceType === "manual_reference") return "店頭確認";
  return "確認中";
}

function renderRank(item, index) {
  if (item.rate == null) return "—";
  return `#${index + 1}`;
}

function renderCustomAmount(item) {
  if (item.customAmount != null) return `${formatNumber(item.customAmount)} THB`;
  if (item.sourceType === "manual") return "店頭確認";
  if (item.sourceType === "manual_reference") return "店頭確認";
  return "確認中";
}

function renderCard(item, index) {
  const currentYen = getYenAmount();

  return `
    <article class="rate-card ${item.group === "thaniya" ? "thaniya-card" : ""}">
      <div class="rate-top">
        <div class="shop-head">
          <div class="shop-badge ${item.badgeClass || "badge-sia"}">${item.short || "?"}</div>
          <div>
            <div class="meta-kicker">${item.headline || ""}</div>
            <div class="rate-name">${item.name}</div>
            <div class="rate-area">${item.area}</div>
            <div class="shop-tags">${renderTags(item.tags)}</div>
          </div>
        </div>
        <div class="rank-badge">${renderRank(item, index)}</div>
      </div>

      <div class="rate-number-wrap">
        <div class="rate-number">${renderTopMessage(item)}</div>
        <div class="rate-number-unit">${renderRateLabel(item)}</div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <div class="meta-label">${formatNumber(currentYen || 0)}円</div>
          <div class="meta-value">${renderCustomAmount(item)}</div>
        </div>
        <div class="info-box">
          <div class="meta-label">10,000円</div>
          <div class="meta-value">${renderAmount(item.amount10000, item)}</div>
        </div>
        <div class="info-box">
          <div class="meta-label">更新</div>
          <div class="meta-value">${item.updated || item.note || "-"}</div>
        </div>
        <div class="info-box">
          <div class="meta-label">距離</div>
          <div class="meta-value">${formatDistance(item.distanceKm)}</div>
        </div>
      </div>

      <div class="card-actions">
        <a class="link-btn primary" href="${item.routeUrl}" target="_blank" rel="noopener noreferrer">今すぐ行く</a>
        <a class="link-btn secondary" href="${item.mapUrl || item.sourceUrl}" target="_blank" rel="noopener noreferrer">地図</a>
      </div>
    </article>
  `;
}

function renderItems() {
  const sorted = sortItems(latestItems);
  listEl.innerHTML = sorted.map(renderCard).join("");
  statusEl.textContent = `${sorted.length}件のレートを表示中`;
}

function updateHero() {
  const ranked = latestItems.filter(i => i.rate != null).sort((a, b) => b.rate - a.rate);
  const best = ranked[0];

  if (best) {
    bestRateEl.textContent = formatRate(best.rate);
    const customBest = calcCustomAmount(best.rate);
    bestAmountEl.textContent = customBest != null ? `${formatNumber(customBest)} THB` : "-";
  } else {
    bestRateEl.textContent = "-";
    bestAmountEl.textContent = "-";
  }
}

function refreshCalculatedUi() {
  updateHero();
  renderItems();
}

async function loadRates() {
  statusEl.textContent = "最新レートを取得中...";
  const res = await fetch("/api/rates");
  const data = await res.json();
  latestItems = Array.isArray(data.results) ? data.results : [];

  fetchedAtEl.textContent = formatDateTime(data.fetchedAt);
  refreshCalculatedUi();
}

function requestLocation() {
  locationStatusEl.textContent = "現在地を取得中...";

  navigator.geolocation.getCurrentPosition(pos => {
    userLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
    currentSort = "distance";
    locationStatusEl.textContent = "近い順に表示中";
    renderItems();
  }, () => {
    locationStatusEl.textContent = "位置情報が許可されていません";
  });
}

reloadBtn.onclick = loadRates;
locateBtn.onclick = requestLocation;

sortRateBtn.onclick = () => {
  currentSort = "rate";
  locationStatusEl.textContent = "レート順で表示中";
  renderItems();
};

sortDistanceBtn.onclick = () => {
  currentSort = "distance";
  locationStatusEl.textContent = "近い順で表示中";
  renderItems();
};

["input", "change", "keyup"].forEach(evt => {
  yenInput.addEventListener(evt, refreshCalculatedUi);
});

loadRates();

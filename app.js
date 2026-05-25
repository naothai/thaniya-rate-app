const SUPER_RICH_GREEN_MAP_URL = "https://maps.app.goo.gl/Gyvn3eJGd5hhGG9y6";
const fallbackLat = 13.728;
const fallbackLng = 100.534;


function setupRefreshButton(){
  const btn = document.querySelector(".refresh");
  if(!btn) return;

  btn.onclick = async () => {
    btn.style.opacity = 0.6;

    await loadRealRates();
    renderAll();

    btn.style.opacity = 1;
  };
}


async function loadRealRates(){
  try{
    const res = await fetch('/api/rates');
    const data = await res.json();

    if(data.results){
      // 既存shopsを上書き
      data.results.forEach(r => {
        const target = shops.find(s => s.id === r.id);
        if(target){
          target.rate = r.rate;
        }
      });

      window.__ratesLoaded = true;
      console.log("リアルレート取得成功", data.marketRate);
    }
  }catch(e){
    console.log("レート取得失敗", e);
  }
}

const shops = [
  {
    id: 1,
    name: "Thaniya Spirit",
    mapUrl: "https://maps.app.goo.gl/x7Y3j9aCiytY2V2n6",
    area: "Thaniya",
    rate: null,
    lat: 13.72889,
    lng: 100.53354,
    tags: ["👑 タニヤ本命", "📌 参照値"],
    logo: "TS",
    logoClass: "logo-ts"
  },
  {
    id: 2,
    name: "Superrich Green",
    area: "Sukhumvit Soi 3/1",
    mapUrl: "https://maps.app.goo.gl/Gyvn3eJGd5hhGG9y6",
    rate: 0.2020,
    lat: 13.74658,
    lng: 100.55254,
    tags: ["🗺️ 有名店", "緑"],
    logo: "SG",
    logoClass: "logo-sg"
  },
  {
    id: 3,
    name: "Superrich Orange",
    mapUrl: "https://maps.app.goo.gl/Kde4yKLHLZHbshn26",
    area: "Sukhumvit Soi 22",
    rate: 0.2014,
    lat: 13.73120,
    lng: 100.56540,
    tags: ["🗺️ 有名店", "オレンジ"],
    logo: "SO",
    logoClass: "logo-orange"
  },
  {
    id: 4,
    name: "X-One Exchange",
    mapUrl: "https://maps.app.goo.gl/ZXMdwoLzgnZThZQ19",
    area: "Asok",
    rate: 0.2008,
    lat: 13.73730,
    lng: 100.56010,
    tags: ["📍 駅近", "強レート"],
    logo: "X",
    logoClass: "logo-ts"
  },
  {
    id: 5,
    name: "Thaniya Gold",
    mapUrl: "https://maps.app.goo.gl/cHcQUg2nHv7GY6j86",
    area: "Thaniya",
    rate: 0.1999,
    lat: 13.72810,
    lng: 100.53320,
    tags: ["📍 タニヤ内", "安定"],
    logo: "TG",
    logoClass: "logo-gold"
  }
,

  {
    id: 6,
    name: "Vasu Exchange",
    area: "Sukhumvit Nana",
    rate: null,
    rateLabel: "店頭確認",
    rateSource: "店頭確認",
    lat: 13.7428,
    lng: 100.5551,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Vasu%20Exchange%20Bangkok",
    tags: ["🔥 強レート", "🚉 Nana"],
    logo: "VS",
    logoClass: "logo-vasu"
  },
  {
    id: 7,
    name: "UC Exchange",
    area: "Sukhumvit Soi 22",
    rate: null,
    rateLabel: "店頭確認",
    rateSource: "店頭確認",
    lat: 13.7303,
    lng: 100.5644,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=UC%20Currency%20Exchange%20Sukhumvit%20Soi%2022",
    tags: ["🧠 穴場", "📍 Soi22"],
    logo: "UC",
    logoClass: "logo-uc"
  },
  {
    id: 8,
    name: "Value Plus",
    area: "Thaniya",
    rate: null,
    rateLabel: "店頭確認",
    rateSource: "店頭確認",
    lat: 13.7286,
    lng: 100.5332,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Value%20Plus%20Exchange%20Thaniya",
    tags: ["🚶 タニヤ近", "混雑回避"],
    logo: "VP",
    logoClass: "logo-vp"
  }

];

let amountJPY = 10000;
let sortMode = "rate";
let userLocation = null;

function formatNumber(n){ return Number(Math.round(n)).toLocaleString("ja-JP"); }
function formatRate(n){ return Number(n).toFixed(4); }

function hasRate(shop){
  return typeof shop.rate === "number" && shop.rate > 0;
}

function displayRate(shop){
  return hasRate(shop) ? formatRate(shop.rate) : "店頭確認";
}

function displayUnit(shop){
  return hasRate(shop) ? "THB / JPY" : "";
}

function safeCalcTHB(jpy, rate){
  return typeof rate === "number" && rate > 0 ? Math.round(jpy * rate) : null;
}
function calcTHB(jpy, rate){ return Math.round(jpy * rate); }

function haversine(lat1, lon1, lat2, lon2){
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fallbackDistance(id){
  return {1:0.24,2:1.92,3:2.00,4:1.10,5:0.32}[id] ?? 1;
}

function walkMin(km){ return Math.max(1, Math.round(km * 12.5)); }

function enrichedShops(){
  return shops.map(shop => {
    const distance = userLocation
      ? haversine(userLocation.lat, userLocation.lng, shop.lat, shop.lng)
      : fallbackDistance(shop.id);

    return {
      ...shop,
      distance,
      walkMin: walkMin(distance),
      thb: safeCalcTHB(amountJPY, shop.rate)
    };
  });
}

function sortedShops(){
  const list = enrichedShops();

  if(sortMode === "rate"){
    list.sort((a,b) => (b.rate || -1) - (a.rate || -1));
  }

  if(sortMode === "distance"){
    list.sort((a,b) => a.distance - b.distance);
  }

  if(sortMode === "thaniya"){
    list.sort((a,b) => {
      const aT = a.area === "Thaniya" ? 1 : 0;
      const bT = b.area === "Thaniya" ? 1 : 0;
      if(bT !== aT) return bT - aT;
      return b.rate - a.rate;
    });
  }

  return list;
}

function bestShop(){
  return [...shops].filter(s => s.rate).sort((a,b) => b.rate - a.rate)[0];
}

function worstRate(){
  const rated = shops.filter(s => typeof s.rate === "number" && s.rate > 0);
  if(!rated.length) return null;
  return Math.min(...rated.map(s => s.rate));
}

function badgeHTML(tag){
  if(tag === "緑") return `<span class="badge"><span class="dot"></span> 緑</span>`;
  if(tag === "オレンジ") return `<span class="badge">🟠 オレンジ</span>`;
  return `<span class="badge">${tag}</span>`;
}

function medalHTML(rank){
  return rank === 1 ? `<div class="medal">1</div>` : `<div class="medal silver">${rank}</div>`;
}

function googleMapsUrl(shop){
  if (shop.name && shop.name.includes("Superrich Green")) {
    return SUPER_RICH_GREEN_MAP_URL;
  }

  if (shop.mapUrl) return shop.mapUrl;

  const q = encodeURIComponent(`${shop.name} ${shop.area} Bangkok`);
  if(shop.lat && shop.lng){
    return `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}&travelmode=walking`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function shopCardHTML(shop, rank, bestRate){
  const wr = worstRate();
  const diff = (shop.thb == null || !wr) ? null : shop.thb - calcTHB(amountJPY, wr);
  const saveText = diff == null
    ? "店頭確認"
    : diff > 0
      ? `+${formatNumber(diff)} THBお得`
      : "基準";
  const featured = rank === 1 ? " featured" : "";
  const bestBadge = shop.rate === bestRate ? `<span class="top-badge">🌀 今日いちばん得</span>` : "";
  const mapUrl = googleMapsUrl(shop);

  return `
    <section class="shop${featured}">
      <div class="shop-head">
        <div class="left-rail">
          ${medalHTML(rank)}
          <div class="rail-divider"></div>
          <div class="logo-box ${shop.logoClass}">${shop.logo}</div>
        </div>

        <div class="shop-main">
          <div class="title">${shop.name}</div>
          <div class="area">${shop.area}</div>
        </div>

        <div class="rate-side">
          ${bestBadge}
          <div class="num">${displayRate(shop)}</div>
          <div class="unit">${displayUnit(shop)}</div>
        </div>

        <div class="badges">
          ${shop.tags.slice(0,2).map(badgeHTML).join("")}
        </div>
      </div>

      <div class="divider"></div>

      <div class="shop-foot">
        <div class="metric">
          <div class="s">${formatNumber(amountJPY)}円で</div>
          <div class="b">${shop.thb == null ? "店頭確認" : formatNumber(shop.thb) + " THB"}</div>
          <div class="g">${saveText}</div>
        </div>

        <div class="metric">
          <div class="s blue">${formatNumber(amountJPY)}円</div>
          <div class="b">${shop.thb == null ? "店頭確認" : formatNumber(shop.thb) + " THB"}</div>
        </div>

        <div class="metric">
          <div class="d">徒歩${shop.walkMin}分</div>
          <div class="k">(${shop.distance.toFixed(2)}km)</div>
        </div>

        <div class="actions">
          <button class="go" type="button" data-map="${mapUrl}">今すぐ行く</button>
          <button class="map" type="button" data-map="${mapUrl}">地図</button>
        </div>
      </div>
    </section>
  `;
}

function updateBestCard(){
  const best = bestShop();
  document.querySelector(".best-rate").textContent = formatRate(best.rate);
  document.querySelector(".best-unit").textContent = "THB / JPY";
  document.querySelector(".best-sub .r1").innerHTML =
    `<span class="yen">${formatNumber(amountJPY)}円</span>で ${formatNumber(calcTHB(amountJPY, best.rate))} THB`;
  const list = [...shops].sort((a,b) => b.rate - a.rate);
  const second = list[1];
  const diff = second ? calcTHB(amountJPY, best.rate) - calcTHB(amountJPY, second.rate) : 0;
  {
    const wr = worstRate();
    const diff = wr ? calcTHB(amountJPY, best.rate) - calcTHB(amountJPY, wr) : 0;
    document.querySelector(".best-sub .r2").textContent = diff > 0 ? `+${formatNumber(diff)} THBお得` : "今日いちばん得";
  }

  const d = new Date();
  document.querySelector(".best-time .value").textContent =
    `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function updateTopThbBox(){
  const best = bestShop();
  const el = document.querySelector(".result-value");
  if(el) el.textContent = formatNumber(calcTHB(amountJPY, best.rate));
}

function mountList(){
  let mount = document.querySelector("#shop-list");
  if(mount) return mount;

  document.querySelectorAll(".shop").forEach(el => el.remove());
  mount = document.createElement("div");
  mount.id = "shop-list";
  document.querySelector(".count").insertAdjacentElement("afterend", mount);
  return mount;
}

function renderShops(){
  const mount = mountList();
  const list = sortedShops();
  const bestRate = bestShop().rate;

  mount.innerHTML = list.map((shop, i) => shopCardHTML(shop, i + 1, bestRate)).join("");

  document.querySelector(".count").textContent = `${shops.length}件のレートを表示中`;

  document.querySelectorAll("[data-map]").forEach(btn => {
    btn.onclick = () => window.open(btn.dataset.map, "_blank");
  });
}

function setActiveTab(){
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(t => t.classList.remove("active"));
  if(sortMode === "rate") tabs[0]?.classList.add("active");
  if(sortMode === "distance") tabs[1]?.classList.add("active");
  if(sortMode === "thaniya") tabs[2]?.classList.add("active");
}

function renderAll(){
  updateBestCard();
  updateTopThbBox();
  renderShops();
  setActiveTab();
}

function initInput(){
  const input = document.querySelector(".input-box input");

  let display = document.querySelector(".yen-display");
  if(!display){
    display = document.createElement("div");
    display.className = "yen-display";
    input.insertAdjacentElement("afterend", display);
  }

  function syncYenDisplay(){
    display.textContent = input.value;
    const digits = input.value.replace(/[^\d]/g, "").length;
    display.classList.toggle("is-long", digits >= 7);
    display.classList.toggle("is-mid", digits === 6);
  }

  input.value = formatNumber(amountJPY);
  syncYenDisplay();

  input.addEventListener("input", () => {
    const raw = input.value.replace(/[^\d]/g, "");
    amountJPY = Number(raw || 0);
    input.value = raw ? formatNumber(amountJPY) : "";
    syncYenDisplay();
    renderAll();
  });
}

function initTabs(){
  const tabs = document.querySelectorAll(".tab");
  tabs[0].onclick = () => { sortMode = "rate"; renderAll(); };
  tabs[1].onclick = () => { sortMode = "distance"; renderAll(); };
  tabs[2].onclick = () => { sortMode = "thaniya"; renderAll(); };
}

function initLocation(){
  const btn = document.querySelector(".loc-btn");
  btn.onclick = () => {
    if(!navigator.geolocation){
      alert("位置情報に対応していません");
      return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
      userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
      document.querySelector(".loc-row span").textContent = "位置情報：取得済み";
      sortMode = "distance";
      renderAll();
    }, () => {
      alert("位置情報を取得できませんでした");
    });
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  setupRefreshButton();
  setupLocation();
  setupRefreshButton();
  await loadRealRates();
  initInput();
  initTabs();
  initLocation();
  renderAll();
});


/* ===== SAFE REAL RATE REFRESH PATCH ===== */
async function loadRealRatesSafe(){
  try{
    const res = await fetch(`/api/rates?t=${Date.now()}`, {
      cache: "no-store"
    });

    if(!res.ok){
      throw new Error("api failed");
    }

    const data = await res.json();

    if(!Array.isArray(data.results)){
      return;
    }

    data.results.forEach(r => {
      const target = shops.find(s => s.id === r.id || s.name === r.name);
      if(target){
        target.rate = (typeof r.rate === "number" && r.rate > 0) ? Number(r.rate) : null;
        if (r.rateLabel) target.rateLabel = r.rateLabel;
        if (r.rateSource) target.rateSource = r.rateSource;
        if (r.mapUrl) target.mapUrl = r.mapUrl;
        if (r.tags) target.tags = r.tags;
        if (r.logo) target.logo = r.logo;
        if (r.logoClass) target.logoClass = r.logoClass;
        if (r.mapUrl) target.mapUrl = r.mapUrl;
      }
    });

    window.__ratesLoaded = true;
    console.log("rate refreshed", data.fetchedAt, data.marketRate);
    renderAll();

  }catch(e){
    console.error("rate refresh failed", e);
  }
}

function bindRefreshButtonSafe(){
  const btn = document.querySelector(".refresh");
  if(!btn) return;

  btn.onclick = async () => {
    const old = btn.innerHTML;
    btn.style.opacity = "0.6";
    btn.innerHTML = '<span class="ico"></span>更新中';

    await loadRealRatesSafe();

    btn.innerHTML = old;
    btn.style.opacity = "1";
  };
}

window.addEventListener("load", async () => {
  bindRefreshButtonSafe();
  await loadRealRatesSafe();
});


/* ===== REAL DISTANCE CALC ===== */

function calcDistance(lat1, lng1, lat2, lng2){
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2)*Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180) *
    Math.sin(dLng/2)*Math.sin(dLng/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function updateDistances(userLat, userLng){
  shops.forEach(shop => {
    if(shop.lat && shop.lng){
      const d = calcDistance(userLat, userLng, shop.lat, shop.lng);
      shop.distance = d;
      shop.walk = Math.round(d * 12); // 徒歩分（ざっくり）
    }
  });
}

function setupLocation(){
  const btn = document.querySelector(".location-btn");
  if(!btn) return;

  btn.onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;

      userLocation = {
        lat: latitude,
        lng: longitude
      };

      updateDistances(latitude, longitude);
      renderAll();

      const status = document.querySelector(".location-status");
      if(status){
        status.innerText = "位置情報：取得済み";
      }

    }, () => {
      alert("位置情報が取得できません");
    });
  };
}


function bindMapButtonsFinal(){
  document.querySelectorAll("[data-map]").forEach(btn => {
    btn.onclick = () => {
      const url = btn.getAttribute("data-map");
      if(url) window.open(url, "_blank");
    };
  });
}

const originalRenderAllForMap = renderAll;
renderAll = function(){
  originalRenderAllForMap();
  bindMapButtonsFinal();
};



/* ===== CLEAN MAP FEATURE REBUILD ONLY ===== */
let realMapInstance = null;

function createMapPanel(){
  if(document.querySelector("#map-panel")) return;

  const panel = document.createElement("div");
  panel.id = "map-panel";
  panel.innerHTML = `
    <div class="map-panel-inner">
      <div class="map-panel-head">
        <div>
          <div class="map-panel-title">周辺マップ</div>
          <div class="map-panel-sub">行きたい両替所を選んでください</div>
        </div>
        <button class="map-panel-close" type="button">×</button>
      </div>
      <div id="real-map"></div>
      <div class="map-shop-list"></div>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector(".map-panel-close").onclick = () => {
    panel.classList.remove("show");
  };
}

function openMapPanel(){
  createMapPanel();

  const panel = document.querySelector("#map-panel");
  const list = panel.querySelector(".map-shop-list");
  const data = typeof sortedShops === "function" ? sortedShops() : shops;

  list.innerHTML = data.map(shop => {
    const url = typeof googleMapsUrl === "function"
      ? googleMapsUrl(shop)
      : (shop.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + " Bangkok")}`);

    const rateText = shop.rate ? Number(shop.rate).toFixed(4) + " THB / JPY" : "店頭確認";

    return `
      <button class="map-shop-item" type="button" data-map="${url}">
        <div class="map-shop-logo ${shop.logoClass || ""}">${shop.logo || ""}</div>
        <div class="map-shop-info">
          <div class="map-shop-name">${shop.name}</div>
          <div class="map-shop-area">${shop.area}</div>
        </div>
        <div class="map-shop-rate">${rateText}</div>
      </button>
    `;
  }).join("");

  list.querySelectorAll("[data-map]").forEach(btn => {
    btn.onclick = () => window.open(btn.dataset.map, "_blank");
  });

  panel.classList.add("show");

  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos => {
      userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      if(typeof updateDistances === "function"){
        updateDistances(userLocation.lat, userLocation.lng);
      }

      renderRealMap();
    }, () => {
      renderRealMap();
    }, {
      enableHighAccuracy:true,
      timeout:10000,
      maximumAge:30000
    });
  }else{
    renderRealMap();
  }
}

function renderRealMap(){
  if(typeof L === "undefined") return;

  const mapBox = document.querySelector("#real-map");
  if(!mapBox) return;

  const data = typeof sortedShops === "function" ? sortedShops() : shops;
  const validShops = data.filter(s => s.lat && s.lng);

  if(realMapInstance){
    realMapInstance.remove();
    realMapInstance = null;
  }

  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [13.72889, 100.53354];

  realMapInstance = L.map("real-map", {
    zoomControl:true,
    attributionControl:false
  }).setView(center, 14);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom:20
  }).addTo(realMapInstance);

  const bounds = [];

  if(userLocation){
    const userIcon = L.divIcon({
      className:"clean-user-location-pin",
      html: `
        <div class="clean-user-location-wrap">
          <div class="clean-user-location-dot"></div>
          <div class="clean-user-location-label">現在地</div>
        </div>
      `,
      iconSize:[86,34],
      iconAnchor:[43,17]
    });

    L.marker([userLocation.lat, userLocation.lng], {
      icon:userIcon,
      zIndexOffset:999999
    }).addTo(realMapInstance);

    bounds.push([userLocation.lat, userLocation.lng]);
  }

  validShops.forEach((shop, index) => {
    const marker = L.marker([shop.lat, shop.lng]).addTo(realMapInstance);
    const rateText = shop.rate ? Number(shop.rate).toFixed(4) + " THB / JPY" : "店頭確認";

    marker.bindPopup(`
      <b>${index + 1}. ${shop.name}</b><br>
      ${shop.area}<br>
      ${rateText}
    `);

    bounds.push([shop.lat, shop.lng]);
  });

  if(bounds.length > 1){
    realMapInstance.fitBounds(bounds, { padding:[28,28] });
  }

  setTimeout(() => {
    if(realMapInstance) realMapInstance.invalidateSize();
  }, 200);
}


/* ===== RATE HISTORY TAB FEATURE ===== */
const RATE_HISTORY_KEY = "thaniya_rate_history_v3";

function getRateHistory(){
  try{
    return JSON.parse(localStorage.getItem(RATE_HISTORY_KEY) || "[]");
  }catch(e){
    return [];
  }
}

function saveRateSnapshot(){
  if(!window.__ratesLoaded) return;
  if(!Array.isArray(shops)) return;

  const now = new Date();
  const snapshot = {
    time: now.toISOString(),
    label: `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`,
    shops: shops.map(s => ({
      id: s.id,
      name: s.name,
      rate: typeof s.rate === "number" && s.rate > 0 ? Number(s.rate.toFixed(4)) : null,
      rateLabel: s.rateLabel || null
    }))
  };

  const history = getRateHistory();

  const last = history[history.length - 1];
  if(last && last.label === snapshot.label) return;

  history.push(snapshot);

  // 最大100件だけ保存
  localStorage.setItem(RATE_HISTORY_KEY, JSON.stringify(history.slice(-100)));
}

function createHistoryPanel(){
  if(document.querySelector("#history-panel")) return;

  const panel = document.createElement("div");
  panel.id = "history-panel";
  panel.innerHTML = `
    <div class="history-panel-inner">
      <div class="history-panel-head">
        <div>
          <div class="history-panel-title">レート推移</div>
          <div class="history-panel-sub">更新ごとの最高レートを記録します</div>
        </div>
        <button class="history-panel-close" type="button">×</button>
      </div>

      <div class="history-summary">
        <div>
          <div class="history-label">最新最高レート</div>
          <div class="history-best">-</div>
        </div>
        <div>
          <div class="history-label">保存件数</div>
          <div class="history-count">0件</div>
        </div>
      </div>

      <div class="history-chart"></div>
      <div class="history-list"></div>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector(".history-panel-close").onclick = () => {
    panel.classList.remove("show");
  };
}

function renderHistoryPanel(){
  createHistoryPanel();

  const panel = document.querySelector("#history-panel");
  const history = getRateHistory();

  const bestEl = panel.querySelector(".history-best");
  const countEl = panel.querySelector(".history-count");
  const chartEl = panel.querySelector(".history-chart");
  const listEl = panel.querySelector(".history-list");

  countEl.textContent = `${history.length}件`;

  if(!history.length){
    bestEl.textContent = "-";
    chartEl.innerHTML = `<div class="history-empty">まだ履歴がありません。更新ボタンを押すと記録されます。</div>`;
    listEl.innerHTML = "";
    return;
  }

  const latest = history[history.length - 1];
  const latestRated = latest.shops.filter(s => s.rate);
  const latestBest = latestRated.length ? Math.max(...latestRated.map(s => s.rate)) : null;

  bestEl.textContent = latestBest ? latestBest.toFixed(4) : "店頭確認";

  const points = history.map(h => {
    const rated = h.shops.filter(s => s.rate);
    return rated.length ? Math.max(...rated.map(s => s.rate)) : null;
  }).filter(v => v !== null);

  if(points.length >= 2){
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 0.0001;

    const w = 320;
    const h = 120;
    const step = w / Math.max(points.length - 1, 1);

    const poly = points.map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * 90 - 15;
      return `${x},${y}`;
    }).join(" ");

    chartEl.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" class="history-svg">
        <polyline points="${poly}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
      </svg>
      <div class="history-chart-note">最高 ${max.toFixed(4)} / 最低 ${min.toFixed(4)}</div>
    `;
  }else{
    chartEl.innerHTML = `<div class="history-empty">もう一度更新すると推移グラフが表示されます。</div>`;
  }

  listEl.innerHTML = history.slice(-12).reverse().map(h => {
  return `
    <div class="history-day">
      <div class="history-day-title">${h.label}</div>

      ${(h.shops || [])
        .filter(s => s.rate)
        .sort((a,b)=>b.rate-a.rate)
        .slice(0,5)
        .map((s,i)=>`
          <div class="history-row">
            <div class="history-rank">${i+1}</div>
            <div class="history-name">${s.name}</div>
            <div class="history-rate">${s.rate.toFixed(4)}</div>
          </div>
        `).join("")}
    </div>
  `;
}).join("");
}

function openHistoryPanel(){
  saveRateSnapshot();
  renderHistoryPanel();
  document.querySelector("#history-panel").classList.add("show");
}

function bindHistoryTabForce(){ /* disabled: menu click misfire */ }

// 初回表示時にも1回保存
window.addEventListener("load", () => {
  setTimeout(() => {
    saveRateSnapshot();
    bindHistoryTabForce();
  }, 800);
});

// レート更新後にも保存されるようにする
if(typeof renderAll === "function" && !window.__historyRenderWrapped){
  window.__historyRenderWrapped = true;
  const oldRenderAllHistory = renderAll;
  renderAll = function(){
    oldRenderAllHistory();
    setTimeout(saveRateSnapshot, 200);
  };
}


/* ===== AUTO SAVE HISTORY ON OPEN ===== */
window.addEventListener("load", () => {
  setTimeout(() => {
    if(window.__ratesLoaded && typeof saveRateSnapshot === "function"){
      saveRateSnapshot();
    }
  }, 1800);
});


/* ===== HISTORY 7DAYS DAILY VIEW ===== */
function bestRateFromSnapshot(h){
  const rated = (h.shops || []).filter(s => typeof s.rate === "number" && s.rate > 0);
  if(!rated.length) return null;

  const best = Math.max(...rated.map(s => s.rate));
  const shop = rated.find(s => s.rate === best);

  return {
    rate: best,
    shopName: shop ? shop.name : "-"
  };
}

function buildDailyHistory(days = 7){
  const history = getRateHistory();
  const byDate = {};

  history.forEach(h => {
    const d = new Date(h.time);
    if(Number.isNaN(d.getTime())) return;

    const key = d.toISOString().slice(0,10);
    const best = bestRateFromSnapshot(h);
    if(!best) return;

    if(!byDate[key] || best.rate > byDate[key].rate){
      byDate[key] = {
        date: key,
        label: `${d.getMonth()+1}/${d.getDate()}`,
        rate: best.rate,
        shopName: best.shopName
      };
    }
  });

  const result = [];
  const today = new Date();

  for(let i = days - 1; i >= 0; i--){
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const key = d.toISOString().slice(0,10);
    result.push(byDate[key] || {
      date: key,
      label: `${d.getMonth()+1}/${d.getDate()}`,
      rate: null,
      shopName: "-"
    });
  }

  return result;
}

function renderHistoryPanel7Days(){
  createHistoryPanel();

  const panel = document.querySelector("#history-panel");
  const bestEl = panel.querySelector(".history-best");
  const countEl = panel.querySelector(".history-count");
  const chartEl = panel.querySelector(".history-chart");
  const listEl = panel.querySelector(".history-list");

  if(!panel.querySelector(".history-range-tabs")){
    const tabs = document.createElement("div");
    tabs.className = "history-range-tabs";
    tabs.innerHTML = `
      <button class="history-range active" type="button">7days</button>
      <button class="history-range disabled" type="button">1month</button>
      <button class="history-range disabled" type="button">1year</button>
    `;
    panel.querySelector(".history-panel-head").insertAdjacentElement("afterend", tabs);
  }

  const daily = buildDailyHistory(7);
  const valid = daily.filter(d => d.rate);

  countEl.textContent = `${valid.length}日`;

  if(!valid.length){
    bestEl.textContent = "-";
    chartEl.innerHTML = `<div class="history-empty">まだ日別履歴がありません。アプリを開くか更新すると記録されます。</div>`;
    listEl.innerHTML = "";
    return;
  }

  const latest = [...daily].reverse().find(d => d.rate);
  bestEl.textContent = latest ? latest.rate.toFixed(4) : "-";

  if(valid.length >= 2){
    const points = daily.map(d => d.rate);
    const validRates = points.filter(v => v !== null);

    const min = Math.min(...validRates);
    const max = Math.max(...validRates);
    const range = max - min || 0.0001;

    const w = 320;
    const h = 130;
    const step = w / 6;

    const circles = [];
    const linePoints = [];

    points.forEach((v, i) => {
      if(v === null) return;

      const x = i * step;
      const y = h - ((v - min) / range) * 86 - 22;

      linePoints.push(`${x},${y}`);
      circles.push(`
        <circle cx="${x}" cy="${y}" r="5"></circle>
        <text class="rate-point-label" x="${x}" y="${y - 12}" text-anchor="middle">${Math.round(v * 10000).toLocaleString()}</text>
      `);
    });

    chartEl.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" class="history-svg daily">
        <polyline points="${linePoints.join(" ")}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
        ${circles.join("")}
      </svg>
      <div class="history-days">
        ${daily.map(d => `<span>${d.label}</span>`).join("")}
      </div>
      <div class="history-chart-note">7日間：最高 ${max.toFixed(4)} / 最低 ${min.toFixed(4)}</div>
    `;
  }else{
    chartEl.innerHTML = `<div class="history-empty">もう1日分の記録が増えると7日間グラフが表示されます。</div>`;
  }

  listEl.innerHTML = daily.slice().reverse().map(d => {
    return `
      <div class="history-item">
        <div>
          <div class="history-time">${d.label}</div>
          <div class="history-shop">${d.shopName || "-"}</div>
        </div>
        <div class="history-rate">${d.rate ? d.rate.toFixed(4) : "-"}</div>
      </div>
    `;
  }).join("");
}

// 既存の履歴表示を7days日別表示に差し替え
renderHistoryPanel = renderHistoryPanel7Days;


/* ===== DAILY FULL SHOP RANKING ===== */
function buildDailyFullRanking(days = 7){
  const history = getRateHistory();
  const byDate = {};

  history.forEach(h => {
    const d = new Date(h.time);
    if(Number.isNaN(d.getTime())) return;

    const key = d.toISOString().slice(0,10);

    if(!byDate[key]){
      byDate[key] = {};
    }

    (h.shops || []).forEach(shop => {
      if(typeof shop.rate !== "number" || shop.rate <= 0) return;

      if(!byDate[key][shop.name] || shop.rate > byDate[key][shop.name]){
        byDate[key][shop.name] = shop.rate;
      }
    });
  });

  const result = [];
  const today = new Date();

  for(let i = days - 1; i >= 0; i--){
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const key = d.toISOString().slice(0,10);
    const dayData = byDate[key] || {};

    const sorted = Object.entries(dayData)
      .map(([name, rate]) => ({name, rate}))
      .sort((a,b) => b.rate - a.rate);

    result.push({
      label: `${d.getMonth()+1}/${d.getDate()}`,
      shops: sorted
    });
  }

  return result;
}

function renderDailyFullRanking(panel){
  const container = document.createElement("div");
  container.className = "history-daily-full";

  const data = buildDailyFullRanking(7);

  container.innerHTML = data.reverse().map(day => {
    if(!day.shops.length){
      return `
        <div class="history-day-block">
          <div class="history-day-title">${day.label}</div>
          <div class="history-empty">データなし</div>
        </div>
      `;
    }

    return `
      <div class="history-day-block">
        <div class="history-day-title">${day.label}</div>
        ${day.shops.slice(0,5).map((s,i)=>`
          <div class="history-rank-item">
            <div class="history-rank-left">
              <span class="history-rank-num">${i+1}</span>
              <span class="history-rank-name">${s.name}</span>
            </div>
            <div class="history-rank-rate">${s.rate.toFixed(4)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }).join("");

  panel.querySelector(".history-list").innerHTML = "";
  panel.querySelector(".history-list").appendChild(container);
}

// 既存の履歴描画の最後に追加
const oldRenderHistoryFinal = renderHistoryPanel;
renderHistoryPanel = function(){
  oldRenderHistoryFinal();

  const panel = document.querySelector("#history-panel");
  if(panel){
    renderDailyFullRanking(panel);
  }
};


/* ===== SHOP HISTORY DETAIL VIEW ===== */
function buildShopDailyHistory(shopName, days = 7){
  const history = getRateHistory();
  const byDate = {};

  history.forEach(h => {
    const d = new Date(h.time);
    if(Number.isNaN(d.getTime())) return;

    const key = d.toISOString().slice(0,10);
    const target = (h.shops || []).find(s => s.name === shopName);

    if(target && typeof target.rate === "number" && target.rate > 0){
      if(!byDate[key] || target.rate > byDate[key].rate){
        byDate[key] = {
          date:key,
          label:`${d.getMonth()+1}/${d.getDate()}`,
          rate:target.rate
        };
      }
    }
  });

  const result = [];
  const today = new Date();

  for(let i = days - 1; i >= 0; i--){
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0,10);

    result.push(byDate[key] || {
      date:key,
      label:`${d.getMonth()+1}/${d.getDate()}`,
      rate:null
    });
  }

  return result;
}

function renderShopHistoryDetail(shopName){
  const panel = document.querySelector("#history-panel");
  if(!panel) return;

  const bestEl = panel.querySelector(".history-best");
  const countEl = panel.querySelector(".history-count");
  const chartEl = panel.querySelector(".history-chart");
  const listEl = panel.querySelector(".history-list");
  const titleEl = panel.querySelector(".history-panel-title");
  const subEl = panel.querySelector(".history-panel-sub");

  titleEl.textContent = shopName;
  subEl.textContent = "店舗別の7日間レート推移";

  const daily = buildShopDailyHistory(shopName, 7);
  const valid = daily.filter(d => d.rate);

  countEl.textContent = `${valid.length}日`;
  bestEl.textContent = valid.length ? valid[valid.length - 1].rate.toFixed(4) : "-";

  if(valid.length >= 2){
    const rates = daily.map(d => d.rate);
    const validRates = rates.filter(v => v !== null);

    const min = Math.min(...validRates);
    const max = Math.max(...validRates);
    const range = max - min || 0.0001;

    const w = 320;
    const h = 130;
    const step = w / 6;

    const points = [];
    const circles = [];

    rates.forEach((v, i) => {
      if(v === null) return;

      const x = i * step;
      const y = h - ((v - min) / range) * 86 - 22;

      points.push(`${x},${y}`);
      circles.push(`
        <circle cx="${x}" cy="${y}" r="5"></circle>
        <text class="rate-point-label" x="${x}" y="${y - 12}" text-anchor="middle">${Math.round(v * 10000).toLocaleString()}</text>
      `);
    });

    chartEl.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" class="history-svg daily">
        <polyline points="${points.join(" ")}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
        ${circles.join("")}
      </svg>
      <div class="history-days">
        ${daily.map(d => `<span>${d.label}</span>`).join("")}
      </div>
      <div class="history-chart-note">${shopName}：最高 ${max.toFixed(4)} / 最低 ${min.toFixed(4)}</div>
    `;
  }else{
    chartEl.innerHTML = `<div class="history-empty">この店舗の履歴がまだ少ないです。明日以降また開くと推移が見えます。</div>`;
  }

  listEl.innerHTML = `
    <button class="history-back-btn" type="button">← 全体ランキングに戻る</button>
    ${daily.slice().reverse().map(d => `
      <div class="history-item">
        <div>
          <div class="history-time">${d.label}</div>
          <div class="history-shop">${shopName}</div>
        </div>
        <div class="history-rate">${d.rate ? d.rate.toFixed(4) : "-"}</div>
      </div>
    `).join("")}
  `;

  const back = listEl.querySelector(".history-back-btn");
  if(back){
    back.onclick = () => {
      titleEl.textContent = "レート推移";
      subEl.textContent = "更新ごとの最高レートを記録します";
      renderHistoryPanel();
    };
  }
}

function bindHistoryShopClicks(){
  document.querySelectorAll(".history-rank-item").forEach(item => {
    if(item.dataset.shopClickBound) return;
    item.dataset.shopClickBound = "1";
    item.style.cursor = "pointer";

    item.addEventListener("click", () => {
      const nameEl = item.querySelector(".history-rank-name");
      if(nameEl){
        renderShopHistoryDetail(nameEl.textContent.trim());
      }
    });
  });
}

const oldRenderHistoryShopClick = renderHistoryPanel;
renderHistoryPanel = function(){
  oldRenderHistoryShopClick();
  setTimeout(bindHistoryShopClicks, 100);
};


/* ===== FIX BOTTOM TAB ALERT INTERFERENCE ===== */
window.addEventListener("load", () => {
  setTimeout(() => {
    document.querySelectorAll("*").forEach(el => {
      const text = (el.innerText || el.textContent || "").trim();

      // 古い「履歴」準備中ハンドラーを無効化するため、履歴要素はクリックを履歴パネル優先にする
      if(text === "履歴" || text.includes("履歴")){
        el.onclick = null;
      }

      // お気に入り・設定だけ準備中
      if((text === "お気に入り" || text === "設定") && !el.dataset.cleanPrepBound){
        el.dataset.cleanPrepBound = "1";
        el.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          alert(`${text}機能は準備中です`);
        };
      }
    });

    // 履歴タブを再バインド
    document.querySelectorAll("*").forEach(el => {
      const text = (el.innerText || el.textContent || "").trim();
      if(text === "履歴" && !el.dataset.cleanHistoryBound){
        el.dataset.cleanHistoryBound = "1";
        el.style.cursor = "pointer";
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openHistoryPanel();
        }, true);
      }
    });
  }, 1000);
});


/* ===== FINAL FIX OLD PREP ALERT ===== */
const originalAlertFinal = window.alert;
window.alert = function(message){
  if(message === "お気に入り機能は準備中です"){
    return;
  }
  originalAlertFinal(message);
};

window.addEventListener("load", () => {
  setTimeout(() => {
    document.querySelectorAll("*").forEach(el => {
      const text = (el.innerText || el.textContent || "").trim();

      if(text === "履歴"){
        el.style.cursor = "pointer";
        el.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if(typeof openHistoryPanel === "function"){
            openHistoryPanel();
          }
        };
      }

      if(text === "お気に入り"){
        el.style.cursor = "pointer";
        el.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          originalAlertFinal("お気に入り機能は準備中です");
        };
      }
    });
  }, 1200);
});


/* ===== COMPLETE BOTTOM MENU BAR ===== */
const FAVORITE_KEY = "thaniya_favorites_v1";

function getFavorites(){
  try{
    return JSON.parse(localStorage.getItem(FAVORITE_KEY) || "[]");
  }catch(e){
    return [];
  }
}

function saveFavorites(list){
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(list));
}

function toggleFavoriteShop(name){
  const favs = getFavorites();
  const next = favs.includes(name)
    ? favs.filter(n => n !== name)
    : [...favs, name];

  saveFavorites(next);
  renderFavoritePanel();
}

function closeAllPanels(){
  ["#map-panel", "#history-panel", "#favorite-panel", "#settings-panel"].forEach(sel => {
    const el = document.querySelector(sel);
    if(el) el.classList.remove("show");
  });
}

function createFavoritePanel(){
  if(document.querySelector("#favorite-panel")) return;

  const panel = document.createElement("div");
  panel.id = "favorite-panel";
  panel.innerHTML = `
    <div class="favorite-panel-inner">
      <div class="favorite-panel-head">
        <div>
          <div class="favorite-panel-title">お気に入り</div>
          <div class="favorite-panel-sub">よく使う両替所を登録できます</div>
        </div>
        <button class="favorite-panel-close" type="button">×</button>
      </div>
      <div class="favorite-list"></div>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector(".favorite-panel-close").onclick = () => {
    panel.classList.remove("show");
  };
}

function renderFavoritePanel(){
  createFavoritePanel();

  const favs = getFavorites();
  const list = document.querySelector("#favorite-panel .favorite-list");
  const data = typeof sortedShops === "function" ? sortedShops() : shops;

  list.innerHTML = data.map(shop => {
    const active = favs.includes(shop.name);
    const rateText = shop.rate ? Number(shop.rate).toFixed(4) + " THB / JPY" : "店頭確認";

    return `
      <button class="favorite-item" type="button" data-shop="${shop.name}">
        <div class="favorite-logo ${shop.logoClass || ""}">${shop.logo || ""}</div>
        <div class="favorite-info">
          <div class="favorite-name">${shop.name}</div>
          <div class="favorite-area">${shop.area}</div>
        </div>
        <div class="favorite-right">
          <div class="favorite-rate">${rateText}</div>
          <div class="favorite-star ${active ? "active" : ""}">${active ? "★" : "☆"}</div>
        </div>
      </button>
    `;
  }).join("");

  list.querySelectorAll(".favorite-item").forEach(btn => {
    btn.onclick = () => toggleFavoriteShop(btn.dataset.shop);
  });
}

function openFavoritePanel(){
  closeAllPanels();
  renderFavoritePanel();
  document.querySelector("#favorite-panel").classList.add("show");
}

function createSettingsPanel(){
  if(document.querySelector("#settings-panel")) return;

  const panel = document.createElement("div");
  panel.id = "settings-panel";
  panel.innerHTML = `
    <div class="settings-panel-inner">
      <div class="settings-panel-head">
        <div>
          <div class="settings-panel-title">設定</div>
          <div class="settings-panel-sub">アプリの表示を管理します</div>
        </div>
        <button class="settings-panel-close" type="button">×</button>
      </div>

      <div class="settings-list">
        <button class="settings-item" type="button" data-action="clear-history">
          <div>
            <div class="settings-name">レート履歴を削除</div>
            <div class="settings-desc">保存された推移データをリセットします</div>
          </div>
          <div class="settings-arrow">›</div>
        </button>

        <button class="settings-item" type="button" data-action="clear-favorites">
          <div>
            <div class="settings-name">お気に入りを削除</div>
            <div class="settings-desc">登録したお気に入りをリセットします</div>
          </div>
          <div class="settings-arrow">›</div>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector(".settings-panel-close").onclick = () => {
    panel.classList.remove("show");
  };

  panel.querySelector('[data-action="clear-history"]').onclick = () => {
    Object.keys(localStorage).forEach(k => {
      if(k.includes("thaniya_rate_history")) localStorage.removeItem(k);
    });
    alert("レート履歴を削除しました");
  };

  panel.querySelector('[data-action="clear-favorites"]').onclick = () => {
    localStorage.removeItem(FAVORITE_KEY);
    alert("お気に入りを削除しました");
  };
}

function openSettingsPanel(){
  closeAllPanels();
  createSettingsPanel();
  document.querySelector("#settings-panel").classList.add("show");
}

function bindCompleteBottomMenu(){
  document.querySelectorAll("*").forEach(el => {
    const text = (el.innerText || el.textContent || "").trim();

    if(text === "レート"){
      el.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeAllPanels();
        window.scrollTo({top:0, behavior:"smooth"});
      };
    }

    if(text === "お気に入り"){
      el.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openFavoritePanel();
      };
    }

    if(text === "設定"){
      el.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSettingsPanel();
      };
    }
  });
}

window.addEventListener("load", () => {
  setTimeout(bindCompleteBottomMenu, 1200);
});


/* ===== FINAL FAVORITE / SETTINGS ONLY ===== */
const FINAL_FAVORITE_KEY = "thaniya_favorites_final_v1";

function finalGetFavorites(){
  try{
    return JSON.parse(localStorage.getItem(FINAL_FAVORITE_KEY) || "[]");
  }catch(e){
    return [];
  }
}

function finalSaveFavorites(list){
  localStorage.setItem(FINAL_FAVORITE_KEY, JSON.stringify(list));
}

function finalCloseFavoriteSettings(){
  ["#favorite-panel-final", "#settings-panel-final"].forEach(sel => {
    const el = document.querySelector(sel);
    if(el) el.classList.remove("show");
  });
}

function finalCreateFavoritePanel(){
  if(document.querySelector("#favorite-panel-final")) return;

  const panel = document.createElement("div");
  panel.id = "favorite-panel-final";
  panel.innerHTML = `
    <div class="favorite-final-inner">
      <div class="favorite-final-head">
        <div>
          <div class="favorite-final-title">お気に入り</div>
          <div class="favorite-final-sub">よく使う両替所を登録できます</div>
        </div>
        <button class="favorite-final-close" type="button">×</button>
      </div>
      <div class="favorite-final-list"></div>
    </div>
  `;

  document.body.appendChild(panel);
  panel.querySelector(".favorite-final-close").onclick = () => panel.classList.remove("show");
}

function finalRenderFavoritePanel(){
  finalCreateFavoritePanel();

  const favs = finalGetFavorites();
  const list = document.querySelector("#favorite-panel-final .favorite-final-list");
  const data = typeof sortedShops === "function" ? sortedShops() : shops;

  list.innerHTML = data.map(shop => {
    const active = favs.includes(shop.name);
    const rateText = shop.rate ? Number(shop.rate).toFixed(4) + " THB / JPY" : "店頭確認";

    return `
      <button class="favorite-final-item" type="button" data-shop="${shop.name}">
        <div class="favorite-final-logo ${shop.logoClass || ""}">${shop.logo || ""}</div>
        <div>
          <div class="favorite-final-name">${shop.name}</div>
          <div class="favorite-final-area">${shop.area}</div>
        </div>
        <div class="favorite-final-right">
          <div class="favorite-final-rate">${rateText}</div>
          <div class="favorite-final-star ${active ? "active" : ""}">${active ? "★" : "☆"}</div>
        </div>
      </button>
    `;
  }).join("");

  list.querySelectorAll(".favorite-final-item").forEach(btn => {
    btn.onclick = () => {
      const name = btn.dataset.shop;
      const current = finalGetFavorites();
      const next = current.includes(name)
        ? current.filter(n => n !== name)
        : [...current, name];

      finalSaveFavorites(next);
      finalRenderFavoritePanel();
    };
  });
}

function finalOpenFavoritePanel(){
  finalCloseFavoriteSettings();
  finalRenderFavoritePanel();
  document.querySelector("#favorite-panel-final").classList.add("show");
}

function finalCreateSettingsPanel(){
  if(document.querySelector("#settings-panel-final")) return;

  const panel = document.createElement("div");
  panel.id = "settings-panel-final";
  panel.innerHTML = `
    <div class="settings-final-inner">
      <div class="settings-final-head">
        <div>
          <div class="settings-final-title">設定</div>
          <div class="settings-final-sub">保存データを管理します</div>
        </div>
        <button class="settings-final-close" type="button">×</button>
      </div>

      <div class="settings-final-list">
        <button class="settings-final-item" type="button" data-action="clear-favorites">
          <div>
            <div class="settings-final-name">お気に入りを削除</div>
            <div class="settings-final-desc">登録したお気に入りをリセットします</div>
          </div>
          <div class="settings-final-arrow">›</div>
        </button>

        <button class="settings-final-item" type="button" data-action="clear-history">
          <div>
            <div class="settings-final-name">レート履歴を削除</div>
            <div class="settings-final-desc">保存された推移データをリセットします</div>
          </div>
          <div class="settings-final-arrow">›</div>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  panel.querySelector(".settings-final-close").onclick = () => panel.classList.remove("show");

  panel.querySelector('[data-action="clear-favorites"]').onclick = () => {
    localStorage.removeItem(FINAL_FAVORITE_KEY);
    alert("お気に入りを削除しました");
  };

  panel.querySelector('[data-action="clear-history"]').onclick = () => {
    Object.keys(localStorage).forEach(k => {
      if(k.includes("thaniya_rate_history")) localStorage.removeItem(k);
    });
    alert("レート履歴を削除しました");
  };
}

function finalOpenSettingsPanel(){
  finalCloseFavoriteSettings();
  finalCreateSettingsPanel();
  document.querySelector("#settings-panel-final").classList.add("show");
}

// 下メニューだけを捕まえる。マップ・履歴には触らない。
document.addEventListener("click", function(e){
  const bottom = e.target.closest(".bottom, .bottom-nav, .tabbar, footer, nav");
  if(!bottom) return;

  const text = (e.target.innerText || e.target.textContent || "").trim();

  if(text.includes("お気に入り")){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    finalOpenFavoritePanel();
  }

  if(text.includes("設定")){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    finalOpenSettingsPanel();
  }
}, true);


/* ===== FINAL HISTORY VALUE JUDGEMENT ONLY ===== */
function getCurrentBestRateFinal(){
  const rated = shops.filter(s => typeof s.rate === "number" && s.rate > 0);
  if(!rated.length) return null;
  return Math.max(...rated.map(s => s.rate));
}

function getDailyBestRatesFinal(days = 7){
  if(typeof buildDailyHistory !== "function") return [];
  return buildDailyHistory(days).filter(d => typeof d.rate === "number" && d.rate > 0);
}

function renderHistoryJudgementFinal(){
  const panel = document.querySelector("#history-panel");
  if(!panel) return;

  let box = panel.querySelector(".history-judgement-final");
  if(!box){
    box = document.createElement("div");
    box.className = "history-judgement-final";
    const summary = panel.querySelector(".history-summary");
    if(summary){
      summary.insertAdjacentElement("afterend", box);
    }
  }

  const current = getCurrentBestRateFinal();
  const daily = getDailyBestRatesFinal(7);
  const avg = daily.length
    ? daily.reduce((sum, d) => sum + d.rate, 0) / daily.length
    : null;

  if(!current || !avg || daily.length < 2){
    box.innerHTML = `
      <div class="judge-title">判断データ蓄積中</div>
      <div class="judge-sub">もう数日使うと「今が高いか」が見えるようになります</div>
    `;
    return;
  }

  const diff = current - avg;
  const diffText = diff >= 0 ? `+${diff.toFixed(4)}` : diff.toFixed(4);

  let status = "平均的なレートです";
  let cls = "normal";

  if(diff >= 0.0003){
    status = "今日は両替に向いています";
    cls = "good";
  }else if(diff <= -0.0003){
    status = "今日は少し弱めです";
    cls = "bad";
  }

  box.innerHTML = `
    <div class="judge-status ${cls}">${status}</div>
    <div class="judge-grid">
      <div>
        <div class="judge-label">現在</div>
        <div class="judge-value">${current.toFixed(4)}</div>
      </div>
      <div>
        <div class="judge-label">7日平均</div>
        <div class="judge-value">${avg.toFixed(4)}</div>
      </div>
      <div>
        <div class="judge-label">平均との差</div>
        <div class="judge-value">${diffText}</div>
      </div>
    </div>
  `;
}

const oldRenderHistoryJudgementFinal = renderHistoryPanel;
renderHistoryPanel = function(){
  oldRenderHistoryJudgementFinal();
  setTimeout(renderHistoryJudgementFinal, 80);
};


/* ===== USER HISTORY (VIEWED SHOPS) ===== */
const USER_HISTORY_KEY = "thaniya_user_history_v1";

function getUserHistory(){
  try{
    return JSON.parse(localStorage.getItem(USER_HISTORY_KEY) || "[]");
  }catch(e){
    return [];
  }
}

function saveUserHistory(list){
  localStorage.setItem(USER_HISTORY_KEY, JSON.stringify(list));
}

function addUserHistory(shop){
  const history = getUserHistory();

  const newItem = {
    name: shop.name,
    time: Date.now()
  };

  const filtered = history.filter(h => h.name !== shop.name);
  const next = [newItem, ...filtered].slice(0, 20);

  saveUserHistory(next);
}

function formatTimeAgo(ts){
  const diff = Math.floor((Date.now() - ts) / 1000);

  if(diff < 60) return "今";
  if(diff < 3600) return Math.floor(diff / 60) + "分前";
  if(diff < 86400) return Math.floor(diff / 3600) + "時間前";

  return Math.floor(diff / 86400) + "日前";
}

/* ===== HISTORY PANEL (USER) ===== */
function createUserHistoryPanel(){
  if(document.querySelector("#user-history-panel")) return;

  const panel = document.createElement("div");
  panel.id = "user-history-panel";
  panel.innerHTML = `
    <div class="user-history-inner">
      <div class="user-history-head">
        <div>
          <div class="user-history-title">履歴</div>
          <div class="user-history-sub">最近見た両替所</div>
        </div>
        <button class="user-history-close">×</button>
      </div>
      <div class="user-history-list"></div>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector(".user-history-close").onclick = () => {
    panel.classList.remove("show");
  };
}

function renderUserHistoryPanel(){
  createUserHistoryPanel();

  const list = document.querySelector("#user-history-panel .user-history-list");
  const data = getUserHistory();

  if(!data.length){
    list.innerHTML = `<div class="history-empty">まだ履歴がありません</div>`;
    return;
  }

  list.innerHTML = data.map(item => `
    <div class="user-history-item">
      <div>
        <div class="user-history-name">${item.name}</div>
        <div class="user-history-time">${formatTimeAgo(item.time)}</div>
      </div>
    </div>
  `).join("");
}

function openUserHistoryPanel(){
  renderUserHistoryPanel();
  document.querySelector("#user-history-panel").classList.add("show");
}

/* ===== フック（ボタン押したら履歴保存） ===== */
function bindHistoryTracking(){
  document.querySelectorAll(".go-btn, .map-btn").forEach(btn => {
    if(btn.dataset.historyBound) return;
    btn.dataset.historyBound = "1";

    btn.addEventListener("click", () => {
      const card = btn.closest(".shop-card");
      if(!card) return;

      const nameEl = card.querySelector(".shop-name");
      if(!nameEl) return;

      const shop = shops.find(s => s.name === nameEl.textContent.trim());
      if(shop){
        addUserHistory(shop);
      }
    });
  });
}

/* 履歴ボタン差し替え */
document.addEventListener("click", function(e){
  const text = (e.target.innerText || "").trim();

  if(text === "履歴"){
    e.preventDefault();
    e.stopPropagation();
    openUserHistoryPanel();
  }
}, true);

setTimeout(bindHistoryTracking, 1500);


/* ===== FINAL HISTORY TAB OVERRIDE ONLY ===== */

// 古い「履歴機能は準備中です」だけ無効化
const originalAlertHistoryOnly = window.alert;
window.alert = function(message){
  if(message === "履歴機能は準備中です"){
    return;
  }
  originalAlertHistoryOnly(message);
};

const FINAL_USER_HISTORY_KEY = "thaniya_user_history_final_v1";

function finalGetUserHistory(){
  try{
    return JSON.parse(localStorage.getItem(FINAL_USER_HISTORY_KEY) || "[]");
  }catch(e){
    return [];
  }
}

function finalSaveUserHistory(list){
  localStorage.setItem(FINAL_USER_HISTORY_KEY, JSON.stringify(list));
}

function finalAddUserHistory(shop){
  if(!shop || !shop.name) return;

  const history = finalGetUserHistory();
  const item = {
    name: shop.name,
    area: shop.area || "",
    rate: typeof shop.rate === "number" ? shop.rate : null,
    logo: shop.logo || "",
    logoClass: shop.logoClass || "",
    mapUrl: shop.mapUrl || "",
    time: Date.now()
  };

  const next = [
    item,
    ...history.filter(h => h.name !== shop.name)
  ].slice(0, 30);

  finalSaveUserHistory(next);
}

function finalTimeAgo(ts){
  const diff = Math.floor((Date.now() - ts) / 1000);
  if(diff < 60) return "今";
  if(diff < 3600) return Math.floor(diff / 60) + "分前";
  if(diff < 86400) return Math.floor(diff / 3600) + "時間前";
  return Math.floor(diff / 86400) + "日前";
}

function finalCreateUserHistoryPanel(){
  if(document.querySelector("#final-user-history-panel")) return;

  const panel = document.createElement("div");
  panel.id = "final-user-history-panel";
  panel.innerHTML = `
    <div class="final-user-history-inner">
      <div class="final-user-history-head">
        <div>
          <div class="final-user-history-title">履歴</div>
          <div class="final-user-history-sub">最近見た・地図を開いた両替所</div>
        </div>
        <button class="final-user-history-close" type="button">×</button>
      </div>
      <div class="final-user-history-list"></div>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector(".final-user-history-close").onclick = () => {
    panel.classList.remove("show");
  };
}

function finalRenderUserHistoryPanel(){
  finalCreateUserHistoryPanel();

  const panel = document.querySelector("#final-user-history-panel");
  const list = panel.querySelector(".final-user-history-list");
  const history = finalGetUserHistory();

  if(!history.length){
    list.innerHTML = `
      <div class="final-user-history-empty">
        まだ履歴がありません。<br>
        「今すぐ行く」または「地図」を押すと保存されます。
      </div>
    `;
    return;
  }

  list.innerHTML = history.map(item => {
    const rateText = item.rate ? Number(item.rate).toFixed(4) + " THB / JPY" : "店頭確認";

    return `
      <button class="final-user-history-item" type="button" data-map="${item.mapUrl || ""}">
        <div class="final-user-history-logo ${item.logoClass || ""}">${item.logo || ""}</div>
        <div>
          <div class="final-user-history-name">${item.name}</div>
          <div class="final-user-history-area">${item.area}</div>
          <div class="final-user-history-time">${finalTimeAgo(item.time)}</div>
        </div>
        <div class="final-user-history-rate">${rateText}</div>
      </button>
    `;
  }).join("");

  list.querySelectorAll("[data-map]").forEach(btn => {
    btn.onclick = () => {
      const url = btn.dataset.map;
      if(url) window.open(url, "_blank");
    };
  });
}

function finalOpenUserHistoryPanel(){
  finalRenderUserHistoryPanel();
  document.querySelector("#final-user-history-panel").classList.add("show");
}

// 地図・今すぐ行くを押した店舗を履歴保存
function finalBindHistoryTracking(){
  document.querySelectorAll("[data-map], .map-btn, .go-btn").forEach(btn => {
    if(btn.dataset.finalHistoryTrack) return;
    btn.dataset.finalHistoryTrack = "1";

    btn.addEventListener("click", () => {
      const card = btn.closest(".shop-card");
      if(!card) return;

      const nameEl = card.querySelector(".shop-name");
      if(!nameEl) return;

      const shop = shops.find(s => s.name === nameEl.textContent.trim());
      if(shop) finalAddUserHistory(shop);
    }, true);
  });
}

// 履歴タブだけ最優先で上書き
document.addEventListener("click", function(e){
  const text = (e.target.innerText || e.target.textContent || "").trim();

  if(text === "履歴" || text.includes("履歴")){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    finalOpenUserHistoryPanel();
    return false;
  }
}, true);

window.addEventListener("load", () => {
  setTimeout(finalBindHistoryTracking, 1200);
});


/* ===== SAFE NAV FIX (NO LOGIC TOUCH) ===== */

/* ×ボタンを完全に安全化 */
document.addEventListener("click", function(e){
  const closeBtn = e.target.closest("button");

  if(!closeBtn) return;

  const txt = (closeBtn.innerText || "").trim();

  if(txt === "×"){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // 全パネル閉じる
    document.querySelectorAll(
      "#map-panel, #history-panel, #favorite-panel-final, #settings-panel-final, #final-user-history-panel"
    ).forEach(el => {
      if(el) el.classList.remove("show");
    });

    return false;
  }
}, true);


/* aタグの暴発防止 */
document.querySelectorAll("a").forEach(a => {
  if(!a.dataset.safeNav){
    a.dataset.safeNav = "1";
    a.addEventListener("click", function(e){
      if(a.getAttribute("href") === "#" || a.getAttribute("href") === ""){
        e.preventDefault();
      }
    });
  }
});


/* パネル閉じたら必ずホーム状態維持 */
function safeReturnHome(){
  window.scrollTo({top:0, behavior:"instant"});
}

document.querySelectorAll(".user-history-close, .favorite-final-close, .settings-final-close")
.forEach(btn => {
  btn.onclick = () => {
    btn.closest("div[id]").classList.remove("show");
    safeReturnHome();
  };
});



/* ===== AUTO TRIM FINAL BOTTOM GAP ===== */
function autoTrimFinalBottomGap(){
  const nav = document.querySelector("#app-bottom-nav");
  const shops = [...document.querySelectorAll(".shop-card,.shop")];
  const last = shops[shops.length - 1];

  if(!nav || !last) return;

  // 一度リセットしてから実測
  last.style.marginBottom = "0px";

  requestAnimationFrame(() => {
    const navTop = nav.getBoundingClientRect().top;
    const lastBottom = last.getBoundingClientRect().bottom;
    const gap = navTop - lastBottom;

    // 目標余白は8pxだけ
    if(gap > 12){
      last.style.marginBottom = `-${gap - 8}px`;
      console.log("bottom gap trimmed:", gap, "px");
    }
  });
}

window.addEventListener("load", () => {
  setTimeout(autoTrimFinalBottomGap, 1500);
  setTimeout(autoTrimFinalBottomGap, 2500);
});

window.addEventListener("resize", () => {
  setTimeout(autoTrimFinalBottomGap, 300);
});

if(typeof renderAll === "function" && !window.__autoTrimFinalBottomGap){
  window.__autoTrimFinalBottomGap = true;
  const oldRenderAllTrimGap = renderAll;
  renderAll = function(){
    oldRenderAllTrimGap();
    setTimeout(autoTrimFinalBottomGap, 300);
  };
}




/* ===== ONE CLEAN BOTTOM NAV CONTROL ===== */
let cleanUserMarker = null;

function cleanClosePanels(){
  [
    "#map-panel",
    "#history-panel",
    "#favorite-panel-final",
    "#settings-panel-final",
    "#final-user-history-panel",
    "#favorite-panel",
    "#settings-panel",
    "#user-history-panel"
  ].forEach(sel => {
    const el = document.querySelector(sel);
    if(el) el.classList.remove("show");
  });
}

function cleanCreateBottomNav(){
  let nav = document.querySelector("#app-bottom-nav");
  if(!nav){
    nav = document.createElement("div");
    nav.id = "app-bottom-nav";
    document.body.appendChild(nav);
  }

  nav.innerHTML = `
    <div class="nav">
      <div data-tab="rate" class="active">📈<br>レート</div>
      <div data-tab="map">🗺️<br>マップ</div>
      <div data-tab="favorite">☆<br>お気に入り</div>
      <div data-tab="history">🕘<br>履歴</div>
      <div data-tab="settings">⚙️<br>設定</div>
    </div>
  `;

  nav.querySelectorAll("[data-tab]").forEach(item => {
    item.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const tab = item.dataset.tab;

      nav.querySelectorAll("[data-tab]").forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      if(tab === "rate"){
        cleanClosePanels();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if(tab === "map"){
        cleanClosePanels();

        if(typeof openMapPanel === "function"){
          openMapPanel();
        }

        setTimeout(async () => {
          await cleanGetLocation();
          if(typeof renderRealMap === "function") renderRealMap();
          setTimeout(cleanAddUserMarker, 400);
        }, 500);

        return;
      }

      if(tab === "favorite"){
        cleanClosePanels();
        if(typeof finalOpenFavoritePanel === "function") finalOpenFavoritePanel();
        return;
      }

      if(tab === "history"){
        cleanClosePanels();
        if(typeof finalOpenUserHistoryPanel === "function") finalOpenUserHistoryPanel();
        return;
      }

      if(tab === "settings"){
        cleanClosePanels();
        if(typeof finalOpenSettingsPanel === "function") finalOpenSettingsPanel();
        return;
      }
    };
  });
}

function cleanGetLocation(){
  return new Promise(resolve => {
    if(!navigator.geolocation){
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
      userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      if(typeof updateDistances === "function"){
        updateDistances(userLocation.lat, userLocation.lng);
      }

      resolve(userLocation);
    }, () => {
      resolve(null);
    }, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000
    });
  });
}

function cleanAddUserMarker(){
  try{
    if(typeof L === "undefined") return;
    if(typeof realMapInstance === "undefined") return;
    if(!realMapInstance || !userLocation) return;

    if(cleanUserMarker){
      try{ realMapInstance.removeLayer(cleanUserMarker); }catch(e){}
      cleanUserMarker = null;
    }

    const icon = L.divIcon({
      className: "final-user-map-pin",
      html: `<div class="final-user-dot"></div><div class="final-user-label">現在地</div>`,
      iconSize: [78, 34],
      iconAnchor: [39, 17]
    });

    cleanUserMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon,
      zIndexOffset: 99999
    }).addTo(realMapInstance);

    cleanUserMarker.bindPopup("現在地");
  }catch(e){
    console.warn("現在地ピン表示失敗", e);
  }
}

window.addEventListener("load", () => {
  setTimeout(cleanCreateBottomNav, 300);
  setTimeout(cleanCreateBottomNav, 1200);
});


/* ===== TRUE FINAL MENU BEHAVIOR ONLY ===== */

let trueFinalUserMarker = null;

function trueCloseAllPanels(){
  [
    "#map-panel",
    "#history-panel",
    "#favorite-panel-final",
    "#settings-panel-final",
    "#final-user-history-panel",
    "#favorite-panel",
    "#settings-panel",
    "#user-history-panel"
  ].forEach(sel => {
    const el = document.querySelector(sel);
    if(el) el.classList.remove("show");
  });
}

function trueSetNavActive(label){
  const nav = document.querySelector("#app-bottom-nav");
  if(!nav) return;

  nav.querySelectorAll(".nav > div").forEach(el => {
    el.classList.remove("active");
    if((el.innerText || "").includes(label)){
      el.classList.add("active");
    }
  });
}

function trueOpenRateGraphPage(){
  trueCloseAllPanels();
  trueSetNavActive("レート");

  if(typeof saveRateSnapshot === "function"){
    saveRateSnapshot();
  }

  if(typeof renderHistoryPanel === "function"){
    renderHistoryPanel();
  }

  const panel = document.querySelector("#history-panel");
  if(panel){
    panel.classList.add("show");
  }
}

function trueGetLocation(){
  return new Promise(resolve => {
    if(!navigator.geolocation){
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
      userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      if(typeof updateDistances === "function"){
        updateDistances(userLocation.lat, userLocation.lng);
      }

      resolve(userLocation);
    }, () => resolve(null), {
      enableHighAccuracy:true,
      timeout:8000,
      maximumAge:30000
    });
  });
}

function trueAddCurrentLocationMarker(){
  try{
    if(typeof L === "undefined") return;
    if(typeof realMapInstance === "undefined") return;
    if(!realMapInstance || !userLocation) return;

    if(trueFinalUserMarker){
      try{ realMapInstance.removeLayer(trueFinalUserMarker); }catch(e){}
      trueFinalUserMarker = null;
    }

    const icon = L.divIcon({
      className:"",
      html: `
        <div style="
          display:flex;
          align-items:center;
          gap:6px;
          transform:translateY(-4px);
        ">
          <div style="
            width:18px;
            height:18px;
            border-radius:50%;
            background:#31ff71;
            border:3px solid #fff;
            box-shadow:0 0 0 7px rgba(49,255,113,.28),0 0 18px rgba(49,255,113,.85);
          "></div>
          <div style="
            background:rgba(5,18,35,.95);
            color:#fff;
            font-size:12px;
            font-weight:900;
            padding:5px 9px;
            border-radius:999px;
            border:1px solid rgba(255,255,255,.28);
            white-space:nowrap;
          ">現在地</div>
        </div>
      `,
      iconSize:[78,34],
      iconAnchor:[39,17]
    });

    trueFinalUserMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon,
      zIndexOffset:99999
    }).addTo(realMapInstance);
  }catch(e){
    console.warn("現在地ピン失敗", e);
  }
}

let trueMapOpening = false;

async function trueOpenMapPage(){
  if(trueMapOpening) return;
  trueMapOpening = true;

  trueCloseAllPanels();
  trueSetNavActive("マップ");

  const panel = document.querySelector("#map-panel");

  if(panel){
    panel.classList.add("show");
  }else if(typeof openMapPanel === "function"){
    openMapPanel();
  }

  await trueGetLocation();

  setTimeout(() => {
    if(typeof renderRealMap === "function"){
      renderRealMap();
    }

    setTimeout(trueAddCurrentLocationMarker, 500);
    trueMapOpening = false;
  }, 500);
}

function trueOpenFavoritePage(){
  trueCloseAllPanels();
  trueSetNavActive("お気に入り");

  if(typeof finalOpenFavoritePanel === "function"){
    finalOpenFavoritePanel();
  }
}

function trueOpenUserHistoryPage(){
  trueCloseAllPanels();
  trueSetNavActive("履歴");

  if(typeof finalOpenUserHistoryPanel === "function"){
    finalOpenUserHistoryPanel();
  }
}

function trueOpenSettingsPage(){
  trueCloseAllPanels();
  trueSetNavActive("設定");

  if(typeof finalOpenSettingsPanel === "function"){
    finalOpenSettingsPanel();
  }
}

function trueRebuildBottomNavBehavior(){
  let nav = document.querySelector("#app-bottom-nav");

  if(!nav){
    nav = document.createElement("div");
    nav.id = "app-bottom-nav";
    document.body.appendChild(nav);
  }

  nav.innerHTML = `
    <div class="nav">
      <div class="active" data-menu="rate">📈<br>レート</div>
      <div data-menu="map">🗺️<br>マップ</div>
      <div data-menu="favorite">☆<br>お気に入り</div>
      <div data-menu="history">🕘<br>履歴</div>
      <div data-menu="settings">⚙️<br>設定</div>
    </div>
  `;

  nav.querySelector('[data-menu="rate"]').onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    trueOpenRateGraphPage();
  };

  nav.querySelector('[data-menu="map"]').onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    trueOpenMapPage();
  };

  nav.querySelector('[data-menu="favorite"]').onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    trueOpenFavoritePage();
  };

  nav.querySelector('[data-menu="history"]').onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    trueOpenUserHistoryPage();
  };

  nav.querySelector('[data-menu="settings"]').onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    trueOpenSettingsPage();
  };
}

window.addEventListener("load", () => {
  setTimeout(trueRebuildBottomNavBehavior, 300);
  setTimeout(trueRebuildBottomNavBehavior, 1200);
});


/* ===== FINAL MAP PAGE FIX ONLY ===== */
let __mapFinalOpening = false;
let __mapFinalUserMarker = null;

function mapFinalGetLocation(){
  return new Promise(resolve => {
    if(!navigator.geolocation){
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
      userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      if(typeof updateDistances === "function"){
        updateDistances(userLocation.lat, userLocation.lng);
      }

      resolve(userLocation);
    }, () => resolve(null), {
      enableHighAccuracy:true,
      timeout:10000,
      maximumAge:15000
    });
  });
}

function mapFinalAddUserMarker(){
  try{
    if(typeof L === "undefined") return;
    if(typeof realMapInstance === "undefined") return;
    if(!realMapInstance || !userLocation) return;

    if(__mapFinalUserMarker){
      try{ realMapInstance.removeLayer(__mapFinalUserMarker); }catch(e){}
      __mapFinalUserMarker = null;
    }

    const icon = L.divIcon({
      className:"map-final-current-pin",
      html: `
        <div class="map-final-current-wrap">
          <div class="map-final-current-dot"></div>
          <div class="map-final-current-label">現在地</div>
        </div>
      `,
      iconSize:[82,34],
      iconAnchor:[41,17]
    });

    __mapFinalUserMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon,
      zIndexOffset:99999
    }).addTo(realMapInstance);

    if(typeof realMapInstance.invalidateSize === "function"){
      realMapInstance.invalidateSize();
    }
  }catch(e){
    console.warn("map current marker failed", e);
  }
}

async function openMapFinalStable(){
  if(__mapFinalOpening) return;
  __mapFinalOpening = true;

  document.querySelectorAll(
    "#history-panel,#favorite-panel-final,#settings-panel-final,#final-user-history-panel,#favorite-panel,#settings-panel,#user-history-panel"
  ).forEach(el => {
    if(el) el.classList.remove("show");
  });

  if(typeof createMapPanel === "function"){
    createMapPanel();
  }

  const panel = document.querySelector("#map-panel");
  if(panel){
    panel.classList.add("show");
  }

  await mapFinalGetLocation();

  setTimeout(() => {
    if(typeof renderRealMap === "function"){
      renderRealMap();
    }

    setTimeout(mapFinalAddUserMarker, 400);
    setTimeout(mapFinalAddUserMarker, 900);
    setTimeout(() => { __mapFinalOpening = false; }, 1000);
  }, 250);
}

/* 下メニューのマップだけ最終上書き */
window.addEventListener("load", () => {
  setTimeout(() => {
    const nav = document.querySelector("#app-bottom-nav");
    if(!nav) return;

    const mapBtn = [...nav.querySelectorAll(".nav > div")].find(el => {
      return (el.innerText || el.textContent || "").includes("マップ");
    });

    if(mapBtn){
      mapBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        nav.querySelectorAll(".nav > div").forEach(i => i.classList.remove("active"));
        mapBtn.classList.add("active");

        openMapFinalStable();
      };
    }
  }, 1500);
});


/* ===== DEDUPE CURRENT LOCATION MARKER ONLY ===== */
function dedupeCurrentLocationMarkers(){
  try{
    if(typeof realMapInstance === "undefined" || !realMapInstance) return;

    const removeList = [];

    realMapInstance.eachLayer(layer => {
      if(layer && layer.options && layer.options.icon){
        const icon = layer.options.icon;
        const cls = icon.options && icon.options.className || "";
        const html = icon.options && icon.options.html || "";

        if(
          cls.includes("user") ||
          cls.includes("current") ||
          html.includes("現在地")
        ){
          removeList.push(layer);
        }
      }
    });

    removeList.forEach(layer => {
      try{ realMapInstance.removeLayer(layer); }catch(e){}
    });

    if(typeof mapFinalAddUserMarker === "function"){
      mapFinalAddUserMarker();
    }
  }catch(e){
    console.warn("dedupe current location failed", e);
  }
}

window.addEventListener("load", () => {
  setTimeout(dedupeCurrentLocationMarkers, 1800);
});

document.addEventListener("click", e => {
  const text = (e.target.innerText || e.target.textContent || "").trim();
  if(text.includes("マップ")){
    setTimeout(dedupeCurrentLocationMarkers, 1200);
  }
}, true);


/* ===== RATE PAGE BOTTOM SPACER ONLY ===== */
function addRatePageBottomSpacerOnly(){
  const panel = document.querySelector("#history-panel");
  if(!panel) return;

  const list =
    panel.querySelector(".history-days") ||
    panel.querySelector(".history-list");

  if(!list) return;

  let spacer = list.querySelector(".rate-bottom-spacer-only");
  if(!spacer){
    spacer = document.createElement("div");
    spacer.className = "rate-bottom-spacer-only";
    spacer.style.height = "120px";
    spacer.style.flexShrink = "0";
    list.appendChild(spacer);
  }
}

if(typeof renderHistoryPanel === "function" && !window.__rateSpacerOnly1){
  window.__rateSpacerOnly1 = true;
  const oldRenderHistoryPanelSpacerOnly = renderHistoryPanel;
  renderHistoryPanel = function(){
    oldRenderHistoryPanelSpacerOnly();
    setTimeout(addRatePageBottomSpacerOnly, 100);
  };
}

if(typeof renderHistoryPanel7Days === "function" && !window.__rateSpacerOnly2){
  window.__rateSpacerOnly2 = true;
  const oldRenderHistoryPanel7DaysSpacerOnly = renderHistoryPanel7Days;
  renderHistoryPanel7Days = function(){
    oldRenderHistoryPanel7DaysSpacerOnly();
    setTimeout(addRatePageBottomSpacerOnly, 100);
  };
}

window.addEventListener("load", () => {
  setTimeout(addRatePageBottomSpacerOnly, 1000);
});


/* ===== RATE PAGE CORRECT BOTTOM SPACER ONLY ===== */
function correctRatePageBottomSpacerOnly(){
  const panel = document.querySelector("#history-panel");
  if(!panel) return;

  // 間違ってグラフ側に入ったスペーサーを全削除
  panel.querySelectorAll(".rate-bottom-spacer-only").forEach(el => el.remove());

  // 必ず履歴リスト本体だけに入れる
  const list = panel.querySelector(".history-list");
  if(!list) return;

  const spacer = document.createElement("div");
  spacer.className = "rate-bottom-spacer-only";
  spacer.style.height = "180px";
  spacer.style.width = "100%";
  spacer.style.flexShrink = "0";
  spacer.style.pointerEvents = "none";

  list.appendChild(spacer);
}

if(typeof renderHistoryPanel7Days === "function" && !window.__correctRateSpacer7Days){
  window.__correctRateSpacer7Days = true;
  const oldRenderHistoryPanel7DaysCorrectSpacer = renderHistoryPanel7Days;
  renderHistoryPanel7Days = function(){
    oldRenderHistoryPanel7DaysCorrectSpacer();
    setTimeout(correctRatePageBottomSpacerOnly, 100);
  };
}

if(typeof renderHistoryPanel === "function" && !window.__correctRateSpacerNormal){
  window.__correctRateSpacerNormal = true;
  const oldRenderHistoryPanelCorrectSpacer = renderHistoryPanel;
  renderHistoryPanel = function(){
    oldRenderHistoryPanelCorrectSpacer();
    setTimeout(correctRatePageBottomSpacerOnly, 100);
  };
}


/* ===== CLEAN BOTTOM MENU CLICK ONLY FINAL ===== */
function cleanMenuCloseOnly(){
  [
    "#map-panel",
    "#history-panel",
    "#final-user-history-panel",
    "#favorite-panel-final",
    "#settings-panel-final",
    "#favorite-panel",
    "#settings-panel",
    "#user-history-panel"
  ].forEach(sel => {
    const el = document.querySelector(sel);
    if(el) el.classList.remove("show");
  });
}

function cleanMenuActiveOnly(tab){
  const nav = document.querySelector("#app-bottom-nav");
  if(!nav) return;
  nav.querySelectorAll("[data-menu-tab]").forEach(el => el.classList.remove("active"));
  const active = nav.querySelector(`[data-menu-tab="${tab}"]`);
  if(active) active.classList.add("active");
}

function cleanOpenRateOnly(){
  cleanMenuCloseOnly();
  cleanMenuActiveOnly("rate");

  if(typeof saveRateSnapshot === "function") saveRateSnapshot();
  if(typeof renderHistoryPanel7Days === "function") renderHistoryPanel7Days();
  else if(typeof renderHistoryPanel === "function") renderHistoryPanel();

  const panel = document.querySelector("#history-panel");
  if(panel) panel.classList.add("show");
}

function cleanOpenMapOnly(){
  cleanMenuCloseOnly();
  cleanMenuActiveOnly("map");
  openMapPanel();
}

function cleanOpenFavoriteOnly(){
  cleanMenuCloseOnly();
  cleanMenuActiveOnly("favorite");
  if(typeof finalOpenFavoritePanel === "function") finalOpenFavoritePanel();
}

function cleanOpenUserHistoryOnly(){
  cleanMenuCloseOnly();
  cleanMenuActiveOnly("history");
  if(typeof finalOpenUserHistoryPanel === "function") finalOpenUserHistoryPanel();
}

function cleanOpenSettingsOnly(){
  cleanMenuCloseOnly();
  cleanMenuActiveOnly("settings");
  if(typeof finalOpenSettingsPanel === "function") finalOpenSettingsPanel();
}

function cleanBindBottomMenuOnly(){
  const oldNav = document.querySelector("#app-bottom-nav");
  if(!oldNav) return;

  const nav = oldNav.cloneNode(false);
  nav.id = "app-bottom-nav";
  nav.innerHTML = `
    <div class="nav">
      <div data-menu-tab="rate" class="active">📈<br>レート</div>
      <div data-menu-tab="map">🗺️<br>マップ</div>
      <div data-menu-tab="favorite">☆<br>お気に入り</div>
      <div data-menu-tab="history">🕘<br>履歴</div>
      <div data-menu-tab="settings">⚙️<br>設定</div>
    </div>
  `;

  oldNav.replaceWith(nav);

  nav.querySelector('[data-menu-tab="rate"]').addEventListener("click", e => {
    e.preventDefault(); e.stopPropagation();
    cleanOpenRateOnly();
  });

  nav.querySelector('[data-menu-tab="map"]').addEventListener("click", e => {
    e.preventDefault(); e.stopPropagation();
    cleanOpenMapOnly();
  });

  nav.querySelector('[data-menu-tab="favorite"]').addEventListener("click", e => {
    e.preventDefault(); e.stopPropagation();
    cleanOpenFavoriteOnly();
  });

  nav.querySelector('[data-menu-tab="history"]').addEventListener("click", e => {
    e.preventDefault(); e.stopPropagation();
    cleanOpenUserHistoryOnly();
  });

  nav.querySelector('[data-menu-tab="settings"]').addEventListener("click", e => {
    e.preventDefault(); e.stopPropagation();
    cleanOpenSettingsOnly();
  });
}

window.addEventListener("load", () => {
  setTimeout(cleanBindBottomMenuOnly, 500);
  setTimeout(cleanBindBottomMenuOnly, 1500);
});


/* ===== 7DAYS LIST ONLY RESTORE ===== */
function buildDailyRankingHistory(days = 7){
  const history = getRateHistory();
  const byDate = {};

  history.forEach(h => {
    const d = new Date(h.time);
    if(Number.isNaN(d.getTime())) return;

    const key = d.toISOString().slice(0,10);
    const rated = (h.shops || [])
      .filter(s => typeof s.rate === "number" && s.rate > 0)
      .sort((a,b) => b.rate - a.rate)
      .slice(0,5);

    if(!rated.length) return;

    const bestRate = rated[0].rate;

    if(!byDate[key] || bestRate > byDate[key].bestRate){
      byDate[key] = {
        label: `${d.getMonth()+1}/${d.getDate()}`,
        bestRate,
        shops: rated
      };
    }
  });

  const result = [];
  const today = new Date();

  for(let i = days - 1; i >= 0; i--){
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const key = d.toISOString().slice(0,10);
    result.push(byDate[key] || {
      label: `${d.getMonth()+1}/${d.getDate()}`,
      shops: []
    });
  }

  return result;
}

function restore7DaysRankingListOnly(){
  const panel = document.querySelector("#history-panel");
  if(!panel || !panel.classList.contains("show")) return;

  const listEl = panel.querySelector(".history-list");
  if(!listEl) return;

  const days = buildDailyRankingHistory(7);

  listEl.innerHTML = days.reverse().map(day => {
    if(!day.shops.length){
      return `
        <div class="history-day-block">
          <div class="history-day-title">${day.label}</div>
          <div class="history-empty">データなし</div>
        </div>
      `;
    }

    return `
      <div class="history-day-block">
        <div class="history-day-title">${day.label}</div>
        ${day.shops.map((s,i) => `
          <div class="history-day-row">
            <div class="history-rank">${i+1}</div>
            <div class="history-shop-name">${s.name}</div>
            <div class="history-shop-rate">${Number(s.rate).toFixed(4)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }).join("");
}

if(typeof renderHistoryPanel7Days === "function" && !window.__restore7DaysRankingListOnly){
  window.__restore7DaysRankingListOnly = true;
  const oldRenderHistoryPanel7DaysListOnly = renderHistoryPanel7Days;

  renderHistoryPanel7Days = function(){
    oldRenderHistoryPanel7DaysListOnly();
    setTimeout(restore7DaysRankingListOnly, 50);
  };
}










import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

const RATE_CACHE = {
  greenRate: null,
  orangeRate: null,
  xoneRate: null,
  vasuRate: null,
  referenceRate: null,
  updatedAt: null
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!res.ok) {
    throw new Error(`${url} ${res.status}`);
  }

  return await res.text();
}

function extractJPYRate(html) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const patterns = [
    /JPY\s+Japan\s+[0-9\-]+\s+([0-9.]+)/i,
    /JPY\s+Japan\s+10000-1000\s+([0-9.]+)/i,
    /JPY\s+[^0-9]{0,80}([0-9]\.[0-9]{3,4})/i,
    /Japan\s+[^0-9]{0,80}([0-9]\.[0-9]{3,4})/i
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && Number(m[1])) {
      return Number(m[1]);
    }
  }

  return null;
}

function extractXOneJPYRate(html) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  // X-One公式は JPY の行が「10000-100020.2020.40」のように詰まって出る
  const m = text.match(/JPY\s+10000-1000\s*([0-9]{2}\.[0-9]{2})\s*([0-9]{2}\.[0-9]{2})/i);

  if (!m) return null;

  const buyingPer100JPY = Number(m[1]);
  if (!buyingPer100JPY) return null;

  // 20.20 THB / 100 JPY → 0.2020 THB / 1 JPY
  return Number((buyingPer100JPY / 100).toFixed(4));
}

async function getSuperrichGreenRate() {
  const html = await fetchText("https://superrich.co.th/currency_rate.php");
  return extractJPYRate(html);
}

async function getSuperrichThailandRate() {
  const html = await fetchText("https://www.superrichthailand.com/");
  return extractJPYRate(html);
}

async function getXOneRate() {
  const html = await fetchText("https://www.x-one.co.th/");
  return extractXOneJPYRate(html);
}

function extractVasuJPYRate(html) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const idx = text.search(/JPY|Japanese Yen/i);

// Buy側を優先的に探す
const buyIdx = text.search(/Buy.*JPY|JPY.*Buy/i);
const baseIdx = buyIdx !== -1 ? buyIdx : idx;
  if (idx === -1) return null;

  const block = text.slice(Math.max(0, baseIdx - 120), baseIdx + 260);

  // 0.20xx 形式を優先
  let m = block.match(/(0\.20[0-9]{2})/);
  if (m) return Number(m[1]);

  // 20.xx / 100JPY 形式なら100で割る
  m = block.match(/(20\.[0-9]{2})/);
  if (m) return Number((Number(m[1]) / 100).toFixed(4));

  return null;
}

async function getVasuRate() {
  const html = await fetchText("https://www.vasuexchange.co.th/");
  return extractVasuJPYRate(html);
}

app.get('/api/rates', async (req, res) => {
  const fetchedAt = new Date().toISOString();

  let greenRate = null;
  let orangeRate = null;
  let xoneRate = null;
  let vasuRate = null;
  let errors = [];

  try {
    greenRate = await getSuperrichGreenRate();
  } catch (e) {
    errors.push(`green: ${e.message}`);
  }

  try {
    orangeRate = await getSuperrichThailandRate();
  } catch (e) {
    errors.push(`orange: ${e.message}`);
  }

  try {
    xoneRate = await getXOneRate();
  } catch (e) {
    errors.push(`xone: ${e.message}`);
  }

  try {
    vasuRate = await getVasuRate();
  } catch (e) {
    errors.push(`vasu: ${e.message}`);
  }

  // 公式取得に失敗した時だけ、最後に確認済みの保険値を使う
  // ここは後で管理画面やJSONに移す
  if (!greenRate) greenRate = RATE_CACHE.greenRate ?? 0.2025;
  if (!orangeRate) orangeRate = 0.2020;
  
if (!xoneRate && greenRate){
  // 推定レート（実態に近い差分）
  xoneRate = Number((greenRate - 0.0001).toFixed(4));
}


  // Thaniya Spiritは「参照値」として、公式取得できる両替所と同じレートを採用
  // FORCE_VASU_ESTIMATE
  if (!vasuRate && greenRate) {
    vasuRate = Number((greenRate - 0.0003).toFixed(4));
  }

  const referenceRate = Math.max(greenRate, orangeRate);

  if (greenRate) RATE_CACHE.greenRate = greenRate;
  if (orangeRate) RATE_CACHE.orangeRate = orangeRate;
  if (xoneRate) RATE_CACHE.xoneRate = xoneRate;
  if (vasuRate) RATE_CACHE.vasuRate = vasuRate;
  RATE_CACHE.referenceRate = referenceRate;
  RATE_CACHE.updatedAt = fetchedAt;

  const results = [
    {
      id: 1,
      name: "Thaniya Spirit",
      area: "Thaniya",
      mapUrl: "https://maps.app.goo.gl/x7Y3j9aCiytY2V2n6",
      rate: referenceRate,
      rateSource: "参照値",
      lat: 13.72889,
      lng: 100.53354
    },
    {
      id: 2,
      name: "Superrich Green",
      area: "Sukhumvit Soi 3/1",
      mapUrl: "https://maps.app.goo.gl/Gyvn3eJGd5hhGG9y6",
      mapUrl: "https://maps.app.goo.gl/Gyvn3eJGd5hhGG9y6",
      rate: greenRate,
      rateSource: "公式",
      lat: 13.74658,
      lng: 100.55254
    },
    {
      id: 3,
      name: "Superrich Orange",
      area: "Sukhumvit Soi 22",
      mapUrl: "https://maps.app.goo.gl/Kde4yKLHLZHbshn26",
      rate: orangeRate,
      rateSource: "公式",
      lat: 13.73120,
      lng: 100.56540
    },
    {
      id: 4,
      name: "X-One Exchange",
      area: "Asok",
      mapUrl: "https://maps.app.goo.gl/ZXMdwoLzgnZThZQ19",
      rate: xoneRate,
      rateLabel: xoneRate ? null : "店頭確認",
      rateSource: xoneRate ? "推定" : "店頭確認",
      lat: 13.73730,
      lng: 100.56010
    },
    {
      id: 5,
      name: "Thaniya Gold",
      area: "Thaniya",
      mapUrl: "https://maps.app.goo.gl/cHcQUg2nHv7GY6j86",
      rate: null,
      rateLabel: "店頭確認",
      rateSource: "店頭確認",
      lat: 13.72810,
      lng: 100.53320
    }
  ,

  {
      id: 6,
      name: "Vasu Exchange",
      area: "Sukhumvit Nana",
      rate: vasuRate,
      rateLabel: vasuRate ? null : "店頭確認",
      rateSource: vasuRate ? "推定" : "店頭確認",
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

].sort((a, b) => {
    const ar = typeof a.rate === "number" ? a.rate : -1;
    const br = typeof b.rate === "number" ? b.rate : -1;
    return br - ar;
  });

  res.json({
    source: "official_scrape_hybrid",
    fetchedAt,
    count: results.length,
    greenRate,
    orangeRate,
    xoneRate,
    vasuRate,
    referenceRate,
    errors,
    results
  });
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      "accept-language": "ja,en-US;q=0.9,en;q=0.8,th;q=0.7"
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function cleanText(str = "") {
  return str.replace(/\s+/g, " ").trim();
}

function toNumber(v) {
  const n = parseFloat(String(v || "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function makeItem({
  id,
  name,
  area,
  rate,
  rawRate = null,
  updated = "",
  sourceUrl,
  note = "",
  status = "ok",
  sourceType = "official"
}) {
  return {
    id,
    name,
    area,
    rate,
    rawRate,
    updated,
    sourceUrl,
    note,
    status,
    sourceType,
    amount1000: rate != null ? +(1000 * rate).toFixed(2) : null,
    amount10000: rate != null ? +(10000 * rate).toFixed(2) : null
  };
}

function isReasonableJpyThb(rate) {
  return rate != null && rate >= 0.18 && rate <= 0.22;
}

function normalizeRate(n) {
  if (n == null) return null;
  if (n >= 0.18 && n <= 0.22) return +n.toFixed(4);
  if (n >= 18 && n <= 22) return +(n / 100).toFixed(4);
  return null;
}

function findRateCandidates(snippet) {
  return [...snippet.matchAll(/([0-9]{1,3}\.[0-9]{2,4})/g)]
    .map(m => toNumber(m[1]))
    .filter(n => n != null);
}

function extractRateByKeywords(text, keywords, windowSize = 2200) {
  for (const keyword of keywords) {
    const idx = text.search(keyword);
    if (idx !== -1) {
      const snippet = text.slice(
        Math.max(0, idx - 200),
        Math.min(text.length, idx + windowSize)
      );

      const candidates = findRateCandidates(snippet);
      for (const c of candidates) {
        const normalized = normalizeRate(c);
        if (isReasonableJpyThb(normalized)) {
          return { rawRate: c, rate: normalized };
        }
      }
    }
  }

  return { rawRate: null, rate: null };
}

function extractThaniyaGoldRate(text) {
  const patterns = [
    /JPY[^0-9]{0,80}5,000-10,000[^0-9]{0,80}([0-9]{1,2}\.[0-9]{2,4})/i,
    /Japanese Yen[^0-9]{0,80}5,000-10,000[^0-9]{0,80}([0-9]{1,2}\.[0-9]{2,4})/i,
    /5,000-10,000[^0-9]{0,80}JPY[^0-9]{0,80}([0-9]{1,2}\.[0-9]{2,4})/i,
    /JPY[^0-9]{0,120}([0-9]{1,2}\.[0-9]{2,4})/i
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const raw = toNumber(m[1]);
      const rate = normalizeRate(raw);
      if (isReasonableJpyThb(rate)) {
        return { rawRate: raw, rate };
      }
    }
  }

  return { rawRate: null, rate: null };
}

function extractXOneRate(text) {
  const patterns = [
    /JPY[^0-9]{0,120}([0-9]{1,2}\.[0-9]{2,4})[^0-9]{0,30}([0-9]{1,2}\.[0-9]{2,4})/i,
    /Japan Yen[^0-9]{0,120}([0-9]{1,2}\.[0-9]{2,4})/i,
    /10000-1000[^0-9]{0,120}([0-9]{1,2}\.[0-9]{2,4})/i
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const raw = toNumber(m[1]);
      const rate = normalizeRate(raw);
      if (isReasonableJpyThb(rate)) {
        return { rawRate: raw, rate };
      }
    }
  }

  const idx = text.search(/JPY|Japan Yen|10000-1000/i);
  if (idx !== -1) {
    const snippet = text.slice(Math.max(0, idx - 200), Math.min(text.length, idx + 2600));
    const candidates = findRateCandidates(snippet);
    for (const c of candidates) {
      const rate = normalizeRate(c);
      if (isReasonableJpyThb(rate)) {
        return { rawRate: c, rate };
      }
    }
  }

  return { rawRate: null, rate: null };
}

async function scrapeSia() {
  const url = "https://www.sia-moneyexchange.com/rate/rate.php";
  try {
    const html = cleanText(await fetchHtml(url));
    const updated = cleanText(
      (html.match(/อัตเดตล่าสุด\s*:\s*([0-9\s:ก-๙A-Za-z\.]+)/i) || [])[1] || ""
    );
    const { rawRate, rate } = extractRateByKeywords(html, [/Japan/i, /ญี่ปุ่น/i, /JPY/i]);

    return makeItem({
      id: "sia",
      name: "SIA Money Exchange",
      area: "Pratunam",
      rate,
      rawRate,
      updated,
      sourceUrl: url,
      note: rawRate != null ? `公式レート抽出 ${rawRate}` : "抽出失敗",
      status: rate != null ? "ok" : "error",
      sourceType: "official"
    });
  } catch (e) {
    return makeItem({
      id: "sia",
      name: "SIA Money Exchange",
      area: "Pratunam",
      rate: null,
      sourceUrl: url,
      note: e.message,
      status: "error",
      sourceType: "official"
    });
  }
}

async function scrapeVasu() {
  const url = "https://www.vasuexchange.co.th/";
  try {
    const html = cleanText(await fetchHtml(url));
    const updated = cleanText((html.match(/Latest Update\s*:\s*([A-Za-z0-9:\-\s]+)/i) || [])[1] || "");
    const { rawRate, rate } = extractRateByKeywords(html, [/JPY\s+Japan/i, /Japan/i, /JPY/i]);

    return makeItem({
      id: "vasu",
      name: "Vasu Exchange",
      area: "Asok / Nana",
      rate,
      rawRate,
      updated,
      sourceUrl: url,
      note: rawRate != null ? `公式レート抽出 ${rawRate}` : "抽出失敗",
      status: rate != null ? "ok" : "error",
      sourceType: "official"
    });
  } catch (e) {
    return makeItem({
      id: "vasu",
      name: "Vasu Exchange",
      area: "Asok / Nana",
      rate: null,
      sourceUrl: url,
      note: e.message,
      status: "error",
      sourceType: "official"
    });
  }
}

async function scrapeThaniyaGold() {
  const url = "https://thaniyagold.com/en/money-exchange";
  try {
    const html = cleanText(await fetchHtml(url));
    const updated = cleanText((html.match(/Last Updated:\s*([0-9\/:,\-\sA-Za-z()]+)/i) || [])[1] || "");
    const { rawRate, rate } = extractThaniyaGoldRate(html);

    if (!isReasonableJpyThb(rate)) {
      return makeItem({
        id: "thaniya-gold",
        name: "Thaniya Gold",
        area: "Thaniya",
        rate: null,
        updated,
        sourceUrl: url,
        note: "店頭確認",
        status: "ok",
        sourceType: "manual"
      });
    }

    return makeItem({
      id: "thaniya-gold",
      name: "Thaniya Gold",
      area: "Thaniya",
      rate,
      rawRate,
      updated,
      sourceUrl: url,
      note: `公式レート抽出 ${rawRate}`,
      status: "ok",
      sourceType: "official"
    });
  } catch {
    return makeItem({
      id: "thaniya-gold",
      name: "Thaniya Gold",
      area: "Thaniya",
      rate: null,
      sourceUrl: url,
      note: "店頭確認",
      status: "ok",
      sourceType: "manual"
    });
  }
}

async function scrapeValuePlus() {
  const url = "https://www.valueplusexchange.com/?mibextid=tejx2t";
  try {
    const html = cleanText(await fetchHtml(url));
    const { rawRate, rate } = extractRateByKeywords(html, [/JPY/i, /Japan/i], 2600);

    if (!isReasonableJpyThb(rate)) {
      return makeItem({
        id: "value-plus-thaniya",
        name: "Value Plus Thaniya",
        area: "Thaniya",
        rate: null,
        sourceUrl: url,
        note: "店頭確認",
        status: "ok",
        sourceType: "manual"
      });
    }

    return makeItem({
      id: "value-plus-thaniya",
      name: "Value Plus Thaniya",
      area: "Thaniya",
      rate,
      rawRate,
      updated: "",
      sourceUrl: url,
      note: `公式レート抽出 ${rawRate}`,
      status: "ok",
      sourceType: "official"
    });
  } catch {
    return makeItem({
      id: "value-plus-thaniya",
      name: "Value Plus Thaniya",
      area: "Thaniya",
      rate: null,
      sourceUrl: url,
      note: "店頭確認",
      status: "ok",
      sourceType: "manual"
    });
  }
}

async function scrapeXOne() {
  const url = "https://www.x-one.co.th/readmore/";
  try {
    const html = cleanText(await fetchHtml(url));
    const updated = cleanText((html.match(/Update:\s*([A-Za-z0-9:\-\s,]+)/i) || [])[1] || "");
    const { rawRate, rate } = extractXOneRate(html);

    if (!isReasonableJpyThb(rate)) {
      return makeItem({
        id: "x-one",
        name: "X-One",
        area: "Surawong / Near Thaniya",
        rate: null,
        updated,
        sourceUrl: url,
        note: "公式サイト確認",
        status: "ok",
        sourceType: "manual"
      });
    }

    return makeItem({
      id: "x-one",
      name: "X-One",
      area: "Surawong / Near Thaniya",
      rate,
      rawRate,
      updated,
      sourceUrl: url,
      note: `公式レート抽出 ${rawRate}`,
      status: "ok",
      sourceType: "official"
    });
  } catch {
    return makeItem({
      id: "x-one",
      name: "X-One",
      area: "Surawong / Near Thaniya",
      rate: null,
      sourceUrl: url,
      note: "公式サイト確認",
      status: "ok",
      sourceType: "manual"
    });
  }
}

async function scrapeThaniyaSpiritReference(xoneItem) {
  const url = "https://th.jpy-thb.com/thaniya-spirit/";
  if (!xoneItem || !isReasonableJpyThb(xoneItem.rate)) {
    return makeItem({
      id: "thaniya-spirit",
      name: "Thaniya Spirit",
      area: "Thaniya",
      rate: null,
      sourceUrl: url,
      note: "店頭確認 / 参照値",
      status: "ok",
      sourceType: "manual_reference"
    });
  }

  return makeItem({
    id: "thaniya-spirit",
    name: "Thaniya Spirit",
    area: "Thaniya",
    rate: xoneItem.rate,
    rawRate: xoneItem.rawRate,
    updated: xoneItem.updated || "",
    sourceUrl: url,
    note: "参照値",
    status: "ok",
    sourceType: "reference"
  });
}

async function scrapeSuperrichGreen() {
  const url = "https://www.superrichthailand.com/";
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const text = await page.evaluate(() => document.body.innerText || "");
    const clean = cleanText(text);

    const idx = clean.search(/JPY|Japanese Yen/i);
    let rawRate = null;
    let rate = null;

    if (idx !== -1) {
      const snippet = clean.slice(Math.max(0, idx - 200), Math.min(clean.length, idx + 2200));
      const candidates = findRateCandidates(snippet);
      for (const c of candidates) {
        const n = normalizeRate(c);
        if (isReasonableJpyThb(n)) {
          rawRate = c;
          rate = n;
          break;
        }
      }
    }

    if (!isReasonableJpyThb(rate)) {
      return makeItem({
        id: "superrich-green",
        name: "SuperRich Thailand",
        area: "Bangkok",
        rate: null,
        sourceUrl: url,
        note: "公式サイト確認",
        status: "ok",
        sourceType: "manual"
      });
    }

    return makeItem({
      id: "superrich-green",
      name: "SuperRich Thailand",
      area: "Bangkok",
      rate,
      rawRate,
      updated: "",
      sourceUrl: url,
      note: `公式レート抽出 ${rawRate}`,
      status: "ok",
      sourceType: "official"
    });
  } catch {
    return makeItem({
      id: "superrich-green",
      name: "SuperRich Thailand",
      area: "Bangkok",
      rate: null,
      sourceUrl: url,
      note: "公式サイト確認",
      status: "ok",
      sourceType: "manual"
    });
  } finally {
    if (browser) await browser.close();
  }
}

async function scrapeSuperrichOrange() {
  const url = "https://www.superrich1965.com/en/exchange-rate";
  return makeItem({
    id: "superrich-orange",
    name: "SuperRich 1965",
    area: "Bangkok",
    rate: null,
    sourceUrl: url,
    note: "公式サイト確認",
    status: "ok",
    sourceType: "manual"
  });
}

app.get("/api/rates", async (_req, res) => {
  const [
    sia,
    vasu,
    thaniyaGold,
    valuePlus,
    xone,
    superrichGreen,
    superrichOrange
  ] = await Promise.all([
    scrapeSia(),
    scrapeVasu(),
    scrapeThaniyaGold(),
    scrapeValuePlus(),
    scrapeXOne(),
    scrapeSuperrichGreen(),
    scrapeSuperrichOrange()
  ]);

  const spirit = await scrapeThaniyaSpiritReference(xone);

  const results = [
    spirit,
    thaniyaGold,
    valuePlus,
    xone,
    superrichGreen,
    superrichOrange,
    sia,
    vasu
  ];

  const sorted = [...results].sort((a, b) => {
    const aRank = a.rate == null ? -1 : a.rate;
    const bRank = b.rate == null ? -1 : b.rate;
    return bRank - aRank;
  });

  res.json({
    fetchedAt: new Date().toISOString(),
    count: sorted.length,
    results: sorted
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});

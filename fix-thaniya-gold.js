import fs from "fs";

let code = fs.readFileSync("server.js", "utf8");

const helper = `
function extractThaniyaGoldRate(text) {
  const patterns = [
    /JPY[^0-9]{0,80}5,000-10,000[^0-9]{0,80}([0-9]{1,2}\\.[0-9]{2,4})/i,
    /Japanese Yen[^0-9]{0,80}5,000-10,000[^0-9]{0,80}([0-9]{1,2}\\.[0-9]{2,4})/i,
    /5,000-10,000[^0-9]{0,80}JPY[^0-9]{0,80}([0-9]{1,2}\\.[0-9]{2,4})/i,
    /JPY[^0-9]{0,120}([0-9]{1,2}\\.[0-9]{2,4})/i
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const raw = toNumber(m[1]);
      const rate = normalizeRate(raw);
      if (rate != null) {
        return { rawRate: raw, rate };
      }
    }
  }

  const idx = text.search(/JPY|Japanese Yen/i);
  if (idx !== -1) {
    const snippet = text.slice(Math.max(0, idx - 200), Math.min(text.length, idx + 2500));
    const candidates = [...snippet.matchAll(/([0-9]{1,2}\\.[0-9]{2,4})/g)]
      .map(m => toNumber(m[1]))
      .filter(n => n != null);

    for (const c of candidates) {
      const rate = normalizeRate(c);
      if (rate != null) {
        return { rawRate: c, rate };
      }
    }
  }

  return { rawRate: null, rate: null };
}
`;

if (!code.includes("function extractThaniyaGoldRate(text)")) {
  code = code.replace(
    /function normalizeRate\(n\) \{[\s\S]*?return null;\n\}/,
    (m) => m + "\n\n" + helper.trim()
  );
}

const replacement = `async function scrapeThaniyaGold() {
  const url = "https://thaniyagold.com/en/money-exchange";
  try {
    const html = cleanText(await fetchHtml(url));
    const updated = cleanText((html.match(/Last Updated:\\s*([0-9\\/:,\\-\\sA-Za-z()]+)/i) || [])[1] || "");
    const { rawRate, rate } = extractThaniyaGoldRate(html);

    return makeItem({
      id: "thaniya-gold",
      name: "Thaniya Gold",
      area: "Thaniya",
      rate,
      rawRate,
      updated,
      sourceUrl: url,
      note: rawRate != null ? \`公式レート抽出 \${rawRate}\` : "抽出失敗",
      status: rate != null ? "ok" : "error",
      sourceType: "official"
    });
  } catch (e) {
    return makeItem({
      id: "thaniya-gold",
      name: "Thaniya Gold",
      area: "Thaniya",
      rate: null,
      sourceUrl: url,
      note: e.message,
      status: "error",
      sourceType: "official"
    });
  }
}`;

code = code.replace(
  /async function scrapeThaniyaGold\(\) \{[\s\S]*?\n\}/,
  replacement
);

fs.writeFileSync("server.js", code);
console.log("Thaniya Gold extractor fixed");

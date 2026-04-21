import fs from "fs";

let code = fs.readFileSync("server.js", "utf8");

// normalizeRate 関数を強制的に完全置換
code = code.replace(
/function normalizeRate[\s\S]*?\}/,
`function normalizeRate(n) {
  if (n == null) return null;

  // 正常なJPY→THB範囲
  if (n >= 0.18 && n <= 0.22) {
    return +n.toFixed(4);
  }

  // 100倍ズレ補正（20 → 0.20）
  if (n >= 18 && n <= 22) {
    return +(n / 100).toFixed(4);
  }

  return null;
}`
);

fs.writeFileSync("server.js", code);
console.log("normalizeRate fixed");

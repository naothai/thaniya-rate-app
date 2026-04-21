const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// normalizeRate 関数を完全に置き換える
code = code.replace(
/function normalizeRate[\s\S]*?\}/,
`function normalizeRate(n) {
  if (n == null) return null;

  // 正常範囲だけ許可（超重要）
  if (n >= 0.18 && n <= 0.22) return +n.toFixed(4);

  // 100倍ズレ補正
  if (n >= 18 && n <= 22) return +(n / 100).toFixed(4);

  return null;
}`
);

fs.writeFileSync('server.js', code);
console.log("fix done");

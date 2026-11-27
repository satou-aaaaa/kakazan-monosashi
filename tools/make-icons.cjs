// アプリのアイコン（icon-192.png・icon-512.png）を作る。紺の地に、火山の山と、下に物差しの目盛り（活火山の物差し）。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#123554"/>
      <path d="M12 70 L42 30 Q50 24 58 30 L88 70Z" fill="#c8794a"/><path d="M42 30 Q50 24 58 30 L54 35 L50 32 L46 35Z" fill="#f3efe4"/>
      <rect x="10" y="76" width="80" height="10" rx="2" fill="#f6d77a"/><g stroke="#123554" stroke-width="2"><path d="M26 76 V82"/><path d="M42 76 V82"/><path d="M58 76 V82"/><path d="M74 76 V82"/></g></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();

// 活火山の物差しの問題を作る（ブラウザと node の両方で使う）。
// 活火山の定義は、気象庁「活火山とは」の「概ね過去1万年以内に噴火した火山及び現在活発な噴気活動のある火山」（日本の活火山は111）。
// 火山ごとの噴火の年代は、気象庁「日本活火山総覧（第4版）Web掲載版」と各火山の「有史以降の火山活動」、活火山でない火山は産総研の資料
// （2026-11-27 に読んだ。引用は共有フォルダ games/kakazan-monosashi-research.md）。
// 扱うのは「活火山かどうか」と、1万年の物差しの上の位置だけ。噴火警戒レベル（噴火警戒レベルよみ funka-level）は問わない。
// 1問は、火山の名前と、いちばん新しい噴火の年代（わかっている噴火）を見て「活火山？」を選ぶ（正解したら2段目「1万年の物差しのどこ？」）か、
// 3つの火山のうち「いま」にいちばん近い噴火を選ぶか、活火山の決まりの問いに答える。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KINDS・VOLCS・言い回し・まちがいの選び肢は、足すだけでも過去の日の問題が変わる。公開したあとは変えず、変えるときは qa/run.mjs の PINS を作り直して PR に理由を書く。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const SOURAN = "https://www.data.jma.go.jp/vois/data/filing/souran/main/";

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    toha: ["気象庁「活火山とは」", "https://www.jma.go.jp/jma/kishou/know/kazan/katsukazan_toha/katsukazan_toha.html"],
    press: ["気象庁 報道発表「新たな活火山の選定について」（2017年）", "https://www.jma.go.jp/jma/press/1706/20c/new-volcano170620.html"],
    aist: ["産総研「火山 噴火と恵み」（2005年）", "https://www.gsj.jp/data/pamphlet/kazan_panf_j.pdf"],
    souran: ["気象庁「日本活火山総覧（第4版）Web掲載版」", "https://www.data.jma.go.jp/vois/data/filing/souran/souran_jma_hp.html"],
    sakura: ["気象庁「桜島 有史以降の火山活動」", "https://www.data.jma.go.jp/vois/data/fukuoka/506_Sakurajima/506_history.html"],
    ontake: ["気象庁「御嶽山 有史以降の火山活動」", "https://ds.data.jma.go.jp/svd/vois/data/tokyo/312_Ontakesan/312_history.html"],
    usu: ["気象庁「有珠山 有史以降の火山活動」", "https://www.data.jma.go.jp/vois/data/sapporo/112_Usu/112_history.html"],
    oshima: ["気象庁「伊豆大島 有史以降の火山活動」", "https://www.data.jma.go.jp/vois/data/tokyo/317_Izu-Oshima/317_history.html"],
    kusatsu: ["気象庁「日本活火山総覧 草津白根山（追補版）」", SOURAN + "44_Kusatsu_Shiranesan_tsuihoban.pdf"],
    sanbe: ["気象庁「三瓶山」", "https://www.data.jma.go.jp/vois/data/tokyo/401_Sanbesan/401_index.html"],
    daisen: ["山元孝広「大山火山噴火履歴の再検討」（産総研 地質調査研究報告 2017）", "https://www.gsj.jp/data/bulletin/68_01_01.pdf"],
    nijo: ["産総研 地質調査総合センター「地質情報展 2012 おおさか」", "https://www.gsj.jp/data/gcn/gsj_cn_vol2.no5_129-130.pdf"],
  };
  // 日本活火山総覧（第4版）の火山ごとの PDF（番号_名前.pdf）
  const so = (id, name, file) => (SRC[id] = [`気象庁「日本活火山総覧 ${name}」`, SOURAN + file]);
  so("s_fuji", "富士山", "55_Fujisan.pdf"); so("s_bandai", "磐梯山", "36_Bandaisan.pdf"); so("s_hakusan", "白山", "54_Hakusan.pdf");
  so("s_towada", "十和田", "24_Towada.pdf"); so("s_kaimon", "開聞岳", "92_Kaimondake.pdf"); so("s_haruna", "榛名山", "43_Harunasan.pdf");
  so("s_yoko", "横岳", "46_Yokodake.pdf"); so("s_yufu", "由布岳", "82_Yufudake.pdf"); so("s_fukue", "福江火山群", "86_Fukue_Volcanoes.pdf");
  so("s_yotei", "羊蹄山", "16_Yoteizan.pdf"); so("s_rishiri", "利尻山", "11_Rishirizan.pdf"); so("s_numazawa", "沼沢", "37_Numazawa.pdf");
  so("s_takahara", "高原山", "40_Takaharayama.pdf"); so("s_nantai", "男体山", "41_Nantaisan.pdf"); so("s_yonemaru", "米丸・住吉池", "88_Yonemaru_and_Sumiyoshiike.pdf");
  so("s_abu", "阿武火山群", "80_Abu_Volcanoes.pdf"); so("s_miyake", "三宅島", "62_Miyakejima.pdf"); so("s_unzen", "雲仙岳", "85_Unzendake.pdf");

  // 火山：[id, 難しさ, 名前, よみ, 場所, 何年前（2026年から数えた目安）, 画面に出す年代, 年代の見出し, 噴気（資料にあるときだけ）, 活火山か, 出典, なぜ]
  // 「いちばん新しい噴火」は、総覧と有史以降の火山活動のページで、その年より後に噴火の行が無いものだけ。確かめていないものは「噴火の記録」と書く
  const NEW = "いちばん新しい噴火", REC = "噴火の記録";
  const VOLCS = [
    ["sakura", 0, "桜島", "さくらじま", "鹿児島県", 1, "2025年|この年だけで361回", NEW, "", true, ["sakura"], "2025年も南岳の山頂火口で361回噴火しました。1914年には大正大噴火がありました。"],
    ["ontake", 0, "御嶽山", "おんたけさん", "長野県・岐阜県", 12, "2014年9月27日", NEW, "", true, ["ontake"], "2014年9月27日の水蒸気噴火で、死者・行方不明者は63名でした。"],
    ["fuji", 0, "富士山", "ふじさん", "静岡県・山梨県", 319, "1707年|宝永噴火", NEW, "", true, ["s_fuji", "toha"], "1707年の宝永噴火のあと、噴火はありません。昔は「休火山」とも呼ばれました。"],
    ["usu", 0, "有珠山", "うすざん", "北海道", 26, "2000年", NEW, "", true, ["usu"], "2000年3月から、マグマ水蒸気噴火がありました。"],
    ["unzen", 0, "雲仙岳", "うんぜんだけ", "長崎県", 31, "1990〜1995年", NEW, "", true, ["s_unzen"], "1990年に噴火が始まり、1995年まで溶岩ドームと火砕流が続きました。"],
    ["nijo", 0, "二上山", "にじょうさん", "奈良県・大阪府", 15000000, "約1500万年前", "火山の活動", "", false, ["nijo"], "二上山の岩は、約1500万年前の火山活動の名残です。活火山の111には入りません。"],
    ["bandai", 1, "磐梯山", "ばんだいさん", "福島県", 138, "1888年", NEW, "", true, ["s_bandai"], "1888年の水蒸気噴火で山の北側が崩れ、大きな被害が出ました。"],
    ["hakusan", 1, "白山", "はくさん", "石川県・岐阜県", 367, "1659年", NEW, "山頂部に噴気は確認されていない", true, ["s_hakusan"], "1659年の噴火のあと、噴火の記録はありません。いまは静かでも活火山です。"],
    ["towada", 1, "十和田", "とわだ", "青森県・秋田県", 1111, "915年|平安時代", NEW, "", true, ["s_towada"], "最新の噴火は西暦915年です。1000年以上たっても、1万年以内なので活火山です。"],
    ["miyake", 1, "三宅島", "みやけじま", "東京都", 26, "2000年", REC, "", true, ["s_miyake"], "2000年の噴火で山頂が陥没し、9月に全島避難をしました。"],
    ["oshima", 1, "伊豆大島", "いずおおしま", "東京都", 36, "1990年", NEW, "", true, ["oshima"], "1986年に大きなマグマ噴火があり、1990年にも小さな噴火がありました。"],
    ["kusatsu", 1, "草津白根山", "くさつしらねさん", "群馬県", 8, "2018年1月23日", REC, "", true, ["kusatsu"], "2018年1月23日、本白根山の火口列で噴火しました。死者1名、負傷者11名でした。"],
    ["kaimon", 1, "開聞岳", "かいもんだけ", "鹿児島県", 1141, "885年", NEW, "", true, ["s_kaimon"], "最後の溶岩ドームができたのは885年。1万年以内なので活火山です。"],
    ["yufu", 1, "由布岳", "ゆふだけ", "大分県", 2200, "約2200年前", NEW, "", true, ["s_yufu"], "約2200年前に大きな噴火がありました。記録に残る活動はなくても活火山です。"],
    ["yotei", 1, "羊蹄山", "ようていざん", "北海道", 2500, "約2500年前", NEW, "噴気活動は認められない", true, ["s_yotei"], "最後の噴火は約2500年前。いま噴気が無くても、1万年以内なので活火山です。"],
    ["sanbe", 1, "三瓶山", "さんべさん", "島根県", 3600, "約3600年前|そのあとにも時期不詳の活動", NEW, "", true, ["sanbe"], "約4500年前・約3600年前などに活動がありました。記録に残る活動はありません。"],
    ["daisen", 1, "大山", "だいせん", "鳥取県", 20800, "約2万1千年前", NEW, "", false, ["daisen", "aist"], "最新の噴出物は約2万800年前（三鈷峰）。1万年より前なので、活火山ではありません。"],
    ["yoko", 1, "横岳（北八ヶ岳）", "よこだけ", "長野県", 800, "約800年前", NEW, "", true, ["s_yoko"], "約800年前に噴火したと考えられています。記録に残る活動はありません。"],
    ["haruna", 1, "榛名山", "はるなさん", "群馬県", 1500, "6世紀|約1500年前", NEW, "山頂付近に噴気は見られない", true, ["s_haruna"], "6世紀に大きな噴火が2回ありました。いまの二ッ岳はそのときにできました。"],
    ["rishiri", 2, "利尻山", "りしりざん", "北海道", 4000, "数千年前|約4000年前の可能性", NEW, "噴気を含め、火山活動の兆候なし", true, ["s_rishiri"], "最新のマールは数千年前。活動の兆候が無くても、1万年以内なので活火山です。"],
    ["numazawa", 2, "沼沢", "ぬまざわ", "福島県", 5400, "約5400年前", NEW, "", true, ["s_numazawa"], "約5400年前の噴火で、沼沢湖のカルデラができました。"],
    ["takahara", 2, "高原山", "たかはらやま", "栃木県", 6500, "約6500年前", NEW, "新湯では噴気活動がある", true, ["s_takahara"], "約6500年前に水蒸気爆発がありました。いまも新湯で噴気があります。"],
    ["nantai", 2, "男体山", "なんたいさん", "栃木県", 7000, "約7000年前", NEW, "", true, ["s_nantai", "press"], "約7000年前の噴火がわかり、2017年に活火山になりました（110→111）。"],
    ["yonemaru", 2, "米丸・住吉池", "よねまる・すみよしいけ", "鹿児島県", 8000, "約8000年前", NEW, "", true, ["s_yonemaru"], "2つのマールは約8000年前に噴火しました。記録に残る活動はありません。"],
    ["abu", 2, "阿武火山群", "あぶかざんぐん", "山口県", 8800, "約8800年前", NEW, "噴気活動は認められない", true, ["s_abu"], "最新の噴火は8800年前。1万年の物差しの、左の端の近くです。"],
    ["fukue", 2, "福江火山群", "ふくえかざんぐん", "長崎県", 2350, "約2300〜2400年前", NEW, "", true, ["s_fukue"], "最新の活動は約2300〜2400年前と報告されています。"],
  ].map(([id, lv, name, yomi, pref, age, w, label, fumi, active, src, note]) => { const [when, more = ""] = w.split("|"); return { id, lv, name, yomi, pref, age, when, more, label, fumi, active, src, note }; });
  const VB = Object.fromEntries(VOLCS.map((v) => [v.id, v]));

  // 答えの2つ（活火山かどうか）
  const ANS = { yes: "🌋 活火山", no: "活火山ではない" };
  // 2段目「1万年の物差しのどこ？」の4つ（境目は 100年・1000年・1万年）
  const GROUPS = {
    r100: { name: "100年より最近", sub: "人の一生くらいの間" },
    r1k: { name: "100年〜1000年前", sub: "江戸時代・鎌倉時代のころ" },
    r10k: { name: "1000年〜1万年前", sub: "物差しの大部分" },
    out: { name: "1万年より前", sub: "物差しの外" },
  };
  const grpOf = (age) => (age <= 100 ? "r100" : age <= 1000 ? "r1k" : age <= 10000 ? "r10k" : "out");
  // 何年前の言い方（物差しの説明に使う）
  const agoStr = (a) => (a >= 1e4 ? (a >= 1e6 ? `約${Math.round(a / 1e4)}万年前` : `約${(a / 1e4).toFixed(1).replace(/\.0$/, "")}万年前`) : a >= 1000 ? `約${a.toLocaleString("en-US")}年前` : `約${a}年前`);
  const roughAgo = (a) => (a <= 10 ? "ここ数年" : a > 1e4 ? agoStr(a) : agoStr(a >= 1000 ? Math.round(a / 100) * 100 : Math.round(a / 10) * 10));
  const gwhyOf = (v) => `${v.name}の${v.label === NEW || v.label === REC ? "噴火" : "火山の活動"}（${v.when}）は、${v.age > 1e4 ? "1万年より前。物差しの外です。" : `${v.when.includes("年前") ? "" : `いまから${roughAgo(v.age)}。`}物差しの「${GROUPS[grpOf(v.age)].name}」です。`}`;

  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end
  const MEDIA = { hantei: "活火山？", kurabe: "物差しくらべ", kihon: "活火山のきほん" };

  // 1万年の物差しの位置（0＝1万年前・1＝いま）。1万年より前は -1（物差しの外）
  const posOf = (age) => (age > 1e4 ? -1 : 1 - age / 1e4);

  // 問題の上の絵：山と、いちばん新しい噴火の年代（色だけにせず、字で書く）
  function mountSvg(v, quiet) {
    const smoke = v.age <= 100 && !quiet ? `<path d="M160 30 q-12 -10 0 -18 q12 -8 0 -16" fill="none" stroke="#7d7466" stroke-width="5" stroke-linecap="round"/>` : "";
    const fill = v.age > 1e4 ? "#7a8a6a" : "#6b4f3a";
    return `<svg viewBox="0 0 320 110" role="img" aria-label="${v.name}の山の絵"><rect width="320" height="110" fill="#e9eef2"/><path d="M20 108 L130 40 Q160 26 190 40 L300 108Z" fill="${fill}"/><path d="M130 40 Q160 26 190 40 L176 50 L160 44 L144 50Z" fill="#d9d2c3"/>${smoke}<rect x="0" y="100" width="320" height="10" fill="#8aa27a"/></svg>`;
  }

  // 活火山かの問いの言い方
  const SIT = [
    (v) => `${v.name}は、活火山？`,
    (v) => `${v.name}（${v.pref}）。活火山に入る？`,
    (v) => `この記録の${v.name}。活火山かどうかは？`,
    (v) => `${v.name}を、活火山の定義で分けると？`,
    (v) => `${v.name}の年代を見て。活火山？`,
    (v) => `活火山の定義に、${v.name}は当てはまる？`,
  ];
  function judge(v) {
    return (R) => {
      const si = ri(R, 0, SIT.length - 1), opts = shuffle(R, [ANS.yes, ANS.no]);
      return { type: "act", media: MEDIA.hantei, q: SIT[si](v), opts, ans: v.active ? ANS.yes : ANS.no, volc: [v.id], v: `${si}:${opts[0] === ANS.yes ? 0 : 1}` };
    };
  }
  const V = (id, look) => {
    const v = VB[id];
    return { id, lv: v.lv, a: v.age, ans: v.active ? ANS.yes : ANS.no, grp: grpOf(v.age), gwhy: gwhyOf(v), col: "hantei", name: `${v.name}：${v.active ? "活火山" : "活火山ではない"}`, look,
      key: v.age > 1e4 ? "1万年より前の噴火だけで、噴気の話も無ければ、活火山ではありません。" : "おおむね過去1万年以内に噴火していれば、いま静かでも活火山です。",
      why: v.note, src: v.src, make: judge(v), volc: v };
  };

  // 物差しくらべ：3つの火山のうち、いちばん新しい噴火（いまに近い）を選ぶ。lv で年代の離れ方を変える（となりとの比が、やさしい5倍以上・ふつう2〜5倍・むずかしい1.3〜2倍）
  const GAP = [[5, Infinity], [2, 5], [1.3, 2]];
  function trioOk(a, lv) { const s = a.map((x) => VB[x].age).sort((p, q) => p - q), [lo, hi] = GAP[lv]; const r1 = s[1] / s[0], r2 = s[2] / s[1]; return r1 >= lo && r1 < hi && r2 >= 1.3; }
  // 利尻山は「数千年前」で幅が広いので、くらべに出さない
  function trios(lv) { const ids = VOLCS.filter((v) => v.id !== "rishiri").map((v) => v.id), out = []; for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) { const t = [ids[i], ids[j], ids[k]]; if (trioOk(t, lv)) out.push(t); } return out; }
  const TRIOS = [0, 1, 2].map(trios);
  const CSIT = ["物差しの上で「いま」にいちばん近い噴火は？", "いちばん最近に噴火したのは、どの火山？", "3つの火山。いちばん新しい噴火はどれ？"];
  const optOf = (id) => `${VB[id].name}（${VB[id].when}）`;
  function trio(lv) {
    return (R) => {
      const t = TRIOS[lv][ri(R, 0, TRIOS[lv].length - 1)], si = ri(R, 0, CSIT.length - 1), ord = shuffle(R, t), best = t.slice().sort((p, q) => VB[p].age - VB[q].age)[0];
      const why = `${t.slice().sort((p, q) => VB[p].age - VB[q].age).map((x) => `${VB[x].name} ${agoStr(VB[x].age)}`).join("・")}。いちばん新しいのは${VB[best].name}です。`;
      return { type: "act", media: MEDIA.kurabe, q: CSIT[si], opts: ord.map(optOf), ans: optOf(best), volc: ord, why, src: [...new Set(t.flatMap((x) => VB[x].src))].slice(0, 3), v: `${si}:${ord.join(".")}` };
    };
  }
  const C = (lv, look) => ({ id: `c${lv}`, lv, a: -1, ans: "", grp: null, gwhy: "", col: "kurabe", name: `物差しくらべ（${LV[lv]}）`, look,
    key: "「年」で書いた噴火は、いまの年から引くと何年前かがわかります。", why: "", src: ["souran"], make: trio(lv) });

  // 決まりの問題。ans：答え、ws：まちがいの選び肢の候補（やさしいは2つ、ほかは3つ使う）、sit：問いの言い方
  function fact(col, sit, ans, ws) {
    return (R, lv) => {
      const si = ri(R, 0, sit.length - 1), ds = pickN(R, ws, lv === 0 ? 2 : 3);
      return { type: "fact", media: MEDIA[col], q: sit[si], opts: shuffle(R, [ans, ...ds]), ans, v: `${si}:${ds.map((d) => ws.indexOf(d)).join(".")}` };
    };
  }
  const F = (id, lv, src, name, look, key, why, sit, ans, ws) => ({ id, lv, a: -1, ans, grp: null, gwhy: "", col: "kihon", name, look, key, why, src, make: fact("kihon", sit, ans, ws) });

  const KINDS = [
    // ---- やさしい ----
    V("sakura", "噴火の年を見て。いまもくり返しています。"),
    V("ontake", "2014年は、いまから何年前？"),
    V("fuji", "1707年は、1万年より前？あと？"),
    V("usu", "2000年の噴火です。"),
    V("unzen", "1990年代の噴火です。"),
    V("nijo", "1500万年前は、1万年よりずっと前です。"),
    F("teigi", 0, ["toha"], "活火山は「おおむね過去1万年」", "人の一生より、ずっと長い物差しです。", "活火山は、おおむね過去1万年以内に噴火した火山などです。",
      "気象庁は活火山を「概ね過去1万年以内に噴火した火山及び現在活発な噴気活動のある火山」としています。",
      ["活火山は、おおむね過去何年以内に噴火した火山？", "活火山の定義の物差しの長さは？", "「活火山」と呼ぶのは、過去どれくらいの間に噴火した火山？"], "1万年", ["10年", "100年", "100万年", "1億年"]),
    F("kyu", 0, ["toha", "aist"], "「休火山」「死火山」はいまは使わない", "昔の呼び方です。", "かつての「休火山」「死火山」という呼び方は、いまは使いません。",
      "昔は噴火していない火山を休火山・死火山と呼びました。産総研は、いまは使わないとしています。",
      ["「休火山」「死火山」という呼び方は、いまは？", "いま静かな火山を「休火山」と呼ぶ？", "「死火山」という言葉の、いまの扱いは？"], "いまは使わない", ["いまも正式に使う", "噴火した山だけに使う", "海の火山だけに使う", "気象庁が毎年決める"]),
    F("bai", 0, ["toha"], "1万年は100年の100倍", "人の一生を100年として数えます。", "1万年は、100年（人の一生くらい）の100倍の長さです。",
      "10000÷100＝100。活火山の物差しは、人の一生を100回つないだくらいの長さです。",
      ["1万年は、100年の何倍？", "人の一生を100年とすると、1万年は何回分？", "活火山の物差し（1万年）は、100年の何倍？"], "100倍", ["10倍", "2倍", "1000倍", "1万倍"]),
    C(0, "書いてある年代のうち、いちばん数の小さい「年前」は？"),
    // ---- ふつう ----
    V("bandai", "1888年は、いまから100年より前です。"),
    V("hakusan", "噴気が無くても、噴火の年代で決まります。"),
    V("towada", "915年は、1000年あまり前です。"),
    V("miyake", "2000年の噴火です。"),
    V("oshima", "1990年は、人の一生の中です。"),
    V("kusatsu", "2018年の噴火です。"),
    V("kaimon", "885年は、約1100年前です。"),
    V("yufu", "2200年前は、1万年の中？"),
    V("yotei", "いま静かでも、年代で決まります。"),
    V("sanbe", "3600年前は、1万年の中？"),
    V("daisen", "2万1千年前は、1万年の外です。"),
    V("yoko", "800年前は、1万年の中？"),
    V("haruna", "6世紀は、いまから約1500年前です。"),
    F("kazu", 1, ["toha"], "日本の活火山は111", "100より少し多いです。", "日本の活火山は111あります（気象庁）。",
      "気象庁によると、日本の活火山は111です。2017年に男体山が加わって111になりました。",
      ["日本の活火山はいくつ？", "気象庁が数える、日本の活火山の数は？", "いまの日本の活火山の数は？"], "111", ["11", "51", "300", "1111"]),
    F("funki", 1, ["toha"], "噴気が活発な火山も活火山", "定義には「及び」があります。", "1万年以内の噴火か、いま活発な噴気活動。どちらかで活火山です。",
      "定義は「概ね過去1万年以内に噴火した火山及び現在活発な噴気活動のある火山」です。",
      ["噴火は1万年より前。でも、いま活発な噴気がある火山は？", "最後の噴火が古くても、噴気が活発なら？", "活火山の定義で、噴火のほかに見るものは？"], "活火山に入る", ["活火山に入らない", "噴火警戒レベルで決める", "高さで決める", "温泉があれば入る"]),
    F("shizuka", 1, ["toha", "aist"], "いま静かでも活火山はある", "物差しは1万年です。", "いま噴火していなくても、1万年以内に噴火していれば活火山です。",
      "1万年以内に噴火した火山は、いま静かでも活火山です。富士山も1707年から噴火していません。",
      ["いま噴火していない山。1万年以内に噴火していたら？", "数千年、静かな火山。7000年前に噴火していたら？", "噴煙が見えない火山は、活火山ではない？"], "活火山", ["活火山ではない", "休火山と呼ぶ", "死火山と呼ぶ", "100年たてば外れる"]),
    C(1, "「年」と「年前」をそろえて、くらべます。"),
    // ---- むずかしい ----
    V("rishiri", "数千年前は、1万年の中？"),
    V("numazawa", "5400年前は、1万年の中？"),
    V("takahara", "6500年前の噴火と、噴気があります。"),
    V("nantai", "2017年に、何かが変わった山です。"),
    V("yonemaru", "8000年前は、1万年の中？"),
    V("abu", "8800年前は、1万年ぎりぎりの中です。"),
    V("fukue", "2300〜2400年前の活動です。"),
    F("nen2003", 2, ["toha"], "1万年の定義は2003年から", "その前は「過去2000年」でした。", "いまの定義（過去1万年）は、2003年に火山噴火予知連絡会が決めました。",
      "1991年は過去約2000年でしたが、数千年休んでから噴火する例もあり、2003年に1万年へ広げました。",
      ["「過去1万年」の定義が決まったのは何年？", "火山噴火予知連絡会がいまの定義にしたのは？", "活火山の物差しが1万年になったのは何年？"], "2003年", ["1950年", "1975年", "1991年", "2017年"]),
    F("zou", 2, ["press"], "2017年に男体山が加わり111に", "栃木県の山です。", "2017年、男体山が加わり、活火山は110から111になりました。",
      "1万年以内に噴火していた研究がまとまり、2017年に男体山が活火山になりました（110→111）。",
      ["2017年に活火山に加わった山は？", "活火山が110から111になったとき、加わったのは？", "1万年以内の噴火がわかり、2017年に活火山になったのは？"], "男体山", ["富士山", "大山", "桜島", "二上山"]),
    F("kawaru", 2, ["aist", "press"], "調べが進むと活火山になることも", "男体山の例があります。", "くわしい調査で1万年以内の噴火がわかると、新たに活火山になることがあります。",
      "産総研は、調査で最近1万年以内の活動が認められると、新たに活火山になりうるとしています。",
      ["調査で、1万年以内の噴火が新しく見つかった山は？", "活火山の数が変わることはある？", "いま活火山でない山。調べると7000年前の噴火が見つかったら？"], "新たに活火山になりうる", ["数は決して変わらない", "そのまま外す", "休火山と呼ぶ", "100年待って決める"]),
    C(2, "年前の数が近いものほど、よく見くらべて。"),
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end

  // 1問を作る。tag は「種類|種」（例 "fuji|2026-11-27:d0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = Object.prototype.hasOwnProperty.call(BY, kind) ? BY[kind] : null;
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    const v = k.volc, svg = v ? mountSvg(v) : "";
    const card = v ? { vname: v.name, yomi: v.yomi, pref: v.pref, when: v.when, more: v.more, label: v.label, fumi: v.fumi } : null;
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: k.grp, gwhy: k.gwhy, svg, card, ...p, src: (p.src || k.src).map((s) => SRC[s]) };
  }
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}`;

  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const KZM = { KINDS, BY, GROUPS, LV, SRC, VOLCS, VB, MEDIA, ANS, TRIOS, grpOf, agoStr, posOf, kindsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN, mountSvg };
  if (typeof module !== "undefined" && module.exports) module.exports = KZM; else root.KZM = KZM;
})(typeof self !== "undefined" ? self : this);

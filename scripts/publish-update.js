/* 生成 version.json（联网更新用的清单）
 *
 * 用法：
 *   1) 改 release.json（版本号、更新日志、内容包文件名）
 *   2) node scripts/publish-update.js
 *   3) 提交推送，手机端下次启动就会收到
 *
 * 这个脚本做三件事：
 *   · 把 release.json 里的内容包算成 chars + checksum + bytes 写进清单
 *     （update.js 就用这三个值判断「下完整了没」「有没有被改坏」）
 *   · 校验 update.js / index.html / release.json 三处版本号一致，
 *     不一致直接报错 —— 版本号对不上，手机上会永远显示「有新版本」
 *   · 内容版本必须比上一版大，防止推送了却没生效
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = path.resolve(__dirname, "..");
const RELEASE = path.join(SRC, "release.json");
const VERSION_OUT = path.join(SRC, "version.json");

function die(msg) {
  console.error("\n  ✗ " + msg);
  if (fs.existsSync(VERSION_OUT)) {
    console.error("    version.json 保持原样，没有改动。");
  }
  console.error("");
  process.exit(1);
}
function ok(msg) { console.log("  ✓ " + msg); }
function warn(msg) { console.log("  ! " + msg); }

/* --force：明知道在回退版本，也允许写出去（改错了想修回来时用） */
const FORCE = process.argv.includes("--force");

/* ---------- 读 release.json ---------- */
if (!fs.existsSync(RELEASE)) die("找不到 release.json");
let release;
try {
  release = JSON.parse(fs.readFileSync(RELEASE, "utf8"));
} catch (e) {
  die("release.json 不是合法 JSON：" + e.message);
}

const appVer = String(release.app || "").trim();
const contentVer = String(release.content || "").trim();
if (!/^\d{4}\.\d{2}\.\d{2}-\d{4}$/.test(appVer)) die("app 版本格式应为 YYYY.MM.DD-HHMM，现在是「" + appVer + "」");
if (!/^\d{4}\.\d{2}\.\d{2}-\d{4}$/.test(contentVer)) die("content 版本格式应为 YYYY.MM.DD-HHMM，现在是「" + contentVer + "」");

/* ---------- 三处版本号必须一致 ---------- */
const updJs = fs.readFileSync(path.join(SRC, "update.js"), "utf8");
const mUpd = updJs.match(/var LOCAL_VERSION\s*=\s*"([^"]+)"/);
if (!mUpd) die("update.js 里找不到 LOCAL_VERSION");
if (mUpd[1] !== appVer) {
  die("版本号不一致：release.json 是 " + appVer + "，update.js 是 " + mUpd[1] +
      "\n    把 update.js 的 LOCAL_VERSION 改成 " + appVer + " 再跑一次");
}
ok("update.js LOCAL_VERSION = " + appVer);

const idxHtml = fs.readFileSync(path.join(SRC, "index.html"), "utf8");
const mIdx = idxHtml.match(/<b id="pmVerText">([^<]+)<\/b>/);
if (!mIdx) die("index.html 里找不到 <b id=\"pmVerText\">");
if (mIdx[1].trim() !== appVer) {
  die("版本号不一致：release.json 是 " + appVer + "，index.html 是 " + mIdx[1].trim() +
      "\n    改 index.html 的 #pmVerText 初始值再跑一次");
}
ok("index.html #pmVerText = " + appVer);

/* ---------- 版本必须往前走 ---------- */
function verCmp(a, b) {
  const pa = String(a || "").split(/[^0-9]+/), pb = String(b || "").split(/[^0-9]+/);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = parseInt(pa[i], 10) || 0, y = parseInt(pb[i], 10) || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

if (fs.existsSync(VERSION_OUT)) {
  try {
    const prev = JSON.parse(fs.readFileSync(VERSION_OUT, "utf8"));
    if (prev.content && verCmp(contentVer, prev.content) < 0 && !FORCE) {
      die("content 版本回退了：上一版是 " + prev.content + "，这次是 " + contentVer +
          "\n    确实是修正错误，加 --force 再跑一次");
    }
    if (prev.content === contentVer) {
      warn("content 版本和上一版相同（" + contentVer + "），手机上不会重新拉内容");
    }
    if (prev.app && verCmp(appVer, prev.app) < 0 && !FORCE) {
      die("app 版本回退了：上一版是 " + prev.app + "，这次是 " + appVer);
    }
    ok("相比上一版：app " + (prev.app || "-") + " → " + appVer +
       "，内容 " + (prev.content || "-") + " → " + contentVer);
  } catch (e) {
    if (e && e.message && e.message.indexOf("版本") >= 0) throw e;
    warn("现有 version.json 读不了，当作首发处理");
  }
}

/* ---------- 内容包 ---------- */
function stripBom(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

let pack = null;
const packFile = String(release.packFile || "").trim();

if (packFile) {
  const packPath = path.join(SRC, packFile);
  if (!fs.existsSync(packPath)) die("找不到内容包：" + packFile);

  let raw = stripBom(fs.readFileSync(packPath, "utf8"));
  let data;
  try { data = JSON.parse(raw); } catch (e) { die(packFile + " 不是合法 JSON：" + e.message); }

  /* 结构校验：坏一条就整包不放行，宁可这次不发 */
  const sols = data.solutions;
  if (sols !== undefined) {
    if (!Array.isArray(sols)) die("solutions 必须是数组");
    const seen = new Set();
    sols.forEach((s, i) => {
      if (!s || typeof s !== "object") die("solutions[" + i + "] 不是对象");
      if (!s.id) die("solutions[" + i + "] 缺 id");
      if (seen.has(s.id)) die("solutions 里 id 重复：" + s.id);
      seen.add(s.id);
      if (!s.stem) die("solutions[" + i + "]（" + s.id + "）缺 stem");
      if (!Array.isArray(s.parts) || !s.parts.length) die("solutions[" + i + "]（" + s.id + "）缺 parts");
      s.parts.forEach((p, j) => {
        if (!p || !Array.isArray(p.steps) || !p.steps.length) {
          die("solutions[" + i + "].parts[" + j + "] 缺 steps");
        }
      });
    });
  }

  const bank = data.bank;
  if (bank !== undefined) {
    if (!bank || typeof bank !== "object" || Array.isArray(bank)) die("bank 必须是「学科 → 卷数组」的对象");
    Object.keys(bank).forEach((subj) => {
      if (!Array.isArray(bank[subj])) die("bank." + subj + " 必须是数组");
      bank[subj].forEach((paper, i) => {
        if (!paper || !paper.id) die("bank." + subj + "[" + i + "] 缺 id");
        if (!Array.isArray(paper.questions) || !paper.questions.length) {
          die("bank." + subj + "[" + i + "]（" + paper.id + "）缺 questions");
        }
        paper.questions.forEach((q, j) => {
          if (!q || !q.q) die("bank." + subj + "[" + i + "].questions[" + j + "] 缺题干 q");
          if (!q.answer) die("bank." + subj + "[" + i + "].questions[" + j + "] 缺 answer");
        });
      });
    });
  }

  if (!sols && !bank) die("内容包里既没有 solutions 也没有 bank，等于什么都没更新");

  /* id 撞车的提示：撞了会被 extraSolutions 过滤掉，白下载 */
  if (sols && fs.existsSync(path.join(SRC, "solutions_papers.js"))) {
    const ctx = { window: {}, console: { log() {}, warn() {} } };
    try {
      vm.createContext(ctx);
      vm.runInContext(fs.readFileSync(path.join(SRC, "solutions_papers.js"), "utf8"), ctx, { timeout: 5000 });
      const exist = (ctx.SOLUTION_PAPERS || ctx.window.SOLUTION_PAPERS || []).map((x) => x.id);
      const clash = sols.map((s) => s.id).filter((id) => exist.includes(id));
      if (clash.length) warn("这些 id 本地已有，会被忽略：" + clash.join("、"));
    } catch (e) {
      warn("读 solutions_papers.js 失败，跳过 id 撞车检查");
    }
  }

  const bytes = Buffer.byteLength(raw, "utf8");
  pack = {
    version: contentVer,
    url: packFile,
    bytes,
    chars: raw.length,
    checksum: fnv1a(raw)
  };

  const nSol = sols ? sols.length : 0;
  let nQ = 0;
  if (bank) Object.keys(bank).forEach((k) => bank[k].forEach((pp) => { nQ += pp.questions.length; }));
  ok("内容包 " + packFile + "：" + nSol + " 道解答题、" + nQ + " 道题库题，" +
     (bytes / 1024).toFixed(1) + " KB，checksum " + pack.checksum);
} else {
  warn("没有内容包（packFile 为空），这一版只提示主程序更新");
}

/* ---------- APK ---------- */
const apkUrl = String(release.apkUrl || "").trim();
let apk = null;
if (apkUrl) {
  if (!/^https:\/\//i.test(apkUrl)) die("apkUrl 必须是 https 直链");
  apk = { version: appVer, url: apkUrl, bytes: Number(release.apkBytes) || 0 };
  ok("APK 下载地址已配置：" + apkUrl);
} else {
  warn("没有 apkUrl：手机端检测到新版只会提示，不提供下载按钮");
}

/* ---------- 写清单 ---------- */
const out = {
  app: appVer,
  content: contentVer,
  notes: Array.isArray(release.notes) ? release.notes.filter(Boolean) : [],
  pack: pack,
  apk: apk
};

fs.writeFileSync(VERSION_OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
ok("已写出 version.json");

console.log("\n  下一步：");
console.log("    git add -A && git commit -m \"release: " + appVer + "\"");
console.log("    git push origin main");
console.log("  推送后 GitHub Pages 约 1 分钟生效，手机端下次启动自动收到。\n");

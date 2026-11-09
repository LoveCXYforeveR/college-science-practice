/* 生成离线单文件版：所有脚本、样式、字体、图标全部内联。
 *
 * 产物可以直接拷到任何设备双击打开（file:// 也能用），代价是体积约 6MB。
 *
 * 用法：node scripts/build-singlefile.js
 * 输出：dist/作品-手机版.html
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(DIST, "作品-手机版.html");

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const before = Buffer.byteLength(html, "utf8");
const kb = (n) => (n / 1024).toFixed(0) + "KB";

/* ---------- 1) 内联所有本地 <script src> ---------- */
let inlined = 0;
html = html.replace(/<script\s+src="([^"]+)"([^>]*)><\/script>/g, (m, src, attrs) => {
  if (/^https?:/.test(src)) return m;
  const p = path.join(ROOT, src.replace(/^\.\//, ""));
  if (!fs.existsSync(p)) { console.log("  跳过（不存在）", src); return m; }
  let code = fs.readFileSync(p, "utf8");
  /* 正文里出现 </script 会提前截断脚本块，必须转义 */
  code = code.replace(/<\/script/gi, "<\\/script");
  inlined++;
  console.log("  内联", src, kb(Buffer.byteLength(code, "utf8")));

  let block = "<script" + attrs + ">\n" + code + "\n</script>";

  /* 题库是懒加载的，不在 script 标签里，单文件版必须一并塞进去，
     且要放在主脚本之前，这样 ensureBank() 一开始就能看到 BANK 已定义 */
  if (src === "papers_extra.js") {
    ["bank.js", "bank_extra.js"].forEach(function (f) {
      const bp = path.join(ROOT, f);
      if (!fs.existsSync(bp)) return;
      const bc = fs.readFileSync(bp, "utf8").replace(/<\/script/gi, "<\\/script");
      console.log("  内联(题库)", f, kb(Buffer.byteLength(bc, "utf8")));
      block += "\n<script>\n" + bc + "\n</script>";
    });
  }
  return block;
});

/* ---------- 2) 内联主样式表 ---------- */
html = html.replace(/<link\s+rel="stylesheet"\s+href="app\.css"\s*\/?>\s*(<!--[^>]*-->\s*)?/g, () => {
  const cp = path.join(ROOT, "app.css");
  if (!fs.existsSync(cp)) { console.log("  ⚠ 缺少 app.css：产物会丢样式"); return ""; }
  const css = fs.readFileSync(cp, "utf8");
  console.log("  内联 app.css", kb(Buffer.byteLength(css, "utf8")));
  return "<style>\n" + css + "\n</style>\n";
});

/* ---------- 3) 内联 KaTeX 样式，字体转 base64 ----------
   单文件版没有 vendor/fonts 目录，外链字体会 404，公式会整体错位 */
html = html.replace(/<link\s+rel="stylesheet"\s+href="vendor\/katex\.min\.css"\s*\/?>/g, () => {
  const cp = path.join(ROOT, "vendor/katex.min.css");
  if (!fs.existsSync(cp)) { console.log("  ⚠ 缺少 vendor/katex.min.css"); return ""; }
  let css = fs.readFileSync(cp, "utf8");
  let fonts = 0, bytes = 0;
  css = css.replace(/url\(fonts\/([^)]+?\.woff2)\)/g, (m, f) => {
    const fp = path.join(ROOT, "vendor/fonts", f);
    if (!fs.existsSync(fp)) { console.log("  ⚠ 缺字体", f); return m; }
    const b64 = fs.readFileSync(fp).toString("base64");
    fonts++; bytes += b64.length;
    return "url(data:font/woff2;base64," + b64 + ")";
  });
  /* woff / ttf 是给老内核的备选，单文件里没有这些文件，删掉避免请求 */
  css = css.replace(/,url\(fonts\/[^)]+?\.woff\)\s*format\("woff"\),url\(fonts\/[^)]+?\.ttf\)\s*format\("truetype"\)/g, "");
  console.log("  内联 katex 样式", kb(Buffer.byteLength(css, "utf8")),
              "，字体", fonts, "个", kb(bytes) + "(base64)");
  return "<style>\n/* KaTeX（构建时内联，字体已 base64） */\n" + css + "\n</style>";
});

/* ---------- 4) 去掉其余 vendor 引用 ---------- */
html = html.replace(/<link\s+rel="stylesheet"\s+href="vendor\/[^"]+"\s*\/?>\s*/g, "");

/* ---------- 5) 去掉 manifest（file:// 下无意义） ---------- */
html = html.replace(/<link rel="manifest"[^>]*>\s*/g, "");

/* ---------- 6) 图标转 base64 ---------- */
const ico = path.join(ROOT, "icons/icon-180.png");
if (fs.existsSync(ico)) {
  const b64 = fs.readFileSync(ico).toString("base64");
  html = html.replace(/<link rel="apple-touch-icon"[^>]*>/,
    '<link rel="apple-touch-icon" href="data:image/png;base64,' + b64 + '">');
  console.log("  图标已内联", kb(b64.length) + "(base64)");
} else {
  html = html.replace(/<link rel="apple-touch-icon"[^>]*>\s*/g, "");
}

/* ---------- 7) 关掉 Service Worker（file:// 不支持） ---------- */
const beforeSW = html;
html = html.replace(/\bregisterSW\(\);/, "/* 单文件版：不做 Service Worker 注册 */");
console.log("  跳过 SW 注册:", beforeSW !== html ? "是" : "未找到调用");

/* ---------- 8) 标题注明离线版 ---------- */
html = html.replace("<title>作品 · 大学课程练习</title>",
                    "<title>作品 · 大学课程练习（离线版）</title>");

fs.writeFileSync(OUT, html, "utf8");

const after = Buffer.byteLength(html, "utf8");
const hasExternal = /<script\s+src="/.test(html) ||
                    /<link\s+rel="stylesheet"\s+href="(?!data:)/.test(html);
console.log("\n内联脚本数: " + inlined);
console.log("体积: " + kb(before) + " → " + (after / 1048576).toFixed(2) + "MB");
console.log("输出: " + OUT);
console.log("残留外链: " + (hasExternal ? "有（检查！）" : "无"));
if (hasExternal) process.exitCode = 1;

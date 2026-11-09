/* 把 bank.js + bank_extra.js 合成一份 bank.json。
 *
 * 为什么要这一步：3MB 的 JS 对象字面量在手机上解析要好几秒，会堵死主线程
 * 触发「应用无响应」。JSON.parse 是原生实现，同样的数据快一个数量级
 * （实测 20–50ms）。
 *
 * 页面优先读 bank.json，读不到才回落到 bank.js。单文件版走回落路径。
 *
 * 用法：node scripts/build-bank-json.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "bank.json");

const ctx = { console: console };
ctx.window = ctx;              // bank.js 里可能引用 window
vm.createContext(ctx);

const sources = ["bank.js", "bank_extra.js"];
sources.forEach(function (f) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) {
    console.error("缺少 " + f);
    process.exit(1);
  }
  vm.runInContext(fs.readFileSync(p, "utf8"), ctx, { filename: f });
});

const BANK = ctx.BANK;
if (!BANK || typeof BANK !== "object") {
  console.error("没有拿到 BANK，生成失败");
  process.exit(1);
}

let questions = 0, categories = 0;
Object.keys(BANK).forEach(function (subject) {
  (BANK[subject] || []).forEach(function (cat) {
    categories++;
    questions += (cat.questions || []).length;
  });
});

const json = JSON.stringify(BANK);
fs.writeFileSync(OUT, json, "utf8");

const mb = (n) => (n / 1048576).toFixed(2) + "MB";
console.log("bank.json 已生成");
console.log("  学科 " + Object.keys(BANK).length +
            " / 分类 " + categories + " / 题目 " + questions);
console.log("  体积 " + mb(fs.statSync(OUT).size) +
            "（源 bank.js " + mb(fs.statSync(path.join(ROOT, "bank.js")).size) + "）");

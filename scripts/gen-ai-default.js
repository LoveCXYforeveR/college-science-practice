/* 生成 ai_default.js：把模型服务配置内嵌进安装包，做到开箱即用。
 *
 * 默认不生成也没关系 —— 用户可以在「我的 → AI 生成详解」里自己填。
 * 这个脚本是给「打包自用版」用的。
 *
 * 配置来源（按优先级）：
 *   1. 环境变量  AI_BASE_URL / AI_MODEL / AI_VISION_MODEL / AI_KEY
 *   2. 本地文件  ai_default.local.json（已在 .gitignore 中）
 *
 * 用法：
 *   node scripts/gen-ai-default.js
 *   AI_KEY=sk-xxx node scripts/gen-ai-default.js
 *
 * 输出：ai_default.js（已在 .gitignore 中，不要提交）
 *
 * ⚠️ 生成了这个文件并打进安装包后，那个包不要分发给别人 ——
 *    别人装上就能用你的额度。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LOCAL = path.join(ROOT, "ai_default.local.json");
const OUT = path.join(ROOT, "ai_default.js");

const DEFAULTS = {
  mode: "cloud",
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-v4-pro",
  visionModel: "deepseek-flash"
};

let cfg = { ...DEFAULTS };

if (fs.existsSync(LOCAL)) {
  try {
    const local = JSON.parse(fs.readFileSync(LOCAL, "utf8"));
    cfg = { ...cfg, ...local };
    console.log("已读取 " + path.basename(LOCAL));
  } catch (e) {
    console.error("ai_default.local.json 解析失败：" + e.message);
    process.exit(1);
  }
}

/* 环境变量优先，方便 CI 或临时打包 */
if (process.env.AI_BASE_URL) cfg.baseUrl = process.env.AI_BASE_URL;
if (process.env.AI_MODEL) cfg.model = process.env.AI_MODEL;
if (process.env.AI_VISION_MODEL) cfg.visionModel = process.env.AI_VISION_MODEL;
if (process.env.AI_KEY) cfg.key = process.env.AI_KEY;

if (!cfg.key || !String(cfg.key).trim()) {
  console.log("没有可用的 Key，跳过生成（应用仍可运行，用户需要在设置里自己填）");
  console.log("用法：把配置写进 ai_default.local.json，或设置 AI_KEY 环境变量");
  process.exit(0);
}

const payload = {
  mode: cfg.mode || "cloud",
  baseUrl: String(cfg.baseUrl || DEFAULTS.baseUrl).replace(/\/+$/, ""),
  model: cfg.model || DEFAULTS.model,
  visionModel: cfg.visionModel || DEFAULTS.visionModel,
  key: String(cfg.key).trim()
};

const js = "/* 构建时生成，含密钥，不要提交 */\n" +
           "window.__AI_DEFAULT__ = " + JSON.stringify(payload, null, 2) + ";\n";
fs.writeFileSync(OUT, js, "utf8");

const masked = payload.key.slice(0, 4) + "****" + payload.key.slice(-2);
console.log("ai_default.js 已生成");
console.log("  baseUrl: " + payload.baseUrl);
console.log("  model:   " + payload.model + " / " + payload.visionModel);
console.log("  key:     " + masked);
console.log("\n把这个文件打进安装包即可开箱即用。注意别把包发给别人。");

# 架构说明

这个项目刻意保持在「无框架、无打包器、无后端」的形态。本文说明为什么这么选，以及各部分怎么协作。

---

## 一、三种运行形态，同一份代码

```
                  作品/（源码，静态站点）
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   浏览器直开        单文件 HTML         安卓 APK
 (python -m http.server) (build-singlefile)  (WebView + assets)
```

| 形态 | 入口 | 特点 |
|---|---|---|
| 桌面/浏览器 | `index.html` | 外链 `app.css` 与各 `.js`，可热改 |
| 单文件 | `作品-手机版.html` | 一切内联（含 20 个字体 base64），6MB 单文件 |
| 安卓 APK | `assets/index.html` | 页面在 `file://` 下运行，通过 `@JavascriptInterface` 桥接原生能力 |

**关键约束**：三种形态共用同一套 HTML/JS/CSS，差异只在「资源怎么进来」和「能力怎么出去」。这决定了两个设计：

- 资源加载必须同时支持 `file://` 和 `http://`
- 所有原生能力必须有 Web 端降级路径（比如保存文件：APK 走桥接，浏览器走 `Blob` 下载）

## 二、模块职责

| 文件 | 职责 | 体量 |
|---|---|---|
| `index.html` | 页面结构 + 全部业务脚本 | 10067 行 |
| `app.css` | 全部样式，按功能分区注释 | 1968 行 |
| `papers_core.js` | 高数 A–D 卷的题目定义（`PAPERS`） | 21KB |
| `papers_extra.js` | 补充卷子 + 学科定义（`SUBJECTS`） | 4KB |
| `bank.js` | 多学科题库（`BANK`：4 学科 / 44 分类） | 3.1MB |
| `bank_extra.js` | 薄弱章节补充题（`BANK_EXTRA`），运行时并入 `BANK` | 9KB |
| `knowledge.js` | 知识点库（`KP_KB` / `KP_BY_ID`），带覆盖表 | 569KB |
| `solutions*.js` | 详解数据，按题型分 5 片 | 约 1.4MB |
| `solutions_papers.js` | 四套模拟卷（A–D）的解答题，带 `paper` / `num` 字段，卡片上显示「A卷」等来源 | 30KB |
| `practice.js` | 变式题生成（`KP_VARIANTS`） | 55KB |
| `sw.js` | Service Worker，离线缓存 | 3KB |

**为什么把大题量数据切成多个文件？** 因为它们不是首屏需要的。首屏只需要 HTML + CSS + 主脚本；题库、详解、知识点都是「用户真的点到那一步」才需要，所以它们走延后加载（见第五节）。

## 三、数据模型

```js
// 题库：学科 → 分类 → 题目
BANK = {
  "高等数学": [ { name: "极限与连续", questions: [ { num, question, options, answer, ... } ] } ],
  ...
}

// 卷子：做题的最小单位。静态卷 + 题库转换来的卷 + 用户自建卷，统一进 PAPERS
PAPERS = {
  "A": { label: "A卷 · 基础版", subject: "高等数学", questions: [...] },
  "GK-3": { ... }        // 由 buildBankPapers() 从 BANK 生成
}

// 作答记录：卷号 → 题号 → 用户的答案
allAnswers = { "A": { "1": "B", "2": "AC" }, ... }
```

**`num` 是稳定标识**。题目内容可以修、选项可以调，但 `num` 一旦发布就不改，否则历史作答记录会错位。题库整体重排时，`migrateStateByQid()` 会按「内容哈希」把旧记录迁到新题号上。

## 四、状态与持久化

单页应用的状态集中在一组全局变量里（144 个），通过两个函数往返：

```
运行时状态  ──snapshot()──→  纯数据对象  ──saveState()──→  存储
运行时状态  ←──applyState()──  纯数据对象  ←──loadState()──  存储
```

存储分三层，按可用性降级：

| 层 | 场景 | 内容 |
|---|---|---|
| 本地文件 | 桌面版（Python 后端） | `POST /api/state` 写入 exe 同目录 |
| localStorage | 浏览器 / APK | `sd_math_practice` 键，约几十 KB |
| IndexedDB | 浏览器 / APK | `sd_math_db`，存上传图片等大对象 |

**`saveState()` 里有一道保护**：

```js
if (!stateReady) return;   // 启动阶段禁止写盘
```

没有这道保护，启动时「空状态」会先落盘，把 localStorage 里的旧记录覆盖掉——用户会以为记录丢了。这类问题在真机上出现概率不低（启动慢 + 用户手快），所以必须挡。

## 五、启动与加载策略

首屏优先级排序是这套设计的核心：

```
1. HTML + app.css + 主脚本         （必须，用户看到界面）
2. 首屏画完 → 主动通知原生撤启动页   （体感：多快能开始用）
3. +900ms  → 异步渲染当前卷        （20 题带公式，很重，不挡首屏）
4. +2600ms → 后台预取题库           （2.5MB JSON）
5. load 之后 → 顺序补详解/知识点     （约 2MB，用到才需要）
```

为什么不在启动时一次性全加载？因为那会把首屏推后好几秒。第 3 步尤其关键：`loadPaper()` 会渲染整套 20 题（含 KaTeX 公式），同步执行时足够把首帧顶掉。

延后加载的数据全部有 `typeof` 保护，缺失时只返回空值、不抛异常——这样即使某片数据加载失败，页面仍然可用。

## 六、AI 调用的两条路径

```
手机（无后端）                    桌面（有后端）
     │                                │
aiDirect(api, payload)          fetch("/api/ai/<api>")
     │                                │
     └──→ 模型服务 ←──────────────────┘
```

手机端直接连模型服务，桌面端走后端代理。两者返回结构统一为 `{ ok, data }` / `{ ok, error }`，调用方不需要区分。

**统一约束**：

- 90 秒超时（`AbortController`）—— 模型服务偶尔长时间不返回，没有上限时进度卡会一直转
- 401 → 「Key 无效或已过期」；429 → 「调用太频繁或额度用完」
- 响应非 JSON → 「解析失败，可重试一次」

## 七、相机链路

```
getUserMedia（ideal 4096） → getCapabilities() 逼到上限
        │
        ▼
 <video object-fit:cover>  预览（cover 意味着只显示中间一条，所以裁切要和预览一致）
        │
        ├── 点按对焦：focusMode single-shot → 1.8s 后回 continuous
        ├── 双指缩放：数字变焦，transform:scale
        │
        ▼
 拍照：ImageCapture.takePhoto() ──失败/3.2s 超时──→ 视频帧捕获（回落）
        │
        ▼
 按「未变焦尺寸」建画布 → 裁切 → JPEG 0.95 → 框选 → 上传
```

三个容易踩的点：

1. **`fetch` 在 `file://` 下不可用** —— 必须用 XHR
2. **`resizeMode` 不能放进 `advanced` 约束** —— 个别设备不认识该字段会让整条约束失败
3. **画布尺寸不能跟着变焦缩小** —— 否则 4× 时输出只剩两百多像素

## 八、关键取舍

| 决策 | 选了 | 放弃了 | 理由 |
|---|---|---|---|
| UI 框架 | 原生 JS + 手写 `render*` | React / Vue | 要能塞进 6MB 单文件并在 WebView 83 上跑；UI 模式简单，框架的抽象成本大于收益 |
| 状态管理 | 全局变量 + snapshot/applyState | 状态机 / 响应式 | 状态结构简单且集中；快照机制天然支持「导入导出 / 快照回滚」 |
| 题库格式 | 预生成 JSON + `JSON.parse` | 直接 JS 字面量 | 解析 3MB 字面量会卡死主线程触发 ANR |
| 存储 | localStorage 为主 | 云端 | 核心卖点是「数据不出设备」 |
| 后端 | 桌面版才需要 | 统一后端 | 手机端直连模型服务，省掉部署成本 |
| 依赖 | 只有 KaTeX | 其他库一律不引 | 单文件体积与老 WebView 兼容性 |

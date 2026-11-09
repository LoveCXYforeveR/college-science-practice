# 构建说明

三种产物，三种构建方式。日常开发不需要构建 —— 直接起一个静态服务器改代码就行。

---

## 1. 开发：直接跑

```bash
cd 作品
python -m http.server 8080
# 打开 http://localhost:8080
```

改 `index.html` / `app.css` / 任意 `.js`，刷新即可，没有编译步骤。

> 不要用 `file://` 双击打开。浏览器会限制 `XMLHttpRequest` 读本地文件，题库加载不到，页面只有空壳。

## 2. 单文件离线版

```bash
node scripts/build-singlefile.js
```

产出 `作品-手机版.html`（约 6MB），把它拷到任何设备双击即可用。

做四件事：

1. 把 11 个 `<script src>` 内联进 HTML
2. 内联 `app.css`
3. 内联 KaTeX 样式，并把 20 个 `woff2` 字体转成 base64
4. 把 app 图标转 base64、去掉 `manifest` 引用和 Service Worker 注册

**为什么要内联字体**：单文件版没有 `vendor/fonts/` 目录，外链字体会 404，KaTeX 公式会整体错位。

构建结束会打印「残留外链」，正常应该是 `无`。如果有，说明漏了某类资源。

## 3. 题库 JSON

```bash
node scripts/build-bank-json.js
```

把 `bank.js` + `bank_extra.js` 里的 JS 对象执行出来，序列化成 `bank.json`（约 2.5MB）。

**为什么需要这一步**：运行时直接解析 3MB 的 JS 对象字面量，在 Android WebView 上要好几秒，会卡死主线程触发 ANR。`JSON.parse` 是原生实现，实测能压到 20–50ms。

页面优先读 `bank.json`，读不到才回落到 `bank.js`（单文件版走这条）。

## 4. 安卓 APK

需要本地 Android SDK（`aapt2`、`d8`、`apksigner`）和 JDK 8。

仓库不含 SDK，也不含打包脚本（它依赖本机路径）。流程如下：

```
1. 生成 assets/
   - index.html（注入 ai_default.js 引用）
   - app.css
   - 全部 .js（除 sw.js）
   - bank.json
   - vendor/katex.min.js + katex.min.css + fonts/*.woff2
   - icons/

2. 编译资源
   aapt2 compile -o compiled/ res/**/*.xml
   aapt2 link -o base.apk -I android.jar --manifest AndroidManifest.xml compiled/*.flat

3. 编译 Java 并转 dex
   javac -classpath android.jar -d classes/ MainActivity.java
   d8 --output dex/ classes/**/*.class

4. 合并 + 签名
   aapt2 link --java ... （或直接把 dex + assets 塞进 zip）
   zipalign -f 4 unsigned.apk aligned.apk
   apksigner sign --ks release.jks aligned.apk
```

### 两个必须注意的点

**① `file://` 下要开放本地文件读取**

```java
WebSettings s = web.getSettings();
s.setAllowFileAccess(true);
s.setAllowFileAccessFromFileURLs(true);   // 否则 XHR 读不到 bank.json
s.setAllowUniversalAccessFromFileURLs(true);
```

**② 不要用 `fetch()` 读本地文件**

Chromium 的 `fetch` 走网络栈，不支持 `file://` scheme，会静默失败。必须用 `XMLHttpRequest`，且在 `file://` 下 `xhr.status === 0`，判断条件要写成：

```js
if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) { /* 成功 */ }
```

这个坑很隐蔽：`fetch` 失败后会静默回落到 `<script>` 加载，看起来能用，但 ANR 根本没修掉。

## 5. 内嵌 AI Key（可选）

默认需要用户在「我的」里自己填 Key。如果你想打包一个开箱即用的自用版本：

```bash
node scripts/gen-ai-default.js
```

读取本机配置，生成 `ai_default.js`：

```js
window.__AI_DEFAULT__ = { baseUrl, model, visionModel, key };
```

打进 APK 后，页面的配置优先级变成：

```
本机 localStorage 填的  >  内嵌的 ai_default.js  >  默认值
```

> ⚠️ `ai_default.js` 已在 `.gitignore` 中。**内嵌了 Key 的安装包不要分发给别人**，别人装上就能用你的额度。

## 6. PWA 部署

`作品/` 目录本身就是完整 PWA：

- `manifest.json` 提供安装信息
- `sw.js` 缓存全部资源，支持离线打开

部署到任意静态托管（GitHub Pages / Cloudflare Pages / Vercel）即可。HTTP 环境下 Service Worker 才会注册（`file://` 下自动跳过）。

改资源后记得把 `sw.js` 里的 `CACHE` 版本号 +1，否则用户拿到的是旧缓存。

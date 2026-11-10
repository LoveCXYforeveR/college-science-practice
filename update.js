/* ==================================================================
   联网检测更新（update.js）

   三种载体的能力完全不同，这里分开处理：

   · 在线版（GitHub Pages）—— Service Worker 已经负责换新，这里只做版本提示
   · 手机 APK —— assets/ 是只读的，代码换不了。能做到的是
       ① 内容热更：题库 / 套卷解答走 IndexedDB 覆盖，加题不用重装 APK
       ② 主程序提示：有新版就在「我的」里提示，并交给原生下载器
   · 桌面版 —— 同一套逻辑，内容热更一样生效

   设计原则：宁可什么都不做，也不能拖慢启动、不能打断作答。
   · 首屏画完 2.5 秒后才发第一个请求
   · 没联网 / 请求失败 / 返回格式不对，一律静默，只记 lastError
   · 内容包先过长度与校验和，再落 IndexedDB，写坏了一律丢弃
   · 只合并数据，不 eval、不替换任何脚本，出错最坏情况是「新题没进来」
   ================================================================== */
(function () {
  "use strict";

  /* 本地主程序版本。必须和 index.html 里 #pmVerText 的初始文案一致，
     _proto/publish_update.js 会校验这两处，不一致直接报错。 */
  var LOCAL_VERSION = "2026.11.10-1500";

  var DEFAULT_SOURCE = "https://lovecxyforever.github.io/college-science-practice/";
  var LS_SOURCE = "sd_update_source";      /* 可覆盖的内容源（设置里留好了口子） */
  var LS_STATE  = "sd_update_state";
  var DB_NAME   = "sd_update_v1";
  var STORE     = "kv";

  /* ------------------------------------------------------------------
     状态：只放标量和小数组，内容包本身在 IndexedDB 里
     ------------------------------------------------------------------ */
  var state = {
    checkedAt: 0,
    remoteApp: "",
    remoteContent: "",
    notes: [],
    pack: null,
    apk: null,
    hasApp: false,
    hasContent: false,
    appliedContent: "",
    lastError: "",
    lastToastAt: 0,
    busy: ""
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_STATE);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return;
      for (var k in state) {
        if (Object.prototype.hasOwnProperty.call(state, k) && o[k] !== undefined) state[k] = o[k];
      }
      state.busy = "";
    } catch (e) {}
  }
  function saveState() {
    try {
      var o = {};
      for (var k in state) {
        if (!Object.prototype.hasOwnProperty.call(state, k)) continue;
        if (k === "busy") continue;
        o[k] = state[k];
      }
      localStorage.setItem(LS_STATE, JSON.stringify(o));
    } catch (e) {}
  }

  /* ------------------------------------------------------------------
     工具
     ------------------------------------------------------------------ */
  function sourceBase() {
    var s = "";
    try { s = localStorage.getItem(LS_SOURCE) || ""; } catch (e) {}
    s = String(s || DEFAULT_SOURCE).replace(/\s+/g, "");
    if (!/^https?:\/\//i.test(s)) s = DEFAULT_SOURCE;
    if (s.charAt(s.length - 1) !== "/") s += "/";
    return s;
  }

  /* 版本号分段比较：2026.11.10-1500 这种格式，逐段比数字。
     直接字符串比较会在 2026.11.9 和 2026.11.10 上翻车。 */
  function verCmp(a, b) {
    var pa = String(a || "").split(/[^0-9]+/);
    var pb = String(b || "").split(/[^0-9]+/);
    var n = Math.max(pa.length, pb.length);
    for (var i = 0; i < n; i++) {
      var x = parseInt(pa[i], 10), y = parseInt(pb[i], 10);
      if (isNaN(x)) x = 0;
      if (isNaN(y)) y = 0;
      if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
  }

  /* FNV-1a 32 位。只用来挡「下了一半」「被中间设备改坏」，
     不做安全用途 —— 内容源本来就是自己的仓库。 */
  function cksum(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  }

  /* 文本请求。file:// 下 XHR 请求 https 是允许的（Pages 回 Access-Control-Allow-Origin: *），
     所以 APK 里也能用；不能用 fetch —— file:// 页面里它行为不一致。 */
  function reqText(url, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var xhr = new XMLHttpRequest();
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        try { xhr.abort(); } catch (e) {}
        reject(new Error("请求超时"));
      }, ms || 8000);

      xhr.open("GET", url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4 || done) return;
        done = true;
        clearTimeout(timer);
        var txt = xhr.responseText || "";
        /* file:// 下 status 恒为 0，拿到内容就算成功（和 ensureBank 同一套判断） */
        if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && txt)) resolve(txt);
        else reject(new Error(xhr.status ? "HTTP " + xhr.status : "连不上内容源，检查网络"));
      };
      try { xhr.send(); }
      catch (e) { done = true; clearTimeout(timer); reject(e); }
    });
  }

  /* ------------------------------------------------------------------
     IndexedDB：只用一个 key-value store，键固定为 "content"
     内容包对象直接 structured clone 存进去，读回来不用再 JSON.parse
     ------------------------------------------------------------------ */
  var _dbp = null;
  function openDB() {
    if (_dbp) return _dbp;
    _dbp = new Promise(function (resolve, reject) {
      var idb = window.indexedDB || window.webkitIndexedDB;
      if (!idb) { reject(new Error("这台设备不支持本地缓存")); return; }
      var r;
      try { r = idb.open(DB_NAME, 1); } catch (e) { reject(e); return; }
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error || new Error("本地缓存打不开")); };
      r.onblocked = function () { reject(new Error("本地缓存被占用")); };
    });
    /* 失败不缓存，下次还能再试一次 */
    _dbp["catch"](function () { _dbp = null; });
    return _dbp;
  }

  function idbOp(mode, fn) {
    return openDB().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(STORE, mode);
        var req = fn(t.objectStore(STORE));
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  /* ------------------------------------------------------------------
     覆盖层：更新过的题库 / 套卷解答，进程内只保留一份
     ------------------------------------------------------------------ */
  var overlay = { version: "", solutions: [], bank: null };
  var overlayDone = false;
  var _resolveReady = null;
  var ready = new Promise(function (r) { _resolveReady = r; });

  function loadOverlay() {
    return idbOp("readonly", function (s) { return s.get("content"); })
      .then(function (rec) {
        if (rec && rec.data) {
          overlay.version = rec.version || "";
          overlay.solutions = Array.isArray(rec.data.solutions) ? rec.data.solutions : [];
          overlay.bank = (rec.data.bank && typeof rec.data.bank === "object") ? rec.data.bank : null;
          /* 本地记录丢了（清过缓存）但内容还在，这里补回已应用版本号 */
          if (overlay.version && !state.appliedContent) {
            state.appliedContent = overlay.version;
            saveState();
          }
        }
      })
      ["catch"](function () {})
      .then(function () {
        overlayDone = true;
        if (_resolveReady) { _resolveReady(); _resolveReady = null; }
        tryMergeBank();
        /* 只有套卷解答被覆盖、题库没动时 tryMergeBank 不会刷新。
           这里补一次，延后到启动完成之后，避免和首屏抢渲染。 */
        if (overlay.solutions && overlay.solutions.length) {
          setTimeout(function () { refreshViews(); }, 900);
        }
        return overlay;
      });
  }

  function saveOverlay(version, data) {
    return idbOp("readwrite", function (s) {
      return s.put({ version: version, data: data, at: Date.now() }, "content");
    });
  }

  function clearOverlay() {
    return idbOp("readwrite", function (s) { return s["delete"]("content"); })
      .then(function () {
        overlay.version = "";
        overlay.solutions = [];
        overlay.bank = null;
        state.appliedContent = "";
        state.hasContent = false;
        saveState();
      });
  }

  /* ------------------------------------------------------------------
     题库合并
     覆盖层先到 / 题库先到，两个方向都要能对齐，所以调用点有两处：
       · loadOverlay() 完成后（题库已就绪就立刻补）
       · ensureBank() 建 PAPER 之前（题库后到就顺手并进去）
     mergeBank 本身幂等：按卷 id 命中、按题干去重，重复调用不会长出重复题。
     ------------------------------------------------------------------ */
  function mergeBank() {
    if (!overlay.bank) return false;
    if (typeof BANK === "undefined" || !BANK) return false;
    var changed = false;

    Object.keys(overlay.bank).forEach(function (subj) {
      var incoming = overlay.bank[subj];
      if (!Array.isArray(incoming)) return;
      if (!Array.isArray(BANK[subj])) { BANK[subj] = []; changed = true; }
      var target = BANK[subj];

      incoming.forEach(function (paper) {
        if (!paper || !paper.id) return;
        var hit = null;
        for (var i = 0; i < target.length; i++) {
          if (target[i] && target[i].id === paper.id) { hit = target[i]; break; }
        }
        if (!hit) { target.push(paper); changed = true; return; }
        /* 已有这张卷：按题干去重后追加新题，不动原有的题和顺序 */
        var add = Array.isArray(paper.questions) ? paper.questions : [];
        if (!Array.isArray(hit.questions)) { hit.questions = []; }
        var seen = {};
        hit.questions.forEach(function (q) { if (q && q.q) seen[q.q] = 1; });
        add.forEach(function (q) {
          if (!q || !q.q || seen[q.q]) return;
          seen[q.q] = 1;
          hit.questions.push(q);
          changed = true;
        });
      });
    });
    return changed;
  }

  function tryMergeBank() {
    if (!overlay.bank) return;
    if (typeof BANK === "undefined" || !BANK) return;
    var changed = false;
    try { changed = mergeBank(); } catch (e) { return; }
    if (!changed) return;
    try { if (typeof buildBankPapers === "function") buildBankPapers(); } catch (e) {}
    try { if (typeof renderSubjectTabs === "function") renderSubjectTabs(); } catch (e) {}
    try { if (typeof renderPaperTabs === "function") renderPaperTabs(); } catch (e) {}
    refreshViews();
  }

  /* 套卷解答：把覆盖层里的题并进列表，id 重复时以本地自带为准。
     这个函数会在每次 solPapersList() 时被调用，所以更新完立刻能看到，不用重启。 */
  function extraSolutions() {
    if (!overlay.solutions || !overlay.solutions.length) return [];
    var have = {};
    if (typeof SOLUTION_PAPERS !== "undefined" && Array.isArray(SOLUTION_PAPERS)) {
      SOLUTION_PAPERS.forEach(function (x) { if (x && x.id) have[x.id] = 1; });
    }
    return overlay.solutions.filter(function (x) { return x && x.id && !have[x.id]; });
  }

  /* ------------------------------------------------------------------
     视图刷新：只刷当前那个，且不动刷题中的状态
     ------------------------------------------------------------------ */
  function refreshViews() {
    var v = (typeof currentView !== "undefined") ? currentView : "";
    try {
      if (v === "practice") {
        /* 正在做题就别重建网格了，不然会把进度抖掉 */
        var inQuiz = (typeof bankView !== "undefined" && bankView === "quiz");
        if (!inQuiz) {
          if (typeof renderBankTools === "function") renderBankTools();
          if (typeof renderSubjectTabs === "function") renderSubjectTabs();
          if (typeof renderPaperTabs === "function") renderPaperTabs();
          if (typeof renderBankGrid === "function") renderBankGrid();
        }
      } else if (v === "solution") {
        if (typeof renderSolutionView === "function") renderSolutionView();
      } else if (v === "wrong") {
        if (typeof renderWrongView === "function") renderWrongView();
      } else if (v === "home") {
        if (typeof renderHome === "function") renderHome();
      }
    } catch (e) {}
    try { if (typeof updateSubtitle === "function") updateSubtitle(); } catch (e) {}
    markDot();
  }

  /* ------------------------------------------------------------------
     检测
     ------------------------------------------------------------------ */
  function appliedVersion() {
    return state.appliedContent || overlay.version || "";
  }

  function check() {
    var base = sourceBase();
    state.busy = "check";
    state.lastError = "";
    markUI();

    return reqText(base + "version.json?t=" + Date.now(), 8000)
      .then(function (txt) {
        var v;
        try { v = JSON.parse(txt); } catch (e) { throw new Error("清单不是合法 JSON"); }
        if (!v || (!v.app && !v.content)) throw new Error("清单缺少版本号");

        state.checkedAt = Date.now();
        state.remoteApp = String(v.app || "");
        state.remoteContent = String(v.content || "");
        state.notes = Array.isArray(v.notes) ? v.notes.slice(0, 10) : [];
        state.pack = (v.pack && v.pack.url) ? v.pack : null;
        state.apk = (v.apk && v.apk.url) ? v.apk : null;

        if (state.pack && !/^https?:/i.test(String(state.pack.url))) {
          state.pack.url = base + String(state.pack.url).replace(/^\.?\//, "");
        }
        state.hasApp = !!state.remoteApp && verCmp(state.remoteApp, LOCAL_VERSION) > 0;
        state.hasContent = !!state.pack && !!state.remoteContent &&
                           verCmp(state.remoteContent, appliedVersion()) > 0;

        state.busy = "";
        saveState();
        markUI();
        /* 排障打点：和 BOOT_READY / BANK_JSON_OK 一套，不影响用户 */
        try {
          console.log("UPDATE_CHECK_OK app=" + state.remoteApp + " content=" + state.remoteContent +
                      " hasContent=" + (state.hasContent ? 1 : 0) + " hasApp=" + (state.hasApp ? 1 : 0));
        } catch (e) {}
        return state;
      })
      ["catch"](function (e) {
        state.busy = "";
        state.lastError = (e && e.message) ? e.message : "网络不可用";
        saveState();
        markUI();
        try { console.log("UPDATE_CHECK_FAIL " + state.lastError); } catch (er) {}
        throw e;
      });
  }

  /* ------------------------------------------------------------------
     应用内容包
     校验顺序：下载完整 → 长度 → 校验和 → JSON → 字段结构 → 非空
     任何一步不过就整包丢弃，本地保持原样
     ------------------------------------------------------------------ */
  function applyContent() {
    var p = state.pack;
    if (!p || !p.url) return Promise.reject(new Error("没有可用的内容包"));

    state.busy = "download";
    state.lastError = "";
    markUI();

    var url = String(p.url);
    if (url.indexOf("?") < 0) url += "?v=" + encodeURIComponent(state.remoteContent || "");

    return reqText(url, 30000)
      .then(function (txt) {
        if (p.chars && txt.length !== Number(p.chars)) {
          throw new Error("内容包不完整（" + txt.length + "/" + p.chars + "）");
        }
        if (p.checksum && cksum(txt) !== String(p.checksum)) {
          throw new Error("内容包校验失败");
        }
        var data;
        try { data = JSON.parse(txt); } catch (e) { throw new Error("内容包不是合法 JSON"); }
        if (data.solutions !== undefined && !Array.isArray(data.solutions)) {
          throw new Error("solutions 字段格式不对");
        }
        if (data.bank !== undefined && (typeof data.bank !== "object" || !data.bank)) {
          throw new Error("bank 字段格式不对");
        }

        var nSol = Array.isArray(data.solutions) ? data.solutions.length : 0;
        var nQ = 0;
        if (data.bank) {
          Object.keys(data.bank).forEach(function (k) {
            var arr = Array.isArray(data.bank[k]) ? data.bank[k] : [];
            arr.forEach(function (pp) {
              nQ += (pp && Array.isArray(pp.questions)) ? pp.questions.length : 0;
            });
          });
        }
        if (!nSol && !nQ) throw new Error("内容包是空的");

        return saveOverlay(state.remoteContent, data).then(function () {
          overlay.version = state.remoteContent;
          overlay.solutions = Array.isArray(data.solutions) ? data.solutions : [];
          overlay.bank = data.bank || null;

          state.appliedContent = state.remoteContent;
          state.hasContent = false;
          state.busy = "";
          saveState();

          /* 就地生效：套卷列表下次取值就带着新题，题库立刻重建 */
          tryMergeBank();
          refreshViews();
          markUI();
          try {
            console.log("UPDATE_APPLIED v=" + state.appliedContent +
                        " sol=" + nSol + " q=" + nQ);
          } catch (e) {}
          return { solutions: nSol, questions: nQ };
        });
      })
      ["catch"](function (e) {
        state.busy = "";
        state.lastError = (e && e.message) ? e.message : "更新失败";
        saveState();
        markUI();
        throw e;
      });
  }

  /* ------------------------------------------------------------------
     主程序更新：APK 走原生下载器，其它载体直接开链接
     不做静默安装 —— 那需要安装未知应用权限，还要用户手动放行，
     体验上是「点了没反应」的重灾区，不如老实把包放进下载目录。
     ------------------------------------------------------------------ */
  function downloadApp() {
    var a = state.apk;
    if (!a || !a.url) return false;
    var url = String(a.url);
    var name = "作品-" + (state.remoteApp || "new") + ".apk";

    try {
      if (window.AndroidUI && typeof window.AndroidUI.download === "function") {
        window.AndroidUI.download(url, name);
        return true;
      }
    } catch (e) {}
    /* 浏览器 / 桌面版：新窗口打开，交给浏览器自己的下载 */
    try {
      var w = window.open(url, "_blank");
      if (!w) location.href = url;
      return true;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------
     小红点：「我的」入口上有一点，比弹 toast 安静，也不会打断答题
     ------------------------------------------------------------------ */
  function markDot() {
    var btn = document.getElementById("profileBtn");
    if (!btn) return;
    /* 只在「用户真能做成点什么」的时候亮：有内容可更新，或者主程序有下载地址。
       主程序有新版本但没配下载地址时只在面板里留一行说明，不做无效提醒。 */
    var canDo = !!state.hasContent || !!(state.hasApp && state.apk && state.apk.url);
    if (canDo) btn.classList.add("has-dot");
    else btn.classList.remove("has-dot");
  }

  /* ------------------------------------------------------------------
     人话化的状态文案
     ------------------------------------------------------------------ */
  function agoText(ts) {
    if (!ts) return "";
    var d = Date.now() - ts;
    if (d < 60000) return "刚刚检查";
    if (d < 3600000) return Math.floor(d / 60000) + " 分钟前检查";
    if (d < 86400000) return Math.floor(d / 3600000) + " 小时前检查";
    return Math.floor(d / 86400000) + " 天前检查";
  }
  function kbText(n) {
    var b = Number(n) || 0;
    if (!b) return "";
    if (b < 1024) return b + " B";
    if (b < 1048576) return Math.round(b / 1024) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  }

  /* 面板里的那块区域：全部由这里渲染，index.html 只留骨架 */
  function renderPanel() {
    var body = document.getElementById("pmUpdBody");
    var btn = document.getElementById("pmCheckBtn");
    var verEl = document.getElementById("pmVerText");
    if (verEl) verEl.textContent = LOCAL_VERSION;
    if (btn) {
      btn.disabled = !!state.busy;
      btn.textContent = state.busy === "check" ? "检查中…"
                      : (state.busy === "download" ? "更新中…" : "检查更新");
    }
    if (!body) return;

    var html = "";
    var packBytes = state.pack ? kbText(state.pack.bytes) : "";

    if (state.busy === "download") {
      html = '<div class="upd-note">正在下载内容包…</div>';
    } else if (state.hasContent || state.hasApp) {
      html += '<div class="upd-card">';
      html += '<div class="upd-card-t">可用更新</div>';

      if (state.hasContent) {
        html += '<div class="upd-row">';
        html += '<div class="upd-row-h"><span class="upd-tag">内容</span>' +
                '<span class="upd-ver">' + esc(state.remoteContent) + '</span>' +
                (packBytes ? '<span class="upd-size">' + packBytes + '</span>' : '') + '</div>';
        html += '<div class="upd-row-b">新增题库与套卷解答会直接合并进来，装好的 APK 不用重装。</div>';
        html += '</div>';
      }
      if (state.hasApp) {
        html += '<div class="upd-row">';
        html += '<div class="upd-row-h"><span class="upd-tag app">主程序</span>' +
                '<span class="upd-ver">' + esc(state.remoteApp) + '</span>' +
                (state.apk && state.apk.bytes ? '<span class="upd-size">' + kbText(state.apk.bytes) + '</span>' : '') + '</div>';
        html += '<div class="upd-row-b">' +
                (state.apk && state.apk.url
                  ? '下载后到系统「下载」目录点一下安装即可覆盖，记录不会丢。'
                  : '还没有可用的下载地址：把新版 APK 传到能直链访问的位置，再填进清单的 apk.url。') +
                '</div>';
        html += '</div>';
      }

      if (state.notes && state.notes.length) {
        html += '<ul class="upd-notes">';
        state.notes.forEach(function (n) {
          if (n) html += '<li>' + esc(String(n)) + '</li>';
        });
        html += '</ul>';
      }

      html += '<div class="upd-acts">';
      if (state.hasContent) {
        html += '<button class="upd-go" type="button" data-act="apply">立即更新' +
                (packBytes ? ' · ' + packBytes : '') + '</button>';
      }
      if (state.hasApp && state.apk && state.apk.url) {
        html += '<button class="upd-go ghost" type="button" data-act="apk">下载新版本</button>';
      }
      html += '</div></div>';
    } else if (state.checkedAt) {
      html = '<div class="upd-note">已是最新' +
             (state.remoteContent ? '（内容 ' + esc(state.remoteContent) + '）' : '') +
             ' · ' + agoText(state.checkedAt) + '</div>';
    } else if (state.lastError) {
      html = '<div class="upd-note bad">检查失败：' + esc(state.lastError) + '</div>';
    } else {
      html = '<div class="upd-note">还没检查过。联网后点右上角「检查更新」。</div>';
    }

    if (state.lastError && (state.checkedAt || state.hasContent)) {
      html += '<div class="upd-note bad">检查失败：' + esc(state.lastError) + '（可以再点一次「检查更新」）</div>';
    }

    body.innerHTML = html;

    var acts = body.querySelectorAll("[data-act]");
    for (var i = 0; i < acts.length; i++) {
      (function (el) {
        el.addEventListener("click", function () {
          var act = el.getAttribute("data-act");
          if (act === "apply") {
            el.disabled = true;
            applyContent().then(function (r) {
              var msg = "已更新";
              if (r.solutions) msg += " · 解答题 " + r.solutions;
              if (r.questions) msg += " · 题目 " + r.questions;
              try { toast(msg + "，马上可用"); } catch (e) {}
            })["catch"](function (e) {
              try { toast("更新失败：" + ((e && e.message) || "未知原因")); } catch (er) {}
            });
          } else if (act === "apk") {
            if (!downloadApp()) {
              try { toast("没有可用的下载地址"); } catch (e) {}
            }
          }
        });
      })(acts[i]);
    }
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* markUI = 小红点 + 面板。面板没打开时 renderPanel 会因为没有节点而安全返回 */
  function markUI() {
    markDot();
    try { renderPanel(); } catch (e) {}
  }

  /* ------------------------------------------------------------------
     启动
     首屏画完再等 2.5s 才发请求：这个时间点用户已经在看首页了，
     请求和渲染不抢主线程，也不会拖慢启动页。
     ------------------------------------------------------------------ */
  var _booted = false;
  function boot() {
    if (_booted) return;
    _booted = true;

    loadState();
    loadOverlay();
    markDot();

    if (navigator.onLine === false) {
      /* 明确离线就不发请求了，等下次联网再说 */
      return;
    }
    setTimeout(function () {
      check()["catch"](function () {});
    }, 2500);
  }

  /* ------------------------------------------------------------------
     对外接口
     ------------------------------------------------------------------ */
  window.UPDATE = {
    version: LOCAL_VERSION,
    state: state,
    ready: ready,
    isOverlayDone: function () { return overlayDone; },
    overlay: overlay,
    boot: boot,
    check: check,
    applyContent: applyContent,
    downloadApp: downloadApp,
    renderPanel: function () { try { renderPanel(); } catch (e) {} },
    extraSolutions: extraSolutions,
    mergeBank: mergeBank,
    tryMergeBank: tryMergeBank,
    clearOverlay: clearOverlay,
    sourceBase: sourceBase,
    setSource: function (s) {
      try { localStorage.setItem(LS_SOURCE, String(s || "")); } catch (e) {}
    },
    verCmp: verCmp,
    cksum: cksum
  };
})();

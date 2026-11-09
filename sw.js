const CACHE = "sd-math-pwa-v42";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./knowledge.js",
  "./practice.js",
  "./papers_core.js",
  "./papers_extra.js",
  "./bank.js",
  "./bank_extra.js",
  "./solutions.js",
  "./solutions_bank.js",
  "./solution_traps.js",
  "./solution_fix.js",
  "./solution_ai_answers.js",
  "./solution_extra.js",
  "./vendor/katex.min.js",
  "./manifest.json",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(ASSETS.map(function(u){
        return c.add(u).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  if (e.request.method !== "GET") return;
  var req = e.request;
  var isPage = req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1;

  // 页面文档走「网络优先」：改动一发布，下次打开就是新界面；离线才回退缓存
  if (isPage) {
    // 只有真正的首页才写进离线回退，避免其它 .html 页面污染 index.html 缓存
    var path = new URL(req.url).pathname;
    var isHome = path === "/" || /\/index\.html$/.test(path);
    e.respondWith(
      fetch(req, { cache: "no-store" }).then(function(res){
        if (res && res.status === 200 && isHome) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put("./index.html", copy); }).catch(function(){});
        }
        return res;
      }).catch(function(){
        return caches.match("./index.html").then(function(hit){
          return hit || caches.match("./") || Response.error();
        });
      })
    );
    return;
  }

  // 静态资源走「先用缓存、后台更新」：离线照常用，联网时自动把新版写回缓存，
  // 下次打开就是新文件。避免旧缓存永久卡住（以前改了 js 必须手动清缓存）。
  e.respondWith(
    caches.match(req).then(function(cached){
      var network = fetch(req).then(function(res){
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        }
        return res;
      }).catch(function(){
        return cached || Response.error();
      });
      return cached || network;
    })
  );
});

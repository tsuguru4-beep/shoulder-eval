// オフライン用。アプリ本体は端末にキャッシュし、2回目以降は電波がなくても起動する。
// 20261008005610 はビルド時に置き換わる。更新を配るときはビルドし直すだけでよい。
const CACHE = "shoulder-eval-20261008005610";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", e => {
  // cache:"reload" でブラウザの一時保存を飛ばし、必ずサーバーから最新を取る（古い版を新しい版として保存しないため）
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: "reload"})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      // 同じ github.io 上の他のアプリ（腰部など）のキャッシュは消さない
      .then(keys => Promise.all(keys.filter(k => k.startsWith("shoulder-eval-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts：あればキャッシュを使い、裏で更新する。取れなくても端末のフォントで表示できる。
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // アプリ本体：キャッシュ優先。画面遷移はオフライン時も index.html を返す。
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).catch(() =>
      req.mode === "navigate" ? caches.match("./index.html") : undefined
    ))
  );
});

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve("dist");
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : [path.join(dir, e.name)],
    );
}
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const registration =
  '<script>if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}</script>';
if (!html.includes("serviceWorker")) {
  html = html.replace("</body>", registration + "</body>");
  fs.writeFileSync(path.join(root, "index.html"), html);
}
const all = files(root).filter((f) => !f.endsWith("/sw.js"));
const version = crypto.createHash("sha256");
all.forEach((f) => version.update(fs.readFileSync(f)));
const key = "poker-academy-" + version.digest("hex").slice(0, 16);
const list = all.map(
  (f) => "./" + path.relative(root, f).split(path.sep).join("/"),
);
fs.writeFileSync(
  path.join(root, "sw.js"),
  `const CACHE=${JSON.stringify(key)};const FILES=${JSON.stringify(list)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('poker-academy-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request))||fetch(e.request).catch(async error=>{if(e.request.mode==='navigate')return c.match(new URL('./index.html',self.registration.scope));throw error;})));});`,
);
console.log(
  `Offline web cache generated (${list.length} files). Requires HTTPS or localhost. Initial online visit required.`,
);

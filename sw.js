/* Static demo shell only. No authenticated API responses are cached. */
const NAME="montana-demo-v0.2";
const URLS=["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./assets/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(NAME).then(c=>c.addAll(URLS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||Response.error())))});
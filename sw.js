/* Public storefront shell only. Never cache Supabase API, FX rates, or private customer data. */
const CACHE="montana-shell-images-20261119-v1";
const STATIC=["./","./index.html","./styles.css","./stage2.js","./app.js","./manifest.webmanifest","./assets/icon.svg","./assets/products/galaxy-s25-ultra.webp","./assets/products/galaxy-a56-5g.webp","./assets/products/xiaomi-15-ultra.webp","./assets/products/poco-x7-pro.webp","./assets/products/honor-400-pro.webp","./assets/products/iphone-16-pro.webp"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 const req=e.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
 if(req.mode==="navigate"){
   e.respondWith(fetch(req).catch(()=>caches.match("./index.html")));return;
 }
 e.respondWith(fetch(req).then(resp=>{if(resp.ok&&STATIC.some(p=>new URL(p,self.location).pathname===url.pathname)){const copy=resp.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)))}return resp}).catch(()=>caches.match(req)));
});
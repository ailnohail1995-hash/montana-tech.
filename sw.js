/* Public storefront shell only. Never cache Supabase API, FX rates, or private customer data. */
const CACHE="montana-35-phone-catalog-v2";
const STATIC=["./","./index.html","./styles.css","./stage2.js","./app.js","./manifest.webmanifest","./assets/icon.svg","./assets/products/realme-gt-8-pro.webp","./assets/products/tecno-camon-40-pro.webp","./assets/products/tecno-spark-40-pro-plus.webp","./assets/products/infinix-gt-30-pro.webp","./assets/products/infinix-note-60-pro.webp","./assets/products/galaxy-s26-ultra.webp","./assets/products/galaxy-s26-plus.webp","./assets/products/galaxy-s26.webp","./assets/products/galaxy-a57-5g.webp","./assets/products/galaxy-a37-5g.webp","./assets/products/galaxy-a17-5g.webp","./assets/products/iphone-17-pro-max.webp","./assets/products/iphone-17-pro.webp","./assets/products/iphone-17.webp","./assets/products/iphone-air.webp","./assets/products/iphone-17e.webp","./assets/products/xiaomi-17-ultra.webp","./assets/products/xiaomi-17.webp","./assets/products/redmi-note-15-pro-plus-5g.webp","./assets/products/poco-f8-ultra.webp","./assets/products/poco-f8-pro.webp","./assets/products/honor-magic8-pro.webp","./assets/products/honor-600-pro.webp","./assets/products/honor-x9d.webp","./assets/products/oppo-find-x9-pro.webp","./assets/products/oppo-reno15-pro-5g.webp","./assets/products/vivo-x300-pro.webp","./assets/products/vivo-v60.webp","./assets/products/realme-15-pro-5g.webp","./assets/products/galaxy-s25-ultra.webp","./assets/products/galaxy-a56-5g.webp","./assets/products/xiaomi-15-ultra.webp","./assets/products/poco-x7-pro.webp","./assets/products/honor-400-pro.webp","./assets/products/iphone-16-pro.webp"];
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
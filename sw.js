/* FONKORA public PWA: cache only app shell upfront, product photos on demand.
 * Never cache live FX, Supabase API or private customer data. */
const CACHE="fonkora-three-currencies-20261120-v1";
const STATIC=["./","./index.html","./styles.css","./stage2.js","./app.js","./manifest.webmanifest","./assets/icon.svg"];
self.addEventListener("install",event=>event.waitUntil(
 caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())
));
self.addEventListener("activate",event=>event.waitUntil(
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
 if(request.mode==="navigate"){
  event.respondWith(fetch(request).catch(()=>caches.match("./index.html")));return;
 }
 const isPhoto=url.pathname.startsWith("/assets/products/")&&url.pathname.endsWith(".webp");
 const isShell=STATIC.some(path=>new URL(path,self.location).pathname===url.pathname);
 if(!isPhoto&&!isShell)return;
 event.respondWith(fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}
  return response;
 }).catch(()=>caches.match(request).then(hit=>hit||Response.error())));
});
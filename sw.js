const C='hales-inspection-v2';
const A=['./','./index.html','./styles.css','./app.js','./manifest.json'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>c.addAll(A)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(C).then(cache=>cache.put(e.request,copy));
        return response;
      })
      .catch(()=>caches.match(e.request))
  );
});

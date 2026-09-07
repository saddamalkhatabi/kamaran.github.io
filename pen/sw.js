var CACHE='noor-draw-v4';
var FILES=['./','./index.html','./manifest.json'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES)}));self.skipWaiting&&self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){if(k!==CACHE)return caches.delete(k)}))}));self.clients&&self.clients.claim&&self.clients.claim()});
self.addEventListener('fetch',function(e){e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request).then(function(resp){var copy=resp.clone();caches.open(CACHE).then(function(c){c.put(e.request,copy)});return resp}).catch(function(){return caches.match('./index.html')})}))});
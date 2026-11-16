/** Explicit, complete-pack download. Existing installed content survives interrupted updates. */
export const WORKER = String.raw`
const META='poker-offline-meta-v1',KEY='/__poker_offline_active__',PREFIX='poker-offline-pack-';
let downloading=false;
async function digest(response){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function active(){const r=await (await caches.open(META)).match(KEY);return r?await r.json():null}
async function healthy(){const p=await active();if(!p||!await caches.has(p.name))return false;const c=await caches.open(p.name);for(const u of p.urls){const r=await c.match(u);if(!r)return false;if(p.integrity?.[u]&&await digest(r)!==p.integrity[u])return false;}return true}
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 const send=value=>event.source&&event.source.postMessage(value);
 if(event.data?.type==='STATUS'){event.waitUntil(healthy().then(ready=>send({type:'STATUS',ready})).catch(()=>send({type:'STATUS',ready:false})));return}
 if(event.data?.type==='REMOVE'){event.waitUntil((async()=>{if(downloading){send({type:'ERROR',message:'Wait for the current download first.'});return}for(const name of await caches.keys())if(name.startsWith(PREFIX)||name===META)await caches.delete(name);await self.registration.unregister();send({type:'REMOVED'})})());return}
 if(event.data?.type!=='DOWNLOAD')return;
 event.waitUntil((async()=>{
  if(downloading){send({type:'ERROR',message:'An offline download is already running.'});return}
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  if(windows.some(c=>new URL(c.url).pathname==='/play')){send({type:'ERROR',message:'Leave simulator tabs before downloading or updating the offline pack. Your live hand remains saved.'});return}
  downloading=true;let name=null;
  try{
   const response=await fetch('/offline-assets.json',{cache:'no-store'});if(!response.ok)throw Error('Offline packs are available in a production build.');const manifest=await response.json();
   if(!Array.isArray(manifest.urls)||manifest.urls.length<3||manifest.urls.length>2000||manifest.urls.some(u=>typeof u!=='string'||!u.startsWith('/')||u.startsWith('//')||new URL(u,self.location.origin).origin!==self.location.origin))throw Error('Invalid offline manifest');
   name=PREFIX+manifest.version+'-'+Date.now();const cache=await caches.open(name);let index=0,done=0;
   const jobs=await Promise.allSettled(Array.from({length:6},async()=>{while(index<manifest.urls.length){const u=manifest.urls[index++],r=await fetch(u,{cache:'reload'});if(!r.ok)throw Error('Could not cache '+u);if(manifest.integrity?.[u]&&await digest(r.clone())!==manifest.integrity[u])throw Error('Offline checksum mismatch: '+u);if(u.endsWith('.json')&&!(r.headers.get('content-type')||'').includes('application/json'))throw Error('Invalid JSON content: '+u);if(u==='/'||u==='/ranges'||u==='/play'||u==='/learn'){const html=await r.clone().text();for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const path=new URL(match[1],self.location.origin).pathname;if(path.startsWith('/_next/static/')&&!manifest.urls.includes(path))throw Error('App updated during download; retry.')}}await cache.put(u,r);send({type:'PROGRESS',done:++done,total:manifest.urls.length})}}));if(jobs.some(j=>j.status==='rejected'))throw Error('Offline download was incomplete. Retry while connected.');
   for(const u of manifest.urls)if(!await cache.match(u))throw Error('Incomplete offline pack');
   await (await caches.open(META)).put(KEY,new Response(JSON.stringify({name,urls:manifest.urls,integrity:manifest.integrity??{}}),{headers:{'Content-Type':'application/json'}}));
   for(const old of await caches.keys())if(old.startsWith(PREFIX)&&old!==name)await caches.delete(old);
   send({type:'READY',ready:true});
  }catch(error){if(name)await caches.delete(name);send({type:'ERROR',message:String(error.message||error)})}finally{downloading=false}
 })());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/offline-worker.js'||url.pathname==='/offline-assets.json')return;
 event.respondWith((async()=>{
  const p=await active();if(p){const cache=await caches.open(p.name);const key=event.request.mode==='navigate'?url.pathname:url.pathname+url.search;const hit=await cache.match(key)||await cache.match(url.pathname);if(hit)return hit;}
  try{return await fetch(event.request)}catch(error){return new Response('This content is not downloaded for offline use. Open Learn online and download a complete pack.',{status:503,headers:{'Content-Type':'text/plain'}})}

 })());
});
`

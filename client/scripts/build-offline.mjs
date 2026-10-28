import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../dist/', import.meta.url);
async function walk(directory, prefix = '') {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + item.name;
    if (item.isDirectory()) files.push(...await walk(join(directory, item.name), relative + '/'));
    else if (item.name !== 'sw.js') files.push(relative);
  }
  return files;
}
const files = await walk(fileURLToPath(root));
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(new URL(file, root)));
const version = 'laro-' + hash.digest('hex').slice(0, 12);
const worker = `const CACHE = ${JSON.stringify(version)};
const FILES = ${JSON.stringify(['./', ...files.map(file => './' + file)])};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('laro-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreVary: true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return await cache.match('./');
      throw error;
    }
  }));
});
`;
await writeFile(new URL('sw.js', root), worker);
console.log('Offline cache generated:', version, files.length, 'files');

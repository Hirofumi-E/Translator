const CACHE_NAME = 'translator-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// インストール時にキャッシュを作成
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// アクティベーション時に古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// フェッチイベント：Network first, falling back to cache
self.addEventListener('fetch', event => {
  // APIリクエストはキャッシュしない
  if (event.request.url.includes('translate.googleapis.com') ||
      event.request.url.includes('mymemory.translated.net') ||
      event.request.url.includes('languagetool.org')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // その他のリクエストはキャッシュから提供
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }

      return fetch(event.request).then(response => {
        // ネットワークレスポンスが有効かチェック
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // レスポンスをクローンしてキャッシュに保存
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return response;
      });
    }).catch(() => {
      // オフライン時のフォールバック
      return caches.match(event.request).then(response => {
        if (response) {
          return response;
        }
        // 404ページなどを返す場合はここで
      });
    })
  );
});

(() => {
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!secure || !('serviceWorker' in navigator)) return;

  let registration = null;
  const refresh = () => registration?.update().catch(() => {});

  window.addEventListener('load', async () => {
    try {
      registration = await navigator.serviceWorker.register('./service-worker.js', {
        scope: './',
        updateViaCache: 'none'
      });
      await registration.update();
    } catch (err) {
      console.warn('CaptaPro PWA: service worker registration failed', err);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
  window.addEventListener('online', refresh);
})();

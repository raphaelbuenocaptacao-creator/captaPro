(() => {
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!secure || !('serviceWorker' in navigator)) return;

  let registration = null;
  let refreshing = false;
  let updateTimer = null;

  const refresh = () => registration?.update().catch(() => {});

  const scheduleUpdates = () => {
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) refresh();
    }, 30 * 60 * 1000);
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      registration = await navigator.serviceWorker.register('./service-worker.js', {
        scope: './',
        updateViaCache: 'none'
      });
      await registration.update();
      scheduleUpdates();
    } catch (err) {
      console.warn('CaptaPro PWA: service worker registration failed', err);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });

  window.addEventListener('online', refresh);
  window.addEventListener('pagehide', () => {
    if (updateTimer) clearInterval(updateTimer);
  });
})();

(() => {
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!secure) return;

  let registration = null;
  let deferredInstallPrompt = null;
  const refresh = () => registration?.update().catch(() => {});

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    window.dispatchEvent(new CustomEvent('captapro-install-available'));
  });

  window.installCaptaPro = async () => {
    if (!deferredInstallPrompt) return { available: false, outcome: 'unavailable' };
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    return { available: true, outcome: choice?.outcome || 'dismissed' };
  };

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('captapro-installed'));
  });

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      registration = await navigator.serviceWorker.register('./service-worker.js?v=6-private-vary-star-safe', {
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

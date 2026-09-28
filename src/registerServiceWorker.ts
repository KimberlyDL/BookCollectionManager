import { Capacitor } from '@capacitor/core';

// Only the web/PWA build needs a service worker: the Android app already ships
// every file inside the APK, and the Vite dev server must stay uncached.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      const registration = await navigator.serviceWorker.ready;
      const urls = performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((url) => url.startsWith(location.origin));
      registration.active?.postMessage({ type: 'CACHE_URLS', urls: [location.href, ...urls] });
    } catch {
      // Offline support is a bonus; the app works without it.
    }
  });
}

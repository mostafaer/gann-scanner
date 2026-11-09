/* Register the service worker so the scanner installs on phones and opens offline (outside claude.ai only) */
(function () {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  if (window.claude) return;
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
})();

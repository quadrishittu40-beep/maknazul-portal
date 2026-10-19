// Registers the service worker and shows an "Install app" button when possible
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
(function () {
  var btn = document.getElementById('installBtn'), ios = document.getElementById('iosHint'), ev = null;
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); ev = e; if (btn) btn.style.display = 'inline-block'; });
  if (btn) btn.addEventListener('click', function () { if (!ev) return; ev.prompt(); ev.userChoice.then(function () { ev = null; btn.style.display = 'none'; }); });
  window.addEventListener('appinstalled', function () { if (btn) btn.style.display = 'none'; });
  if (ios && /iphone|ipad|ipod/i.test(navigator.userAgent)) ios.style.display = 'inline';
})();

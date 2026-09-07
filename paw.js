// pwa.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('Service Worker registered'))
    .catch((err) => console.log('SW registration failed', err));
}
// Clean URL Logic inside pwa.js
if (window.location.pathname.endsWith('.html')) {
    const cleanPath = window.location.pathname.replace(/\.html$/, '');
    window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("a").forEach(a => {
        if (a.hostname === window.location.hostname && a.pathname.endsWith(".html")) {
            a.pathname = a.pathname.replace(/\.html$/, "");
        }
    });
});

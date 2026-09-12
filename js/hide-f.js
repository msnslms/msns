  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||  // iOS Safari
    document.referrer.includes('android-app://')
  ) {
    document.documentElement.classList.add('pwa-standalone');
  }

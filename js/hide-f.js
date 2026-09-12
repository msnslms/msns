  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||  // iOS Safari
    document.referrer.includes('android-app://')
  ) {
    document.documentElement.classList.add('pwa-standalone');
  }

/* ==========================================================
   DESKTOP TWO-COLUMN LAYOUT (Mobile එකට කිසිම බලපෑමක් නෑ)
   ========================================================== */
@media (min-width: 768px) {

    /* Video ටික ඔතන wrapper එක */
    .yt-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 25px;
        max-width: 1400px;
        margin: 30px auto;
        padding: 0 15px;
    }

    /* .yt එකේ max-width සහ margin override කරනවා (grid එකට fit වෙන්න) */
    .yt-grid .yt {
        max-width: 100%;
        margin: 0;
    }

    /* Video එකක් විතරක් තිබ්බොත් full width centered (කැත වෙන්නේ නෑ) */
    .yt-grid > .yt:only-child {
        grid-column: 1 / -1;
        max-width: 920px;
        margin: 0 auto;
    }

    /* .iframe-container use කරනවා නම් ඒකත් grid එකට fit කරනවා */
    .yt-grid .iframe-container {
        max-width: 100%;
    }
      }

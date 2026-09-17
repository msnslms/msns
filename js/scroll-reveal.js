/* ==========================================================
   SCROLL REVEAL — Auto Animation Engine (Mobile Optimized)
   Header, Footer, Sidebar, Modals, Body හැර
   හැම card / section එකකටම auto apply වෙනවා
   ========================================================== */

(function () {
    'use strict';

    /* ---------- Device Detection ---------- */
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isSmallMobile = window.matchMedia('(max-width: 480px)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. ඕන class ටික ---------- */
    const REVEAL_CLASSES = [
        // Home page
        '.info-card', '.feature-box', '.glass-card', '.people-card',
        '.governing-slider', '.section-title', '.hero-banner', '.hero-caption',
        '.news-banner', '.main-news-card', '.news-grid-item', '.news-grid-section',
        '.news-card', '.news-slider-container', '.quick-tab-card', '.quick-tabs-grid',
       '.section-title','.mil-container','.mil-loading','.fa-solid','.fa-circle-notch',
       '.fa-spin','.mil-dots','.mil-more-wrapper','.mil-more-btn'

        // About / Developer
        '.profile-container', '.bio-card', '.skill-card', '.chart-card',
        '.chart-details', '.stat-card', '.stats-overview-grid', '.achiever-card',
        '.achievers-grid', '.contact-item', '.contact-list', '.history-card',
        '.modern-table', '.table-wrap', '.map-frame', '.pdf-download-wrapper',
        '.pdf-download-btn', '.download-btn-wrap', '.ex', '.pdf-btn-wrapper',
        '.full-pdf-wrapper',

        // Media
        '.yt', '.yt-grid', '.iframe-container', '.video-card-title',

        // Text blocks
        '.about-text', '.media-text', '.ict-text', '.history-text',

        // Quiz / Exam
        '.qz-card', '.qz-news-card', '.qz-card-grid', '.qz-news-grid',
        '.qz-teacher-header', '.qz-student-header', '.qz-tabs', '.qz-empty-state',
        '.exam-page-header', '.exam-search-card', '.exam-state-card', '.exam-tabs',
        '.summary-stat-card', '.analysis-summary-grid', '.exam-chart-card',
        '.charts-grid-exam', '.exam-table-card', '.print-actions',

        // App page
        '.app-card', '.app-hero-card', '.app-section', '.platform-tabs',
        '.ios-install-card',

        // Misc
        '.msns-custom-card', '.msns-data-grid', '.msns-loading-text', '.brand-section'
    ];

    /* ---------- 2. Skip කරන්න ඕන elements ---------- */
    const SKIP_ANCESTORS = [
        'header', 'footer', 'aside.sidebar', '.sidebar', '.menu-overlay',
        '.qz-modal-overlay', '.modal-backdrop', '.paper-modal-overlay',
        '.pdf-preview-overlay', '.preview-overlay', '.image-modal',
        '.exam-tabs'
    ];

    function shouldSkip(el) {
        for (const sel of SKIP_ANCESTORS) {
            if (el.closest(sel)) return true;
        }
        if (el.classList.contains('scroll-reveal')) return true;
        return false;
    }

    /* ---------- 3. Stagger group classes ---------- */
    const STAGGER_CLASSES = [
        '.info-card', '.feature-box', '.quick-tab-card', '.news-grid-item',
        '.news-card', '.skill-card', '.contact-item', '.stat-card',
        '.achiever-card', '.qz-card', '.qz-news-card', '.summary-stat-card',
        '.exam-chart-card', '.app-card'
    ];

    /* ---------- 4. Variant mapping ---------- */
    const VARIANT_MAP = {
        '.yt': 'reveal-zoom',
        '.iframe-container': 'reveal-zoom',
        '.glass-card': 'reveal-zoom',
        '.main-news-card': 'reveal-zoom',
        '.profile-container': 'reveal-zoom',
        '.history-card': 'reveal-zoom',
        '.chart-card': 'reveal-zoom',
        '.qz-teacher-header': 'reveal-from-left',
        '.qz-student-header': 'reveal-from-left',
        '.exam-page-header': 'reveal-zoom',
        '.hero-banner': 'reveal-zoom',
        '.app-hero-card': 'reveal-zoom'
    };

    /* ---------- 5. Mobile වලට delay speed factor ---------- */
    const DELAY_FACTOR = isSmallMobile ? 0.5 : isMobile ? 0.7 : 1;

    /* ---------- 6. Reveal duration (CSS transition + buffer) ---------- */
    const REVEAL_DURATION = isMobile ? 700 : 900;

    /* ---------- 7. Elements collect ---------- */
    const elementsToReveal = new Set();

    REVEAL_CLASSES.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (shouldSkip(el)) return;
            elementsToReveal.add(el);
        });
    });

    /* ---------- 8. Apply reveal classes ---------- */
    elementsToReveal.forEach(el => {
        el.classList.add('scroll-reveal');

        // Variant
        for (const [sel, variant] of Object.entries(VARIANT_MAP)) {
            if (el.matches(sel)) {
                el.classList.add(variant);
                break;
            }
        }

        // Stagger delay
        const isStagger = STAGGER_CLASSES.some(sel => el.matches(sel));
        if (isStagger && el.parentElement) {
            const siblings = Array.from(el.parentElement.children).filter(
                s => STAGGER_CLASSES.some(sel => s.matches(sel))
            );
            const index = siblings.indexOf(el);
            if (index >= 0) {
                const delay = Math.min(index + 1, 8);
                el.classList.add('delay-' + delay);
                // Mobile වල delay අඩු කරනවා
                if (DELAY_FACTOR < 1) {
                    el.style.transitionDelay = (delay * 0.05 * DELAY_FACTOR) + 's';
                }
            }
        }
    });

    /* ---------- 9. Reveal trigger function (with GPU layer cleanup) ---------- */
    function revealElement(el) {
        if (el.classList.contains('is-visible')) return;

        // GPU layer එක කලින් activate කරනවා
        el.classList.add('reveal-prep');

        // Next frame එකේ visible කරනවා (smoother transition)
        requestAnimationFrame(() => {
            el.classList.add('is-visible');
        });

        // Animation ඉවර වුනාම GPU layer එක release කරනවා
        // (මේක තමයි mobile lag fix කරන ප්‍රධාන කරුණ)
        const cleanupDelay = REVEAL_DURATION + 400;
        setTimeout(() => {
            el.classList.add('reveal-done');
            el.classList.remove('reveal-prep');
        }, cleanupDelay);
    }

    /* ---------- 10. Reduced motion — සම්පූර්ණයෙන් skip ---------- */
    if (prefersReducedMotion) {
        elementsToReveal.forEach(el => {
            el.classList.add('is-visible', 'reveal-done');
        });
        return; // Observer setup අවශ්‍ය නැහැ
    }

    /* ---------- 11. Intersection Observer ---------- */
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                revealElement(entry.target);
                obs.unobserve(entry.target);
            }
        });
    }, {
        threshold: isMobile ? 0.05 : 0.08,
        rootMargin: isMobile ? '0px 0px -40px 0px' : '0px 0px -60px 0px'
    });

    elementsToReveal.forEach(el => observer.observe(el));

    /* ---------- 12. Above-the-fold: page load වුනාම ඉක්මනට trigger ---------- */
    function triggerAboveFold() {
        const vh = window.innerHeight;
        elementsToReveal.forEach(el => {
            if (el.classList.contains('is-visible')) return;
            const rect = el.getBoundingClientRect();
            if (rect.top < vh * 0.9 && rect.bottom > 0) {
                // Mobile වලට ටිකක් ඉක්මනට
                const delay = isMobile ? 30 : 80;
                setTimeout(() => {
                    revealElement(el);
                    observer.unobserve(el);
                }, delay);
            }
        });
    }

    if (document.readyState === 'complete') {
        triggerAboveFold();
    } else {
        window.addEventListener('load', triggerAboveFold, { once: true });
    }

    /* ---------- 13. MutationObserver (Firebase / AJAX) ---------- */
    let mutationTimeout = null;
    const pendingNodes = new Set();

    function processPendingNodes() {
        pendingNodes.forEach(el => {
            if (shouldSkip(el)) return;
            el.classList.add('scroll-reveal');

            // Variant
            for (const [vSel, variant] of Object.entries(VARIANT_MAP)) {
                if (el.matches(vSel)) {
                    el.classList.add(variant);
                    break;
                }
            }

            observer.observe(el);

            // දැනටමත් viewport එකේ තියෙනවා නම් ඉක්මනට reveal
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
                setTimeout(() => {
                    revealElement(el);
                    observer.unobserve(el);
                }, isMobile ? 20 : 30);
            }
        });
        pendingNodes.clear();
    }

    const mo = new MutationObserver(mutations => {
        mutations.forEach(mut => {
            mut.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;

                REVEAL_CLASSES.forEach(sel => {
                    const matches = node.matches?.(sel) ? [node] : [];
                    const children = node.querySelectorAll?.(sel) || [];
                    [...matches, ...children].forEach(el => {
                        if (!el.classList.contains('scroll-reveal')) {
                            pendingNodes.add(el);
                        }
                    });
                });
            });
        });

        // Debounce — batch process කරනවා (mobile performance)
        clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(processPendingNodes, isMobile ? 120 : 60);
    });

    mo.observe(document.body, {
        childList: true,
        subtree: true
    });

    /* ---------- 14. Page visibility — background එකේ තියෙනකොට pause ---------- */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            mo.disconnect();
        } else {
            mo.observe(document.body, { childList: true, subtree: true });
        }
    });

})();

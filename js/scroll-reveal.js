/* ==========================================================
   🎬 SCROLL REVEAL — Auto Animation Engine (No Blur)
   ========================================================== */
(function () {
    'use strict';

    /* 0. DEVICE CAPABILITY DETECTION */
    const IS_TOUCH    = matchMedia('(hover: none) and (pointer: coarse)').matches;
    const IS_MOBILE   = window.innerWidth <= 768;
    const IS_REDUCED  = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const IS_LOW_END  = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const IS_SLOW_NET = navigator.connection &&
                        /(^|-)2g$/.test(navigator.connection.effectiveType || '');

    const PERF_TIER =
        IS_REDUCED ? 'off' :
        (IS_TOUCH || IS_MOBILE || IS_LOW_END || IS_SLOW_NET) ? 'lite' : 'full';

    if (PERF_TIER === 'off') {
        document.documentElement.classList.add('reveal-off');
        return;
    }

    document.documentElement.classList.add('reveal-' + PERF_TIER);

    /* 1. REVEAL TARGET CLASSES */
    const REVEAL_CLASSES = [
        '.info-card', '.feature-box', '.glass-card', '.people-card',
        '.governing-slider', '.section-title', '.hero-banner', '.hero-caption',
        '.news-banner', '.main-news-card', '.news-grid-item', '.news-grid-section',
        '.news-card', '.news-slider-container', '.quick-tab-card', '.quick-tabs-grid',
        '.profile-container', '.bio-card', '.skill-card', '.chart-card',
        '.chart-details', '.stat-card', '.stats-overview-grid', '.achiever-card',
        '.achievers-grid', '.contact-item', '.contact-list', '.history-card',
        '.modern-table', '.table-wrap', '.map-frame', '.pdf-download-wrapper',
        '.pdf-download-btn', '.download-btn-wrap', '.ex', '.pdf-btn-wrapper',
        '.full-pdf-wrapper',
        '.yt', '.yt-grid', '.iframe-container', '.video-card-title',
        '.about-text', '.media-text', '.ict-text', '.history-text',
        '.qz-card', '.qz-news-card', '.qz-card-grid', '.qz-news-grid',
        '.qz-teacher-header', '.qz-student-header', '.qz-tabs', '.qz-empty-state',
        '.exam-page-header', '.exam-search-card', '.exam-state-card', '.exam-tabs',
        '.summary-stat-card', '.analysis-summary-grid', '.exam-chart-card',
        '.charts-grid-exam', '.exam-table-card', '.print-actions',
        '.app-card', '.app-hero-card', '.app-section', '.platform-tabs',
        '.ios-install-card',
        '.msns-custom-card', '.msns-data-grid', '.msns-loading-text', '.brand-section'
    ];

    /* 2. SKIP ANCESTORS */
    const SKIP_SELECTOR = [
        'header', 'footer', '.sidebar', 'aside.sidebar',
        '.menu-overlay', '.qz-modal-overlay', '.modal-backdrop',
        '.paper-modal-overlay', '.pdf-preview-overlay', '.preview-overlay',
        '.image-modal'
    ].join(',');

    function shouldSkip(el) {
        if (!el || el.nodeType !== 1) return true;
        if (el.classList.contains('scroll-reveal')) return true;
        if (el.closest(SKIP_SELECTOR)) return true;
        return false;
    }

    /* 3. STAGGER GROUP CLASSES */
    const STAGGER_CLASSES = [
        '.info-card', '.feature-box', '.quick-tab-card', '.news-grid-item',
        '.news-card', '.skill-card', '.contact-item', '.stat-card',
        '.achiever-card', '.qz-card', '.qz-news-card', '.summary-stat-card',
        '.exam-chart-card', '.app-card'
    ];

    /* 4. VARIANT MAP (blur-නැති) */
    const VARIANT_MAP = {
        '.yt':                'reveal-zoom',
        '.iframe-container':  'reveal-zoom',
        '.glass-card':        'reveal-zoom',
        '.main-news-card':    'reveal-zoom',
        '.profile-container': 'reveal-zoom',
        '.history-card':      'reveal-zoom',
        '.chart-card':        'reveal-zoom',
        '.qz-teacher-header': 'reveal-from-left',
        '.qz-student-header': 'reveal-from-left',
        '.exam-page-header':  'reveal-zoom',
        '.hero-banner':       'reveal-zoom',
        '.app-hero-card':     'reveal-zoom'
    };

    /* 5. BATCHED DOM WRITES */
    const pendingReveals = new Set();
    let flushScheduled = false;

    function scheduleReveal(el) {
        pendingReveals.add(el);
        if (!flushScheduled) {
            flushScheduled = true;
            requestAnimationFrame(flushReveals);
        }
    }

    function flushReveals() {
        flushScheduled = false;
        pendingReveals.forEach(el => el.classList.add('is-visible'));
        pendingReveals.clear();
    }

    /* 6. TAG ELEMENT */
    function tagElement(el) {
        if (shouldSkip(el)) return false;
        el.classList.add('scroll-reveal');

        for (const sel in VARIANT_MAP) {
            if (el.matches(sel)) {
                el.classList.add(VARIANT_MAP[sel]);
                break;
            }
        }

        const isStagger = STAGGER_CLASSES.some(sel => el.matches(sel));
        if (isStagger && el.parentElement) {
            const siblings = Array.from(el.parentElement.children).filter(
                s => STAGGER_CLASSES.some(sel => s.matches(sel))
            );
            const idx = siblings.indexOf(el);
            if (idx >= 0) {
                const maxDelay = PERF_TIER === 'lite' ? 4 : 8;
                el.classList.add('delay-' + Math.min(idx + 1, maxDelay));
            }
        }
        return true;
    }

    /* 7. INITIAL SCAN */
    const elementsToReveal = new Set();

    function initialScan() {
        const found = [];
        REVEAL_CLASSES.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (shouldSkip(el)) return;
                if (!elementsToReveal.has(el)) {
                    elementsToReveal.add(el);
                    found.push(el);
                }
            });
        });

        let i = 0;
        function processChunk() {
            const start = performance.now();
            while (i < found.length && (performance.now() - start) < 6) {
                tagElement(found[i]);
                observer.observe(found[i]);
                i++;
            }
            if (i < found.length) {
                (window.requestIdleCallback || setTimeout)(processChunk);
            } else {
                triggerVisibleNow();
            }
        }
        (window.requestIdleCallback || setTimeout)(processChunk, { timeout: 200 });
    }

    /* 8. INTERSECTION OBSERVER */
    const OBS_CONFIG = PERF_TIER === 'lite'
        ? { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
        : { threshold: 0.10, rootMargin: '0px 0px -60px 0px' };

    const observer = new IntersectionObserver((entries, obs) => {
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            if (e.isIntersecting) {
                scheduleReveal(e.target);
                obs.unobserve(e.target);
            }
        }
    }, OBS_CONFIG);

    /* 9. TRIGGER VISIBLE-ON-LOAD */
    function triggerVisibleNow() {
        const vh = window.innerHeight;
        elementsToReveal.forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.top < vh * 0.9 && r.bottom > 0) {
                scheduleReveal(el);
                observer.unobserve(el);
            }
        });
    }

    window.addEventListener('load', () => {
        requestAnimationFrame(() => requestAnimationFrame(triggerVisibleNow));
    }, { once: true });

    /* 10. MUTATION OBSERVER */
    const pendingNodes = new Set();
    let moTimer = null;

    function processPendingNodes() {
        moTimer = null;
        pendingNodes.forEach(node => {
            REVEAL_CLASSES.forEach(sel => {
                const matches = node.matches?.(sel) ? [node] : [];
                const children = node.querySelectorAll?.(sel) || [];
                [...matches, ...children].forEach(el => {
                    if (!tagElement(el)) return;
                    observer.observe(el);
                    const r = el.getBoundingClientRect();
                    if (r.top < window.innerHeight * 0.9 && r.bottom > 0) {
                        scheduleReveal(el);
                        observer.unobserve(el);
                    }
                });
            });
        });
        pendingNodes.clear();
    }

    const mo = new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const n of m.addedNodes) {
                if (n.nodeType === 1) pendingNodes.add(n);
            }
        }
        if (pendingNodes.size && !moTimer) {
            moTimer = setTimeout(processPendingNodes, PERF_TIER === 'lite' ? 150 : 80);
        }
    });

    mo.observe(document.body, { childList: true, subtree: true });

    /* 11. RESIZE SAFETY */
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(triggerVisibleNow, 200);
    }, { passive: true });

    /* 12. BOOT */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialScan, { once: true });
    } else {
        initialScan();
    }

    if (typeof console !== 'undefined') {
        console.log('[ScrollReveal] tier:', PERF_TIER);
    }
})();

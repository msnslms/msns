/* ==========================================================
   SCROLL REVEAL — Auto Animation Engine
   Header, Footer, Sidebar, Modals, Body හැර
   හැම card / section එකකටම auto apply වෙනවා
   ========================================================== */

(function () {
    'use strict';

    /* ---------- 1. ඕන class ටික (මේවට animation apply වෙනවා) ---------- */
    const REVEAL_CLASSES = [
        // Home page
        '.info-card',
        '.feature-box',
        '.glass-card',
        '.people-card',
        '.governing-slider',
        '.section-title',
        '.hero-banner',
        '.hero-caption',
        '.news-banner',
        '.main-news-card',
        '.news-grid-item',
        '.news-grid-section',
        '.news-card',
        '.news-slider-container',
        '.quick-tab-card',
        '.quick-tabs-grid',

        // About / Developer
        '.profile-container',
        '.bio-card',
        '.skill-card',
        '.chart-card',
        '.chart-details',
        '.stat-card',
        '.stats-overview-grid',
        '.achiever-card',
        '.achievers-grid',
        '.contact-item',
        '.contact-list',
        '.history-card',
        '.modern-table',
        '.table-wrap',
        '.map-frame',
        '.pdf-download-wrapper',
        '.pdf-download-btn',
        '.download-btn-wrap',
        '.ex',
        '.pdf-btn-wrapper',
        '.full-pdf-wrapper',

        // Media
        '.yt',
        '.yt-grid',
        '.iframe-container',
        '.video-card-title',

        // Text blocks
        '.about-text',
        '.media-text',
        '.ict-text',
        '.history-text',

        // Quiz / Exam
        '.qz-card',
        '.qz-news-card',
        '.qz-card-grid',
        '.qz-news-grid',
        '.qz-teacher-header',
        '.qz-student-header',
        '.qz-tabs',
        '.qz-empty-state',
        '.exam-page-header',
        '.exam-search-card',
        '.exam-state-card',
        '.exam-tabs',
        '.summary-stat-card',
        '.analysis-summary-grid',
        '.exam-chart-card',
        '.charts-grid-exam',
        '.exam-table-card',
        '.print-actions',

        // App page
        '.app-card',
        '.app-hero-card',
        '.app-section',
        '.platform-tabs',
        '.ios-install-card',

        // Misc
        '.msns-custom-card',
        '.msns-data-grid',
        '.msns-loading-text',
        '.brand-section'
    ];

    /* ---------- 2. Skip කරන්න ඕන elements (header, footer, sidebar, modals) ---------- */
    const SKIP_ANCESTORS = [
        'header',
        'footer',
        'aside.sidebar',
        '.sidebar',
        '.menu-overlay',
        '.qz-modal-overlay',
        '.modal-backdrop',
        '.paper-modal-overlay',
        '.pdf-preview-overlay',
        '.preview-overlay',
        '.image-modal',
        '.exam-tabs' // Tabs හැර
    ];

    function shouldSkip(el) {
        // Skip if inside an excluded ancestor
        for (const sel of SKIP_ANCESTORS) {
            if (el.closest(sel)) return true;
        }
        // Skip if already has scroll-reveal class (avoid double processing)
        if (el.classList.contains('scroll-reveal')) return true;
        // Skip if hidden
        if (el.style.display === 'none' || el.offsetParent === null) {
            // Still include if it will be shown later - just check visibility
        }
        return false;
    }

    /* ---------- 3. Grid / Stagger group classes ---------- */
    const STAGGER_CLASSES = [
        '.info-card',
        '.feature-box',
        '.quick-tab-card',
        '.news-grid-item',
        '.news-card',
        '.skill-card',
        '.contact-item',
        '.stat-card',
        '.achiever-card',
        '.qz-card',
        '.qz-news-card',
        '.summary-stat-card',
        '.exam-chart-card',
        '.app-card'
    ];

    /* ---------- 4. Variant mapping (විශේෂ card වලට විවිධ animations) ---------- */
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

    /* ---------- 5. Initialize elements ---------- */
    const elementsToReveal = new Set();

    REVEAL_CLASSES.forEach(selector => {
        const nodes = document.querySelectorAll(selector);
        nodes.forEach(el => {
            if (shouldSkip(el)) return;
            elementsToReveal.add(el);
        });
    });

    /* ---------- 6. Apply reveal class + variant + stagger ---------- */
    elementsToReveal.forEach(el => {
        el.classList.add('scroll-reveal');

        // Apply variant if matched
        for (const [sel, variant] of Object.entries(VARIANT_MAP)) {
            if (el.matches(sel)) {
                el.classList.add(variant);
                break;
            }
        }

        // Apply stagger delay if part of a grid
        const isStagger = STAGGER_CLASSES.some(sel => el.matches(sel));
        if (isStagger && el.parentElement) {
            const siblings = Array.from(el.parentElement.children).filter(
                s => STAGGER_CLASSES.some(sel => s.matches(sel))
            );
            const index = siblings.indexOf(el);
            if (index >= 0) {
                const delay = Math.min(index + 1, 8);
                el.classList.add('delay-' + delay);
            }
        }
    });

    /* ---------- 7. Intersection Observer ---------- */
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target); // එක වතාවක් විතරයි
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -60px 0px'
    });

    /* ---------- 8. Observe all elements ---------- */
    elementsToReveal.forEach(el => observer.observe(el));

    /* ---------- 9. Auto-trigger on page load (above-the-fold items) ---------- */
    window.addEventListener('load', () => {
        setTimeout(() => {
            elementsToReveal.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
                    el.classList.add('is-visible');
                    observer.unobserve(el);
                }
            });
        }, 80);
    });

    /* ---------- 10. MutationObserver — dynamically added elements (Firebase, AJAX) ---------- */
    const mo = new MutationObserver(mutations => {
        mutations.forEach(mut => {
            mut.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return; // Element නොවෙන nodes skip
                REVEAL_CLASSES.forEach(sel => {
                    const matches = node.matches?.(sel) ? [node] : [];
                    const children = node.querySelectorAll?.(sel) || [];
                    [...matches, ...children].forEach(el => {
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
                        // Trigger immediately if visible
                        const rect = el.getBoundingClientRect();
                        if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
                            setTimeout(() => el.classList.add('is-visible'), 30);
                        }
                    });
                });
            });
        });
    });

    mo.observe(document.body, {
        childList: true,
        subtree: true
    });

})();

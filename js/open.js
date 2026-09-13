/* ==========================================================
   js/open.js — Elegant Apple-Inspired Welcome Splash Logic
   Smooth pacing • Auto-redirects to index.html
   ========================================================== */

(function () {
    'use strict';

    /* ==========================================================
       ⚙️ TIMING CONFIGURATION (Elegant — Total ~9.5s)
       ========================================================== */
    const CONFIG = {
        // Language Cycle — slower & smoother
        langCycleStart: 700,        // 0.7s after badge appears
        langShowTime:   1700,       // 1.7s per language (was 1.2s)
        langFadeTime:   550,        // 0.55s crossfade (was 0.4s)

        // Typewriter — more graceful typing
        typingSpeed:    55,         // 55ms per character (was 35ms)
        cursorFadeDelay: 400,       // pause before cursor fades
        redirectDelay:  1100,       // hold the final text a bit longer

        // Redirect
        redirectUrl: 'index.html?visited=true',

        // Safety net
        safetyTimeout: 13000        // force redirect after 13s max
    };

    /* ==========================================================
       📌 DOM ELEMENTS
       ========================================================== */
    const langSlides      = document.querySelectorAll('.lang-slide');
    const langSlider      = document.querySelector('.lang-slider');
    const typewriterWrap  = document.getElementById('typewriterWrap');
    const typedTextEl     = document.getElementById('typed-text');
    const cursorEl        = document.getElementById('cursor');

    let isRedirecting = false;
    const timeouts = [];

    function safeTimeout(fn, delay) {
        const id = setTimeout(fn, delay);
        timeouts.push(id);
        return id;
    }

    function clearAllTimeouts() {
        timeouts.forEach(id => clearTimeout(id));
        timeouts.length = 0;
    }

    /* ==========================================================
       🎯 REDIRECT
       ========================================================== */
    function redirectToIndex() {
        if (isRedirecting) return;
        isRedirecting = true;

        clearAllTimeouts();

        try { sessionStorage.setItem('welcomeShown', 'true'); } catch (e) {}

        document.body.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        document.body.style.opacity = '0';

        setTimeout(() => {
            window.location.href = CONFIG.redirectUrl;
        }, 600);
    }

    /* ==========================================================
       1️⃣ LANGUAGE SLIDER — Gentle crossfade
       ========================================================== */
    let currentIndex = 0;

    function showSlide(index) {
        langSlides.forEach(slide => {
            if (slide.classList.contains('active')) {
                slide.classList.remove('active');
                slide.classList.add('exit');
            }
        });

        const current = langSlides[index];
        if (!current) return;

        current.classList.remove('exit');
        // small delay so the exit-transition breathes a moment
        safeTimeout(() => current.classList.add('active'), 60);
    }

    function cycleLanguages() {
        showSlide(currentIndex);
        currentIndex++;

        if (currentIndex < langSlides.length) {
            safeTimeout(cycleLanguages, CONFIG.langShowTime);
        } else {
            // All 3 languages shown -> collapse -> typewriter
            safeTimeout(() => {
                collapseSlider();
                safeTimeout(revealTypewriter, 500);
            }, CONFIG.langFadeTime);
        }
    }

    function collapseSlider() {
        if (!langSlider) return;
        langSlider.style.transition =
            'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), ' +
            'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), ' +
            'height 0.6s cubic-bezier(0.16, 1, 0.3, 1), ' +
            'min-height 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        langSlider.style.opacity = '0';
        langSlider.style.transform = 'translateY(-18px) scale(0.97)';
        langSlider.style.minHeight = '0';
        langSlider.style.height = '0';
        langSlider.style.overflow = 'hidden';
        langSlider.style.marginBottom = '0';
    }

    function revealTypewriter() {
        if (!typewriterWrap) return;
        typewriterWrap.classList.add('show');
        safeTimeout(startTypewriter, 250);
    }

    // Kick off language cycle
    safeTimeout(cycleLanguages, CONFIG.langCycleStart);

    /* ==========================================================
       2️⃣ TYPEWRITER — smooth letter-by-letter
       ========================================================== */
    const textToType = 'A/MAITHRIPALA SENANAYAKA CENTRAL COLLEGE';
    let typeIndex = 0;
    let builtText = '';
    let brInserted = false;

    function startTypewriter() {
        if (!typedTextEl) return;

        if (typeIndex < textToType.length) {
            // Insert a line-break right before "CENTRAL"
            if (!brInserted && textToType.substring(typeIndex).startsWith('CENTRAL')) {
                builtText += '\n';
                brInserted = true;
            }

            builtText += textToType.charAt(typeIndex);
            typedTextEl.textContent = builtText;
            typeIndex++;

            // Slight rhythm variation — makes it feel more "hand-typed"
            const nextChar = textToType.charAt(typeIndex);
            const extraPause =
                (nextChar === ' ')  ? 60 :   // pause at spaces
                (nextChar === '/')  ? 90 :   // pause after slash
                (nextChar === '\n') ? 150 :  // pause at line-break
                0;

            safeTimeout(startTypewriter, CONFIG.typingSpeed + extraPause);
        } else {
            // Typing done — cursor fades softly
            safeTimeout(() => {
                if (cursorEl) {
                    cursorEl.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                    cursorEl.style.opacity = '0';
                }
            }, CONFIG.cursorFadeDelay);

            // Then redirect
            safeTimeout(
                redirectToIndex,
                CONFIG.cursorFadeDelay + CONFIG.redirectDelay
            );
        }
    }

    /* ==========================================================
       3️⃣ INTERACTION & SAFETY
       ========================================================== */
    document.body.addEventListener('click', redirectToIndex);
    document.body.addEventListener('touchstart', redirectToIndex, { passive: true });

    safeTimeout(redirectToIndex, CONFIG.safetyTimeout);

    // Reduced motion -> skip fast
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
        clearAllTimeouts();
        safeTimeout(redirectToIndex, 800);
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        isRedirecting = true;
        clearAllTimeouts();
    });

})();

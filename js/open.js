/* ==========================================================
   js/open.js — Fast Apple-Inspired Welcome Splash Logic
   Auto-redirects to index.html after animation completes
   ========================================================== */

(function () {
    'use strict';

    /* ==========================================================
       ⚙️ TIMING CONFIGURATION (Optimized — Total ~6.5s)
       ========================================================== */
    const CONFIG = {
        // Language Cycle
        langCycleStart: 400,        // start 0.4s after badge shows
        langShowTime:   1200,       // 1.2s per language
        langFadeTime:   400,        // 0.4s between languages

        // Typewriter
        typingSpeed:    35,         // ms per character
        cursorFadeDelay: 250,       // wait before hiding cursor
        redirectDelay:  700,        // pause after typing done

        // Redirect
        redirectUrl: 'index.html?visited=true',

        // Safety net
        safetyTimeout: 8000         // force redirect after 8s
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

        document.body.style.transition = 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        document.body.style.opacity = '0';

        setTimeout(() => {
            window.location.href = CONFIG.redirectUrl;
        }, 400);
    }

    /* ==========================================================
       1️⃣ LANGUAGE SLIDER
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
        safeTimeout(() => current.classList.add('active'), 30);
    }

    function cycleLanguages() {
        showSlide(currentIndex);
        currentIndex++;

        if (currentIndex < langSlides.length) {
            safeTimeout(cycleLanguages, CONFIG.langShowTime);
        } else {
            // Done with languages -> collapse -> typewriter
            safeTimeout(() => {
                collapseSlider();
                safeTimeout(revealTypewriter, 350);
            }, CONFIG.langFadeTime);
        }
    }

    function collapseSlider() {
        if (!langSlider) return;
        langSlider.style.transition =
            'opacity 0.4s ease, transform 0.4s ease, height 0.4s ease, min-height 0.4s ease';
        langSlider.style.opacity = '0';
        langSlider.style.transform = 'translateY(-15px) scale(0.98)';
        langSlider.style.minHeight = '0';
        langSlider.style.height = '0';
        langSlider.style.overflow = 'hidden';
        langSlider.style.marginBottom = '0';
    }

    function revealTypewriter() {
        if (!typewriterWrap) return;
        typewriterWrap.classList.add('show');
        safeTimeout(startTypewriter, 150);
    }

    // Start the cycle
    safeTimeout(cycleLanguages, CONFIG.langCycleStart);

    /* ==========================================================
       2️⃣ TYPEWRITER
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

            safeTimeout(startTypewriter, CONFIG.typingSpeed);
        } else {
            // Typing done
            safeTimeout(() => {
                if (cursorEl) {
                    cursorEl.style.transition = 'opacity 0.3s ease';
                    cursorEl.style.opacity = '0';
                }
            }, CONFIG.cursorFadeDelay);

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
        safeTimeout(redirectToIndex, 500);
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        isRedirecting = true;
        clearAllTimeouts();
    });

})();

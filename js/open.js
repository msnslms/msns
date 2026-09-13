/* ==========================================================
   js/opdn.js — Apple-Inspired Welcome Splash Logic
   ========================================================== */

(function () {
    'use strict';

    /* ==========================================================
       ⚙️ TIMING CONFIGURATION (Apple Precision Easing)
       ========================================================== */
    const CONFIG = {
        // ---------- Language Cycle Timing ----------
        langCycleStart: 800,        // Start 0.8s after badge animation begins
        langShowTime: 1800,         // Duration per language: 1.8s
        langFadeTime: 600,          // Smooth transition interval: 0.6s

        // ---------- Typewriter Timing ----------
        typingSpeed: 45,            // Speed per character (ms)
        cursorFadeDelay: 300,       // Fade out cursor after completion
        redirectDelay: 1200,        // Redirect pause after typing finishes

        // ---------- Redirect Destination ----------
        redirectUrl: 'index.html?visited=true',

        // ---------- Safety Net ----------
        safetyTimeout: 12000        // Force redirect after 12 seconds maximum
    };

    /* ==========================================================
       📌 DOM ELEMENTS
       ========================================================== */
    const langSlides = document.querySelectorAll('.lang-slide');
    const langSlider = document.querySelector('.lang-slider');
    const typewriterWrap = document.getElementById('typewriterWrap');
    const typedTextElement = document.getElementById('typed-text');
    const cursorElement = document.getElementById('cursor');

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
       🎯 SMOOTH REDIRECT HANDLER
       ========================================================== */
    function redirectToIndex() {
        if (isRedirecting) return;
        isRedirecting = true;

        clearAllTimeouts();

        try {
            sessionStorage.setItem('welcomeShown', 'true');
        } catch (e) {
            // Silence storage errors
        }

        // Apple-style fade out before redirecting
        document.body.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        document.body.style.opacity = '0';

        setTimeout(() => {
            window.location.href = CONFIG.redirectUrl;
        }, 500);
    }

    /* ==========================================================
       1️⃣ LANGUAGE SLIDER LOGIC
       ========================================================== */
    let currentIndex = 0;

    function showSlide(index) {
        langSlides.forEach((slide) => {
            if (slide.classList.contains('active')) {
                slide.classList.remove('active');
                slide.classList.add('exit');
            }
        });

        const current = langSlides[index];
        if (!current) return;

        current.classList.remove('exit');
        
        safeTimeout(() => {
            current.classList.add('active');
        }, 50);
    }

    function cycleLanguages() {
        showSlide(currentIndex);
        currentIndex++;

        if (currentIndex < langSlides.length) {
            safeTimeout(cycleLanguages, CONFIG.langShowTime);
        } else {
            // Finish language cycle -> Transition to Typewriter
            safeTimeout(() => {
                collapseSlider();
                safeTimeout(revealTypewriter, 500);
            }, CONFIG.langFadeTime);
        }
    }

    function collapseSlider() {
        if (!langSlider) return;

        langSlider.style.transition = 'opacity 0.5s ease, transform 0.5s ease, height 0.5s ease, min-height 0.5s ease';
        langSlider.style.opacity = '0';
        langSlider.style.transform = 'translateY(-15px) scale(0.98)';
        langSlider.style.minHeight = '0';
        langSlider.style.height = '0';
        langSlider.style.overflow = 'hidden';
        langSlider.style.marginBottom = '0';
    }

    function revealTypewriter() {
        if (typewriterWrap) {
            typewriterWrap.classList.add('show');
            safeTimeout(startTypewriter, 200);
        }
    }

    // Start cycle
    safeTimeout(cycleLanguages, CONFIG.langCycleStart);

    /* ==========================================================
       2️⃣ TYPEWRITER LOGIC
       ========================================================== */
    const textToType = 'A/MAITHRIPALA SENANAYAKA CENTRAL COLLEGE';
    let typeIndex = 0;

    function startTypewriter() {
        if (!typedTextElement) return;

        if (typeIndex < textToType.length) {
            const remaining = textToType.substring(typeIndex);
            if (remaining.startsWith('CENTRAL')) {
                typedTextElement.innerHTML += '<br>';
            }

            typedTextElement.innerHTML += textToType.charAt(typeIndex);
            typeIndex++;

            safeTimeout(startTypewriter, CONFIG.typingSpeed);
        } else {
            // Typing Complete -> Cursor Fade -> Redirect
            safeTimeout(() => {
                if (cursorElement) {
                    cursorElement.style.transition = 'opacity 0.4s ease';
                    cursorElement.style.opacity = '0';
                }
            }, CONFIG.cursorFadeDelay);

            safeTimeout(redirectToIndex, CONFIG.cursorFadeDelay + CONFIG.redirectDelay);
        }
    }

    /* ==========================================================
       3️⃣ INTERACTION & ACCESSIBILITY
       ========================================================== */
    // Click or tap anywhere to skip splash immediately
    document.body.addEventListener('click', redirectToIndex);
    document.body.addEventListener('touchstart', redirectToIndex, { passive: true });

    // Safety timeout fallback
    safeTimeout(redirectToIndex, CONFIG.safetyTimeout);

    // Reduced motion check
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
        clearAllTimeouts();
        safeTimeout(redirectToIndex, 800);
    }

    // Page unload cleanup
    window.addEventListener('beforeunload', () => {
        isRedirecting = true;
        clearAllTimeouts();
    });

})();


/* ==========================================================
   js/opdn.js — Welcome Splash Page Logic
   • 3-language cycle: Sinhala → English → Tamil
     (each language shows BOTH "Welcome" + school name)
   • After cycle: English typewriter
   • Auto-redirect to index.html
   ========================================================== */

(function () {
    'use strict';

    /* ---------- Configuration ---------- */
    const CONFIG = {
        langShowTime: 2000,      // Each language shows 2s (Welcome + school name together)
        langFadeTime: 700,       // Fade transition time
        startTypingDelay: 6800,  // After 3 languages × ~2s = ~6s + padding
        typingSpeed: 45,         // ms per character
        redirectDelay: 1600,     // After typing finishes
        redirectUrl: 'index.html?visited=true',
        safetyTimeout: 15000     // Force redirect after 15s
    };

    /* ---------- DOM Elements ---------- */
    const langSlides = document.querySelectorAll('.lang-slide');
    const typewriterWrap = document.getElementById('typewriterWrap');
    const typedTextElement = document.getElementById('typed-text');
    const cursorElement = document.getElementById('cursor');

    /* ==========================================================
       1️⃣ MULTI-LANGUAGE CYCLE
       (Sinhala + school name → English + school name → Tamil + school name)
       ========================================================== */
    let currentIndex = 0;

    function showSlide(index) {
        // Exit previous slides
        langSlides.forEach(slide => {
            if (slide.classList.contains('active')) {
                slide.classList.remove('active');
                slide.classList.add('exit');
            }
        });

        // Activate current slide
        const current = langSlides[index];
        if (current) {
            current.classList.remove('exit');
            // Small delay to allow exit animation to start
            setTimeout(() => {
                current.classList.add('active');
            }, 80);
        }
    }

    function cycleLanguages() {
        showSlide(currentIndex);
        currentIndex++;

        if (currentIndex < langSlides.length) {
            setTimeout(cycleLanguages, CONFIG.langShowTime);
        } else {
            // All languages done — show typewriter
            setTimeout(() => {
                // Hide the language slider
                const slider = document.querySelector('.lang-slider');
                if (slider) {
                    slider.style.transition = 'opacity 0.6s ease, transform 0.6s ease, height 0.6s ease, min-height 0.6s ease';
                    slider.style.opacity = '0';
                    slider.style.transform = 'translateY(-20px)';
                    slider.style.minHeight = '0';
                    slider.style.height = '0';
                    slider.style.overflow = 'hidden';
                }

                // Show typewriter
                if (typewriterWrap) {
                    typewriterWrap.classList.add('show');
                }
            }, CONFIG.langFadeTime + 100);
        }
    }

    // Start the cycle after badge pop-in
    setTimeout(cycleLanguages, 900);

    /* ==========================================================
       2️⃣ TYPEWRITER ANIMATION (English School Name)
       ========================================================== */
    const textToType = 'A/MAITHRIPALA SENANAYAKA CENTRAL COLLEGE';
    let typeIndex = 0;

    function typeWriter() {
        if (typeIndex < textToType.length) {
            // Insert line break before "CENTRAL"
            const remaining = textToType.substring(typeIndex);
            if (remaining.startsWith('CENTRAL')) {
                typedTextElement.innerHTML += '<br>';
            }
            typedTextElement.innerHTML += textToType.charAt(typeIndex);
            typeIndex++;
            setTimeout(typeWriter, CONFIG.typingSpeed);
        } else {
            // Typing complete
            setTimeout(() => {
                if (cursorElement) cursorElement.style.opacity = '0';
            }, 400);

            // Auto-redirect
            setTimeout(() => {
                sessionStorage.setItem('welcomeShown', 'true');
                window.location.href = CONFIG.redirectUrl;
            }, CONFIG.redirectDelay);
        }
    }

    // Start typing after all languages cycle
    setTimeout(typeWriter, CONFIG.startTypingDelay);

    /* ==========================================================
       3️⃣ SKIP ON CLICK / TAP
       ========================================================== */
    document.body.addEventListener('click', () => {
        sessionStorage.setItem('welcomeShown', 'true');
        window.location.href = CONFIG.redirectUrl;
    });

    /* ==========================================================
       4️⃣ SAFETY: Force redirect after 15s
       ========================================================== */
    setTimeout(() => {
        sessionStorage.setItem('welcomeShown', 'true');
        window.location.href = CONFIG.redirectUrl;
    }, CONFIG.safetyTimeout);

})();

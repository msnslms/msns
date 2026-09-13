/* ==========================================================
   js/opdn.js — Welcome Splash Page Logic
   • Multi-language Welcome Cycle (Sinhala → English → Tamil)
   • Typewriter School Name
   • Auto-redirect to index.html
   ========================================================== */

(function () {
    'use strict';

    /* ---------- Configuration ---------- */
    const CONFIG = {
        // Language cycle timing (ms)
        langShowTime: 1200,     // Each language shows for 1.2s
        langFadeTime: 600,      // Fade transition time

        // Typewriter timing
        typingSpeed: 45,        // ms per character
        startTypingDelay: 4200, // Wait until after all languages show
        redirectDelay: 1400,    // Wait after typing done

        // Redirect target
        redirectUrl: 'index.html?visited=true'
    };

    /* ---------- DOM Elements ---------- */
    const welcomeWords = document.querySelectorAll('.welcome-word');
    const typedTextElement = document.getElementById('typed-text');
    const cursorElement = document.getElementById('cursor');

    /* ==========================================================
       1️⃣ MULTI-LANGUAGE WELCOME CYCLE
       (Sinhala → English → Tamil, one after another)
       ========================================================== */
    let currentLangIndex = 0;

    function cycleLanguages() {
        // Remove active from all
        welcomeWords.forEach(w => {
            w.classList.remove('active');
            if (w.classList.contains('active')) {
                w.classList.add('exit');
            }
        });

        // Activate current
        const current = welcomeWords[currentLangIndex];
        if (current) {
            current.classList.remove('exit');
            current.classList.add('active');
        }

        // Move to next
        currentLangIndex++;

        if (currentLangIndex < welcomeWords.length) {
            // Schedule next language
            setTimeout(() => {
                // Mark current as exiting
                const prev = welcomeWords[currentLangIndex - 1];
                if (prev) {
                    prev.classList.remove('active');
                    prev.classList.add('exit');
                }
                cycleLanguages();
            }, CONFIG.langShowTime);
        }
        // After last language, stop cycling (typewriter will start)
    }

    // Start the cycle after initial delay (badge pop-in)
    setTimeout(cycleLanguages, 800);

    /* ==========================================================
       2️⃣ TYPEWRITER ANIMATION (English School Name)
       ========================================================== */
    const textToType = 'A/MAITHRIPALA SENANAYAKA CENTRAL COLLEGE';
    let typeIndex = 0;

    function typeWriter() {
        if (typeIndex < textToType.length) {
            // Insert line break before "CENTRAL" for readability on mobile
            const remaining = textToType.substring(typeIndex);
            if (remaining.startsWith('CENTRAL')) {
                typedTextElement.innerHTML += '<br>';
            }
            typedTextElement.innerHTML += textToType.charAt(typeIndex);
            typeIndex++;
            setTimeout(typeWriter, CONFIG.typingSpeed);
        } else {
            // Typing complete: hide cursor after brief pause
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

    // Start typing after languages have cycled
    setTimeout(typeWriter, CONFIG.startTypingDelay);

    /* ==========================================================
       3️⃣ OPTIONAL: Skip on Click / Tap
       (User ට click කරලා redirect වෙන්න පුළුවන්)
       ========================================================== */
    document.body.addEventListener('click', () => {
        sessionStorage.setItem('welcomeShown', 'true');
        window.location.href = CONFIG.redirectUrl;
    });

    /* ==========================================================
       4️⃣ SAFETY: Force redirect after 12 seconds
       (මොනවා හරි හිර වුනොත් auto redirect)
       ========================================================== */
    setTimeout(() => {
        sessionStorage.setItem('welcomeShown', 'true');
        window.location.href = CONFIG.redirectUrl;
    }, 12000);

})();

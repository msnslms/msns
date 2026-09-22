/* =========================================================
   MAIN APP JAVASCRIPT (min.js)
   ========================================================= */

// 1. Sidebar & Menu Controls
const menuToggle = document.getElementById('menuToggle');
const closeMenu = document.getElementById('closeMenu');
const sidebar = document.getElementById('sidebar');
const menuOverlay = document.getElementById('menuOverlay');

if (menuToggle && sidebar && menuOverlay) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        menuOverlay.classList.add('active');
    });
}

const hideMenuHub = () => {
    if (sidebar) sidebar.classList.remove('active');
    if (menuOverlay) menuOverlay.classList.remove('active');
};

if (closeMenu) closeMenu.addEventListener('click', hideMenuHub);
if (menuOverlay) menuOverlay.addEventListener('click', hideMenuHub);

document.querySelectorAll('.menu-item[href^="#"]').forEach(link => {
    link.addEventListener('click', hideMenuHub);
});

// 2. Governing Body Auto Slider Logic
const track = document.getElementById('governingTrack');
const dotsContainer = document.getElementById('sliderDots');

if (track && dotsContainer) {
    const cards = track.querySelectorAll('.people-card');
    let currentIndex = 0;

    cards.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.dot');

    function goToSlide(index) {
        currentIndex = index;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }

    function autoSlide() {
        currentIndex = (currentIndex + 1) % cards.length;
        goToSlide(currentIndex);
    }

    let slideInterval = setInterval(autoSlide, 3500);

    const sliderElem = document.querySelector('.governing-slider');
    if (sliderElem) {
        sliderElem.addEventListener('mouseenter', () => clearInterval(slideInterval));
        sliderElem.addEventListener('mouseleave', () => {
            slideInterval = setInterval(autoSlide, 3500);
        });
    }
}

// 3. Welcome Screen Session Check
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('visited') === 'true') {
    sessionStorage.setItem('welcomeShown', 'true');
}
if (!sessionStorage.getItem('welcomeShown')) {
    window.location.href = 'open.html';
}

// 4. Back To Top Button Logic
const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) {
    window.onscroll = function() {
        if (document.body.scrollTop > 250 || document.documentElement.scrollTop > 250) {
            backToTopBtn.style.display = "flex";
        } else {
            backToTopBtn.style.display = "none";
        }
    };

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// 5. Image Link Converter Helper
function formatImageUrl(url) {
    if (!url || url.trim() === '') {
        return 'https://via.placeholder.com/600x400/101622/ffffff?text=No+Image';
    }
    if (url.includes('drive.google.com')) {
        const matches = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (matches && matches[1]) {
            return `https://lh3.googleusercontent.com/d/${matches[1]}`;
        }
        const idParam = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (idParam && idParam[1]) {
            return `https://lh3.googleusercontent.com/d/${idParam[1]}`;
        }
    }
    return url;
}

/* =========================================================
   Google Sheet Stats Fetch Logic (OpenSheet API - Tab 2)
   ========================================================= */
async function loadSchoolStats() {
    const SHEET_ID = '1dbjK--IEeJC2WDEmHLipgs7t8eoNj43Qy0zZNFlY-F0';
    
    // Tab index (/2) වෙනුවට Tab නම "stu no" (URL encoded as stu%20no) ලබා දී ඇත
    const STATS_URL = `https://opensheet.elk.sh/${SHEET_ID}/stu%20no`;
    
    const studentCountElem = document.getElementById('studentCount');
    const teacherCountElem = document.getElementById('teacherCount');

    // Element නැත්නම් Console එකේ පෙන්වයි
    if (!studentCountElem || !teacherCountElem) {
        console.error('HTML Elements (studentCount හෝ teacherCount) සොයාගත නොහැකි විය!');
        return;
    }

    try {
        const response = await fetch(STATS_URL);
        const data = await response.json();

        // Browser Console එකේ Data එනවද බලන්න
        console.log("Fetched Sheet Data:", data);

        if (Array.isArray(data) && data.length > 0) {
            const row = data[0]; // පළමු Data පේළිය (A2, B2)

            // Image එකේ විදිහට Capital 'Students' සහ 'Teachers'
            if (row.Students !== undefined) studentCountElem.textContent = row.Students;
            if (row.Teachers !== undefined) teacherCountElem.textContent = row.Teachers;
        } else {
            console.error("Data ලබාගැනීමට නොහැකි විය. Google Sheet Permission පරීක්ෂා කරන්න.");
        }
    } catch (error) {
        console.error('Error loading school stats:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadHomeNewsSlider();
    loadSchoolStats();
});


// 7. MSNS AI Widget Animations & Toggle
document.addEventListener("DOMContentLoaded", () => {
    // Google Sheet එකෙන් Students & Teachers ගණන Auto Fetch කිරීම
    loadSchoolStats();

    const aiWidget = document.getElementById("msnsAiWidget");
    const aiToggle = document.getElementById("msnsAiToggle");

    if (aiWidget) {
        setTimeout(() => {
            aiWidget.classList.remove("hidden");
            aiWidget.classList.add("pop-in");

            setTimeout(() => {
                aiWidget.classList.remove("pop-in");
                aiWidget.classList.add("docked");
            }, 3500);

        }, 1200);

        if (aiToggle) {
            aiToggle.addEventListener("click", () => {
                if (aiWidget.classList.contains("docked")) {
                    aiWidget.classList.remove("docked");
                } else {
                    aiWidget.classList.add("docked");
                }
            });
        }
    }
});
    // DOM එක සම්පූර්ණයෙන්ම Load වූ පසු පටන් ගන්න
    document.addEventListener('DOMContentLoaded', () => {
        
        // Animate විය යුතු Class නාමයන්
        const revealSelectors = [
            '.section-title',
            '.info-card',
            '.feature-box',
            '.people-card',
            '.governing-slider',
            '.news-banner',
            '.main-news-card',
            '.news-grid-item',
            '.news-card',
            '.profile-container',
            '.bio-card',
            '.skill-card',
            '.chart-card',
            '.stat-card',
            '.achiever-card',
            '.contact-item',
            '.yt',
            '.iframe-container',
            '.glass-card',
            '.history-card',
            '.map-frame',
            '.hero-caption',
            '.pdf-download-wrapper',
            '.download-btn-wrap',
            '.ex',
            '.quick-tab-card',
            '.table-wrap',
            '.stats-overview-grid',
            '.achievers-grid'
        ];

        const groupSelectors = [
            '.info-card',
            '.feature-box',
            '.news-grid-item',
            '.skill-card',
            '.contact-item',
            '.quick-tab-card',
            '.stat-card',
            '.achiever-card',
            '.news-card'
        ];

        const revealElements = document.querySelectorAll(revealSelectors.join(', '));

        revealElements.forEach((el) => {
            el.classList.add('reveal');

            // Stagger delay එකතු කිරීම
            const shouldStagger = groupSelectors.some(sel => el.matches(sel));
            if (shouldStagger && el.parentElement) {
                const siblings = Array.from(el.parentElement.children);
                const index = siblings.indexOf(el);
                const delayClass = 'delay-' + Math.min(index + 1, 8);
                el.classList.add(delayClass);
            }
        });

        // Intersection Observer — Scroll කරද්දී Trigger වන ආකාරය
        const observerOptions = {
            threshold: 0.1, // Element එකෙන් 10% ක් Screen එකට ආපු ගමන් Animate වේ
            rootMargin: '0px 0px -40px 0px' // පහසුවෙන් Trigger වීම සඳහා Margin එක අඩු කරන ලදී
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    // එක පාරක් විතරක් animate වෙන්න ඕන නම් පහත පේළිය තියන්න.
                    // උඩ-යට Scroll කරද්දී හැමපාරම animate වෙන්න ඕන නම් පහත පේළිය Remove/Comment කරන්න:
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(el => observer.observe(el));

        // Page එක Load වෙද්දීම Screen එක ඇතුලේ තියෙන Elements එකපාර Animate කිරීම
        revealElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                el.classList.add('active');
            }
        });
    });
document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('.hero-slider-img');
    const overlays = document.querySelectorAll('.hero-slider-overlay');
    const container = document.querySelector('.hero-slider-container');
    
    if (!images.length) return;

    let currentIndex = 0;
    let slideInterval = null;
    const DISPLAY_TIME = 3500; // පින්තූරයක් පෙනී සිටින කාලය (මිලිසෙනපරි 3500 = තත්පර 3.5)

    function showSlide(index) {
        images.forEach((img, i) => {
            img.classList.toggle('active', i === index);
        });
        overlays.forEach((overlay, i) => {
            overlay.classList.toggle('active', i === index);
        });
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % images.length;
        showSlide(currentIndex);
    }

    function startAutoSlide() {
        stopAutoSlide(); // කලින් තිබූ interval එක clean කරයි
        slideInterval = setInterval(nextSlide, DISPLAY_TIME);
    }

    function stopAutoSlide() {
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
        }
    }

    // Hover කළ විට නතර කර Mouse එක අයින් කළ විට නැවත Start කිරීම
    if (container) {
        container.addEventListener('mouseenter', stopAutoSlide);
        container.addEventListener('mouseleave', startAutoSlide);
    }

    // Browser tab එක වෙනස් කර නැවත පැමිණීමේදී Freeze වීම වැළැක්වීම
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoSlide();
        } else {
            startAutoSlide();
        }
    });

    // ආරම්භ කිරීම
    showSlide(currentIndex);
    startAutoSlide();
});
(function () {
    "use strict";

    /* ================= SETTINGS ================= */
    var SHEET_ID   = "1mN5jfN4P3FFevv2Aq0ygWmTzrF7-dVWfdy-8cDFa7ro";
    var SHEET_NAME = "governing-body";   // tab එකේ නම හරියටම
    var AUTO_MS    = 3000;               // තත්පර 3කට සැරයක් මාරු වෙනවා

    var API = "https://docs.google.com/spreadsheets/d/" + SHEET_ID +
              "/gviz/tq?tqx=out:json&sheet=" + encodeURIComponent(SHEET_NAME);

    var track   = document.getElementById("governingTrack");
    var dotsBox = document.getElementById("sliderDots");
    if (!track) return;

    /* ================= HELPERS ================= */
    // cell එකක text එක ගන්නවා
    function cellText(cell) {
        if (!cell) return "";
        var v = (cell.f !== null && cell.f !== undefined) ? cell.f : cell.v;
        return (v === null || v === undefined) ? "" : String(v).trim();
    }

    // cell එකක URL එක ගන්නවා (hyperlink / plain text දෙකටම)
    function cellUrl(cell) {
        if (!cell) return "";
        var f = (cell.f !== null && cell.f !== undefined) ? String(cell.f).trim() : "";
        var v = (cell.v !== null && cell.v !== undefined) ? String(cell.v).trim() : "";
        if (/^https?:\/\//i.test(f)) return f;
        if (/^https?:\/\//i.test(v)) return v;
        return v || f;
    }

    // Google Drive link එක කෙලින්ම පෙන්නන පුළුවන් link එකක් කරනවා
    function directImage(url) {
        if (!url) return "";
        url = url.trim();
        var m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (!m) m = url.match(/drive\.google\.com\/[^#]*[?&]id=([a-zA-Z0-9_-]+)/);
        if (m && /drive\.google\.com/i.test(url)) {
            return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1000";
        }
        return url;   // imgbb / වෙනත් සාමාන්‍ය link එකක් නම් එහෙමම
    }

    /* ================= CARDS හදනවා ================= */
    function buildCards(list) {
        track.innerHTML = "";

        list.forEach(function (p) {
            var card = document.createElement("div");
            card.className = "people-card";          // class එක වෙනස් කරලා නෑ

            var img = document.createElement("img");
            img.src = directImage(p.url);
            img.alt = p.position || p.name || "Governing Body";
            img.loading = "lazy";
            img.onerror = function () {
                this.onerror = null;
                this.src = "courses-01.jpg";          // image එක load නොවුනොත් fallback
            };

            var h3 = document.createElement("h3");
            h3.textContent = p.position;              // C තීරුව → තනතුර

            var para = document.createElement("p");
            para.textContent = p.name;                // B තීරුව → නම

            card.appendChild(img);
            card.appendChild(h3);
            card.appendChild(para);
            track.appendChild(card);
        });
    }

    /* ================= SLIDER ================= */
    var index = 0, maxIndex = 0, stepPx = 0, timer = null, dots = [];

    function buildDots() {
        if (!dotsBox) return;
        dotsBox.innerHTML = "";
        dots = [];
        if (maxIndex < 1) return;

        for (var i = 0; i <= maxIndex; i++) {
            (function (i) {
                var d = document.createElement("span");
                d.className = "dot";
                d.addEventListener("click", function () {
                    index = i;
                    move(true);
                    start();
                });
                dotsBox.appendChild(d);
                dots.push(d);
            })(i);
        }
        updateDots();
    }

    function updateDots() {
        for (var i = 0; i < dots.length; i++) {
            if (i === index) dots[i].classList.add("active");
            else dots[i].classList.remove("active");
        }
    }

    function move(animate) {
        track.style.transition = animate ? "transform .6s ease" : "none";
        track.style.transform  = "translateX(" + (-index * stepPx) + "px)";
        updateDots();
    }

    function measure() {
        var card = track.querySelector(".people-card");
        if (!card) return;

        var cs  = window.getComputedStyle(track);
        var gap = parseFloat(cs.columnGap || cs.gap) || 0;

        stepPx = card.getBoundingClientRect().width + gap;
        if (stepPx <= 0) return;

        var viewport = (track.parentElement ? track.parentElement.clientWidth : window.innerWidth) || window.innerWidth;
        var visible  = Math.max(1, Math.round(viewport / stepPx));
        maxIndex     = Math.max(0, track.children.length - visible);

        if (index > maxIndex) index = maxIndex;

        buildDots();
        move(false);
    }

    function next() {
        if (maxIndex < 1) return;
        index = (index >= maxIndex) ? 0 : index + 1;   // අන්තිමට ගියාම මුලට
        move(true);
    }

    function start() {
        stop();
        if (maxIndex < 1) return;
        timer = setInterval(next, AUTO_MS);
    }

    function stop() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    /* hover කරාම නවතිනවා, අයින් කරාම ආයෙ පටන් ගන්නවා */
    var box = track.parentElement;
    if (box) {
        box.addEventListener("mouseenter", stop);
        box.addEventListener("mouseleave", start);

        /* mobile swipe */
        var sx = 0;
        box.addEventListener("touchstart", function (e) {
            sx = e.touches[0].clientX; stop();
        }, { passive: true });
        box.addEventListener("touchend", function (e) {
            var dx = e.changedTouches[0].clientX - sx;
            if (Math.abs(dx) > 40) {
                if (dx < 0) index = (index >= maxIndex) ? 0 : index + 1;
                else        index = (index <= 0) ? maxIndex : index - 1;
                move(true);
            }
            start();
        }, { passive: true });
    }

    /* resize වුනාම නැවත ගණනය */
    var rT;
    window.addEventListener("resize", function () {
        clearTimeout(rT);
        rT = setTimeout(function () { measure(); start(); }, 200);
    });

    /* ================= SHEET එකෙන් DATA ගන්නවා ================= */
    fetch(API)
        .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.text();
        })
        .then(function (text) {
            var s = text.indexOf("{");
            var e = text.lastIndexOf("}");
            if (s === -1 || e === -1) throw new Error("Invalid sheet response");

            var json = JSON.parse(text.slice(s, e + 1));
            var rows = (json.table && json.table.rows) || [];

            var list = [];
            rows.forEach(function (row) {
                var c    = row.c || [];
                var url  = cellUrl(c[0]);     // A තීරුව → image link
                var name = cellText(c[1]);    // B තීරුව → නම
                var pos  = cellText(c[2]);    // C තීරුව → තනතුර

                if (!url && !name && !pos) return;
                list.push({ url: url, name: name, position: pos });
            });

            /* header row එක (url | name | position) අයින් කරනවා */
            if (list.length) {
                var f = list[0];
                if (/^(url|image|img|link)$/i.test(f.url) || /^(name|position)$/i.test(f.name)) {
                    list.shift();
                }
            }

            if (!list.length) return;

            buildCards(list);
            measure();
            start();
        })
        .catch(function (err) {
            console.error("Governing Body load error:", err);
        });

})();
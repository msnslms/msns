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
document.addEventListener("DOMContentLoaded", function () {
    const sheetId = '1mN5jfN4P3FFevv2Aq0ygWmTzrF7-dVWfdy-8cDFa7ro';
    const sheetName = 'governing-body';
    
    // headers=1 යෙදීමෙන් A1, B1, C1 (Title Row) එක අයින් කර ඊට යටින් ඇති Data විතරක් Fetch කරයි
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1`;

    // Direct Image URL එකක් බවට හරවන Function එක
    function formatImageUrl(rawUrl) {
        if (!rawUrl) return 'https://via.placeholder.com/300x350?text=No+Image';

        let url = rawUrl.toString().trim();

        // වැරදීමකින් Link දෙකක් එකට Paste වී ඇත්නම් අවසාන Link එක වෙන් කර ගැනීම
        if (url.includes('http') && url.lastIndexOf('http') > 0) {
            url = url.substring(url.lastIndexOf('http'));
        }

        // Google Drive View Link එක Direct Image Link එකක් බවට හැරවීම
        if (url.includes('drive.google.com')) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
            }
        }

        return url;
    }

    fetch(gvizUrl)
        .then(response => response.text())
        .then(data => {
            // GViz JSON Response එක සුද්ධ කරගැනීම
            const jsonString = data.substring(data.indexOf('{'), data.lastIndexOf('}') + 1);
            const json = JSON.parse(jsonString);
            const rows = json.table.rows;

            const governingTrack = document.getElementById('governingTrack');
            if (!governingTrack) return;

            let cardsHtml = '';

            // Title එකට යටින් තියෙන සෑම Data පේළියක්ම පරීක්ෂා කිරීම
            rows.forEach(row => {
                if (!row.c) return;

                // A2, A3... = URL (c[0])
                // B2, B3... = Name (c[1])
                // C2, C3... = Position (c[2])
                const rawUrl = row.c[0] && row.c[0].v ? row.c[0].v : '';
                const name = row.c[1] && row.c[1].v ? row.c[1].v : '';
                const position = row.c[2] && row.c[2].v ? row.c[2].v : '';

                // Title පේළිය අහම්බෙන් ආවොත් හෝ හිස් පේළි තිබුණොත් මඟ හැරීම
                if (rawUrl.toString().toLowerCase() === 'url' || (!name && !position)) {
                    return;
                }

                const finalImgUrl = formatImageUrl(rawUrl);

                // Card එක සාදා ගැනීම
                cardsHtml += `
                    <div class="people-card">
                        <img src="${finalImgUrl}" alt="${position}" onerror="this.src='https://via.placeholder.com/300x350?text=No+Image'">
                        <h3>${position}</h3>
                        <p>${name}</p>
                    </div>
                `;
            });

            // Dynamic HTML එක Element එකට එකතු කිරීම
            governingTrack.innerHTML = cardsHtml;

            // Slider එක Re-initialize කිරීමට අවශ්‍ය නම්
            if (typeof initSlider === 'function') {
                initSlider();
            }
        })
        .catch(error => {
            console.error('Data loading error:', error);
        });
});

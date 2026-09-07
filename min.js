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


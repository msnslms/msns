/* ==========================================================
   🖼️ MINI IMAGE LIBRARY & HERO SLIDER — Google Sheets
   Sheet: mini-image-library
   Columns: url | titel | discretion | home | home-heder
   ========================================================== */

(function () {
    'use strict';

    /* ==========================================================
       📌 CONFIG
       ========================================================== */
    const CONFIG = {
        sheetId: '1mN5jfN4P3FFevv2Aq0ygWmTzrF7-dVWfdy-8cDFa7ro',
        sheetName: 'mini-image-library',
        autoRotateMs: 5000,        // Auto-rotate interval (5s)
        transitionMs: 700,         // Blur transition duration
        maxItems: 50               // Max items to parse
    };

    /* ==========================================================
       📌 DOM
       ========================================================== */
    const container = document.getElementById('milContainer');
    const dotsWrap  = document.getElementById('milDots');
    const heroContainer = document.getElementById('heroSliderContainer');

    if (!container && !heroContainer) return;

    /* ==========================================================
       🎯 STATE
       ========================================================== */
    let items = [];
    let heroItems = [];
    let galleryItems = [];
    let currentIndex = 0;
    let heroCurrentIndex = 0;
    let autoTimer = null;
    let heroAutoTimer = null;
    let isAnimating = false;
    let isHeroAnimating = false;

    /* ==========================================================
       🎨 URL NORMALIZER — Google Drive & Direct Links
       ========================================================== */
    function normalizeImageUrl(rawUrl) {
        if (!rawUrl) return '';

        let url = rawUrl.trim().replace(/^["']|["']$/g, '');

        // Google Drive file ID extraction (handles /file/d/ID, ?id=ID, /d/ID)
        const driveMatch = url.match(/(?:\/file\/d\/|id=|uc\?.*id=|\/d\/)([a-zA-Z0-9_-]+)/);
        if ((url.includes('drive.google.com') || url.includes('docs.google.com')) && driveMatch) {
            return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        }

        return url;
    }

    /* ==========================================================
       📥 FETCH FROM GOOGLE SHEETS
       ========================================================== */
    async function fetchSheetData() {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.sheetName)}`;

        console.log('📥 Fetching Sheet:', url);

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch sheet: ' + response.status);

        const csv = await response.text();
        return parseCSV(csv);
    }

    /* ==========================================================
       🧩 PARSE CSV
       ========================================================== */
    function parseCSV(csv) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < csv.length; i++) {
            const c = csv[i];
            const next = csv[i + 1];

            if (c === '"') {
                if (inQuotes && next === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                row.push(field);
                field = '';
            } else if ((c === '\n' || c === '\r') && !inQuotes) {
                if (field !== '' || row.length > 0) {
                    row.push(field);
                    rows.push(row);
                    row = [];
                    field = '';
                }
                if (c === '\r' && next === '\n') i++;
            } else {
                field += c;
            }
        }
        if (field !== '' || row.length > 0) {
            row.push(field);
            rows.push(row);
        }

        if (rows.length < 2) return [];

        const headers = rows[0].map(h => h.trim().toLowerCase());

        const urlIdx = headers.findIndex(h => h === 'url' || h.includes('url') || h === 'image');
        const titleIdx = headers.findIndex(h => h === 'titel' || h === 'title' || h.includes('tit') || h === 'heading');
        const descIdx = headers.findIndex(h => h.includes('discre') || h.includes('desc') || h.includes('text') || h === 'discretion');
        
        const homeHeaderIdx = headers.findIndex(h => h === 'home-heder' || h === 'home-header' || h.includes('heder') || h.includes('header') || h === 'hero');
        const homeIdx = headers.findIndex((h, idx) => (h === 'home' || h.trim() === 'home') && idx !== homeHeaderIdx);

        console.log('📊 Column Indexes — URL:', urlIdx, 'Title:', titleIdx, 'Desc:', descIdx, 'Home:', homeIdx, 'Home-Header:', homeHeaderIdx);

        const data = [];
        for (let i = 1; i < rows.length && data.length < CONFIG.maxItems; i++) {
            const r = rows[i];
            const url = (r[urlIdx] || '').trim();
            const title = (r[titleIdx] || '').trim();
            const desc = (r[descIdx] || '').trim();

            let isHomeGallery = false;
            if (homeIdx !== -1) {
                const homeVal = (r[homeIdx] || '').trim().toLowerCase();
                if (homeVal === 'yes' || homeVal === 'true' || homeVal === '1') {
                    isHomeGallery = true;
                }
            }

            let isHero = false;
            if (homeHeaderIdx !== -1) {
                const homeHeaderVal = (r[homeHeaderIdx] || '').trim().toLowerCase();
                if (homeHeaderVal === 'yes' || homeHeaderVal === 'true' || homeHeaderVal === '1') {
                    isHero = true;
                }
            }

            if (!url && !title && !desc) continue;

            data.push({
                url: normalizeImageUrl(url),
                title: title || '',
                desc: desc || '',
                hasImage: !!url,
                isHome: isHomeGallery,
                isHero: isHero
            });
        }

        return data;
    }

    /* ==========================================================
       🎬 RENDER HERO SLIDER (Top Banner)
       ========================================================== */
    function renderHeroSlider() {
        if (!heroContainer) return;

        // 1. Filter items marked specifically for Hero
        heroItems = items.filter(item => item.isHero);

        // 2. Fallback: If no items have home-heder = 'yes', take all items with images
        if (heroItems.length === 0) {
            heroItems = items.filter(item => item.hasImage || item.title);
        }

        if (heroItems.length === 0) {
            heroContainer.innerHTML = `
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#0f172a; color:#94a3b8; font-weight:bold; font-size:0.9rem;">
                    No Hero Images Available
                </div>
            `;
            return;
        }

        const imagesHTML = heroItems.map((item, i) => {
            if (!item.hasImage) {
                return `
                    <div class="hero-slider-img mil-no-image ${i === 0 ? 'active' : ''}" data-hero-index="${i}">
                        <i class="fa-regular fa-image"></i>
                        <span>No Image</span>
                    </div>
                `;
            }
            return `
                <img 
                    class="hero-slider-img ${i === 0 ? 'active' : ''}" 
                    data-hero-index="${i}"
                    src="${item.url}" 
                    alt="${escapeHTML(item.title)}"
                    loading="eager">
            `;
        }).join('');

        const initialTitle = heroItems[0]?.title ? escapeHTML(heroItems[0].title) : '';
        const initialDesc = heroItems[0]?.desc ? escapeHTML(heroItems[0].desc) : '';

        heroContainer.innerHTML = `
            ${imagesHTML}
            <div class="hero-slider-overlay active" id="heroOverlay" style="${(!initialTitle && !initialDesc) ? 'display:none;' : ''}">
                <div class="hero-slider-title" id="heroTitle">${initialTitle}</div>
                <div class="hero-slider-desc" id="heroDesc">${initialDesc}</div>
            </div>
        `;

        // Handle load errors gracefully
        heroContainer.querySelectorAll('img.hero-slider-img').forEach(img => {
            img.addEventListener('error', function () {
                const idx = this.dataset.heroIndex;
                const fallback = document.createElement('div');
                fallback.className = `hero-slider-img mil-no-image ${this.classList.contains('active') ? 'active' : ''}`;
                fallback.dataset.heroIndex = idx;
                fallback.innerHTML = `<i class="fa-regular fa-image"></i><span>Image Load Error</span>`;
                this.replaceWith(fallback);
            });
        });

        startHeroAutoRotate();
    }

    /* ==========================================================
       🔄 HERO SLIDE NAVIGATION
       ========================================================== */
    function nextHeroSlide() {
        if (isHeroAnimating || heroItems.length <= 1) return;
        const next = (heroCurrentIndex + 1) % heroItems.length;
        goToHeroSlide(next);
    }

    function goToHeroSlide(index) {
        if (isHeroAnimating || index === heroCurrentIndex) return;
        if (index < 0 || index >= heroItems.length) return;

        isHeroAnimating = true;
        resetHeroAutoRotate();

        const title = document.getElementById('heroTitle');
        const desc = document.getElementById('heroDesc');
        const overlay = document.getElementById('heroOverlay');

        if (overlay) overlay.classList.remove('active');

        setTimeout(() => {
            const currentImg = heroContainer.querySelector(`.hero-slider-img[data-hero-index="${heroCurrentIndex}"]`);
            if (currentImg) currentImg.classList.remove('active');

            const nextImg = heroContainer.querySelector(`.hero-slider-img[data-hero-index="${index}"]`);
            if (nextImg) nextImg.classList.add('active');

            const newTitle = heroItems[index].title;
            const newDesc = heroItems[index].desc;

            if (overlay) {
                if (!newTitle && !newDesc) {
                    overlay.style.display = 'none';
                } else {
                    overlay.style.display = 'block';
                    if (title) title.textContent = newTitle;
                    if (desc) desc.textContent = newDesc;
                }
            }

            heroCurrentIndex = index;

            setTimeout(() => {
                if (overlay && (newTitle || newDesc)) overlay.classList.add('active');
                setTimeout(() => { isHeroAnimating = false; }, 500);
            }, 50);
        }, 350);
    }

    /* ==========================================================
       ⏱️ HERO AUTO ROTATE
       ========================================================== */
    function startHeroAutoRotate() {
        if (heroItems.length <= 1) return;
        resetHeroAutoRotate();
    }

    function resetHeroAutoRotate() {
        if (heroAutoTimer) clearInterval(heroAutoTimer);
        if (heroItems.length <= 1) return;
        heroAutoTimer = setInterval(() => {
            nextHeroSlide();
        }, CONFIG.autoRotateMs);
    }

    function stopHeroAutoRotate() {
        if (heroAutoTimer) clearInterval(heroAutoTimer);
        heroAutoTimer = null;
    }

    if (heroContainer) {
        heroContainer.addEventListener('mouseenter', stopHeroAutoRotate);
        heroContainer.addEventListener('mouseleave', () => {
            if (heroItems.length > 1) resetHeroAutoRotate();
        });
    }

    /* ==========================================================
       🎬 RENDER MINI GALLERY (Bottom Section)
       ========================================================== */
    function renderCard() {
        if (!container) return;

        galleryItems = items.filter(item => item.isHome);

        if (galleryItems.length === 0) {
            galleryItems = items.filter(item => item.hasImage);
        }

        if (galleryItems.length === 0) {
            container.innerHTML = `
                <div class="mil-empty">
                    <i class="fa-regular fa-images"></i>
                    <span>No gallery items available</span>
                </div>
            `;
            return;
        }

        const imagesHTML = galleryItems.map((item, i) => {
            if (!item.hasImage) {
                return `
                    <div class="mil-img mil-no-image ${i === 0 ? 'active' : ''}" data-index="${i}">
                        <i class="fa-regular fa-image"></i>
                        <span>No Image</span>
                    </div>
                `;
            }
            return `
                <img 
                    class="mil-img ${i === 0 ? 'active' : ''}" 
                    data-index="${i}"
                    src="${item.url}" 
                    alt="${escapeHTML(item.title)}"
                    loading="lazy">
            `;
        }).join('');

        container.innerHTML = `
            <div class="mil-card" id="milCard">
                <div class="mil-media" id="milMedia">
                    ${imagesHTML}
                    <div class="mil-counter" id="milCounter">1 / ${galleryItems.length}</div>
                </div>
                <div class="mil-content" id="milContent">
                    <h3 class="mil-title" id="milTitle">${escapeHTML(galleryItems[0].title)}</h3>
                    <div class="mil-line"></div>
                    <p class="mil-desc" id="milDesc">${escapeHTML(galleryItems[0].desc)}</p>
                </div>
            </div>
        `;

        container.querySelectorAll('img.mil-img').forEach(img => {
            img.addEventListener('error', function () {
                const idx = this.dataset.index;
                const fallback = document.createElement('div');
                fallback.className = `mil-img mil-no-image ${this.classList.contains('active') ? 'active' : ''}`;
                fallback.dataset.index = idx;
                fallback.innerHTML = `<i class="fa-regular fa-image"></i><span>No Image</span>`;
                this.replaceWith(fallback);
            });
        });

        renderDots();

        const card = document.getElementById('milCard');
        if (card) {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.mil-dot')) return;
                if (e.target.closest('.mil-more-btn')) return;
                nextSlide();
            });
        }

        startAutoRotate();
    }

    /* ==========================================================
       🔘 RENDER DOTS
       ========================================================== */
    function renderDots() {
        if (!dotsWrap) return;
        if (galleryItems.length <= 1) {
            dotsWrap.innerHTML = '';
            return;
        }

        dotsWrap.innerHTML = galleryItems.map((_, i) =>
            `<button class="mil-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>`
        ).join('');

        dotsWrap.querySelectorAll('.mil-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(dot.dataset.index, 10);
                if (idx === currentIndex) return;
                goToSlide(idx);
            });
        });
    }

    /* ==========================================================
       🔄 SLIDE NAVIGATION
       ========================================================== */
    function nextSlide() {
        if (isAnimating || galleryItems.length <= 1) return;
        const next = (currentIndex + 1) % galleryItems.length;
        goToSlide(next);
    }

    function goToSlide(index) {
        if (isAnimating || index === currentIndex) return;
        if (index < 0 || index >= galleryItems.length) return;

        isAnimating = true;
        resetAutoRotate();

        const content = document.getElementById('milContent');
        const title = document.getElementById('milTitle');
        const desc = document.getElementById('milDesc');
        const counter = document.getElementById('milCounter');

        if (content) content.classList.add('mil-fading');

        setTimeout(() => {
            const currentImg = container.querySelector(`.mil-img[data-index="${currentIndex}"]`);
            if (currentImg) currentImg.classList.remove('active');

            const nextImg = container.querySelector(`.mil-img[data-index="${index}"]`);
            if (nextImg) nextImg.classList.add('active');

            if (title) title.textContent = galleryItems[index].title;
            if (desc) desc.textContent = galleryItems[index].desc;
            if (counter) counter.textContent = `${index + 1} / ${galleryItems.length}`;

            dotsWrap?.querySelectorAll('.mil-dot').forEach((d, i) => {
                d.classList.toggle('active', i === index);
            });

            currentIndex = index;

            if (content) {
                setTimeout(() => {
                    content.classList.remove('mil-fading');
                    setTimeout(() => { isAnimating = false; }, 500);
                }, 50);
            } else {
                isAnimating = false;
            }
        }, CONFIG.transitionMs / 2);
    }

    /* ==========================================================
       ⏱️ AUTO ROTATE
       ========================================================== */
    function startAutoRotate() {
        if (galleryItems.length <= 1) return;
        resetAutoRotate();
    }

    function resetAutoRotate() {
        if (autoTimer) clearInterval(autoTimer);
        if (galleryItems.length <= 1) return;
        autoTimer = setInterval(() => {
            nextSlide();
        }, CONFIG.autoRotateMs);
    }

    function stopAutoRotate() {
        if (autoTimer) clearInterval(autoTimer);
        autoTimer = null;
    }

    if (container) {
        container.addEventListener('mouseenter', stopAutoRotate);
        container.addEventListener('mouseleave', () => {
            if (galleryItems.length > 1) resetAutoRotate();
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoRotate();
            stopHeroAutoRotate();
        } else {
            if (galleryItems.length > 1) resetAutoRotate();
            if (heroItems.length > 1) resetHeroAutoRotate();
        }
    });

    /* ==========================================================
       🔒 HTML ESCAPE
       ========================================================== */
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ==========================================================
       🚀 INIT
       ========================================================== */
    (async function init() {
        try {
            console.log('🖼️ Mini Image Library — Loading...');
            items = await fetchSheetData();
            console.log('✅ Loaded items:', items.length);

            renderHeroSlider();
            renderCard();

        } catch (err) {
            console.error('❌ Mini Image Library error:', err);
            if (container) {
                container.innerHTML = `
                    <div class="mil-empty">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Failed to load gallery</span>
                    </div>
                `;
            }
            if (heroContainer) {
                heroContainer.innerHTML = `
                    <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#0f172a; color:#ef4444; font-weight:bold; font-size:0.9rem;">
                        Failed to load hero banner
                    </div>
                `;
            }
        }
    })();

})();

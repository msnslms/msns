/* ==========================================================
   🎡 MSNS ALL-IN-ONE GALLERY SYSTEM
   Hero Banner | Mini Card Gallery | Grid Gallery | Modal View
   Sheet: mini-image-library
   Columns: url | titel | discretion | home | home-heder
   ========================================================== */

(function () {
    'use strict';

    /* ==========================================================
       📌 CONFIGURATION
       ========================================================== */
    const CONFIG = {
        sheetId: '1mN5jfN4P3FFevv2Aq0ygWmTzrF7-dVWfdy-8cDFa7ro',
        sheetName: 'mini-image-library',
        autoRotateMs: 5000,         // Hero & Mini Gallery interval (5s)
        transitionMs: 700,          // Transition duration
        maxItems: 60                // Max items to fetch
    };

    /* ==========================================================
       📌 DOM ELEMENTS DETECT
       ========================================================== */
    // Hero Banner
    const heroContainer = document.getElementById('heroSliderContainer');

    // Mini Card Gallery
    const milContainer  = document.getElementById('milContainer');
    const milDotsWrap   = document.getElementById('milDots');

    // Grid Gallery (image-library.html)
    const gridContainer = document.getElementById('galleryGrid');

    // Modal Elements
    const modal         = document.getElementById('galleryModal');
    const modalImg      = document.getElementById('modalImage');
    const modalTitle    = document.getElementById('modalTitle');
    const modalDesc     = document.getElementById('modalDesc');
    const modalCount    = document.getElementById('modalCounter');
    const modalClose    = document.getElementById('modalClose');
    const modalPrev     = document.getElementById('modalPrev');
    const modalNext     = document.getElementById('modalNext');

    // Early return if no gallery components on this page
    if (!heroContainer && !milContainer && !gridContainer) return;

    /* ==========================================================
       🎯 GLOBAL STATE
       ========================================================== */
    let allItems = [];
    let heroItems = [];
    let miniItems = [];
    let gridItems = [];

    // Hero state
    let heroCurrentIndex = 0;
    let heroAutoTimer = null;
    let isHeroAnimating = false;

    // Mini gallery state
    let miniCurrentIndex = 0;
    let miniAutoTimer = null;
    let isMiniAnimating = false;

    // Modal state - which gallery opened it
    let modalSourceItems = [];
    let modalIndex = 0;

    /* ==========================================================
       🎨 URL NORMALIZER
       ========================================================== */
    function normalizeUrl(rawUrl) {
        if (!rawUrl) return '';
        let url = rawUrl.trim().replace(/^["']|["']$/g, '');

        const driveMatch = url.match(/(?:\/file\/d\/|id=|uc\?.*id=|\/d\/)([a-zA-Z0-9_-]+)/);
        if ((url.includes('drive.google.com') || url.includes('docs.google.com')) && driveMatch) {
            return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        }
        return url;
    }

    /* ==========================================================
       📥 FETCH SHEET DATA
       ========================================================== */
    async function fetchSheetData() {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.sheetName)}`;
        console.log('📥 Fetching Sheet:', url);

        const response = await fetch(url);
        if (!response.ok) throw new Error('Sheet fetch failed: ' + response.status);

        const csv = await response.text();
        return parseCSV(csv);
    }

    /* ==========================================================
       🧩 PARSE CSV
       ========================================================== */
    function parseCSV(csv) {
        const rows = [];
        let row = [], field = '', inQuotes = false;

        for (let i = 0; i < csv.length; i++) {
            const c = csv[i];
            const next = csv[i + 1];

            if (c === '"') {
                if (inQuotes && next === '"') { field += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) {
                row.push(field); field = '';
            } else if ((c === '\n' || c === '\r') && !inQuotes) {
                if (field !== '' || row.length > 0) {
                    row.push(field);
                    rows.push(row);
                    row = []; field = '';
                }
                if (c === '\r' && next === '\n') i++;
            } else {
                field += c;
            }
        }
        if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

        if (rows.length < 2) return [];

        const headers = rows[0].map(h => h.trim().toLowerCase());

        const urlIdx    = headers.findIndex(h => h === 'url' || h.includes('url') || h === 'image');
        const titleIdx  = headers.findIndex(h => h === 'titel' || h === 'title' || h.includes('tit') || h === 'heading');
        const descIdx   = headers.findIndex(h => h.includes('discre') || h.includes('desc') || h.includes('text') || h === 'discretion');

        const homeHeaderIdx = headers.findIndex(h => h === 'home-heder' || h === 'home-header' || h.includes('heder') || h.includes('header') || h === 'hero');
        const homeIdx       = headers.findIndex((h, idx) => (h === 'home' || h.trim() === 'home') && idx !== homeHeaderIdx);

        const data = [];
        for (let i = 1; i < rows.length && data.length < CONFIG.maxItems; i++) {
            const r = rows[i];
            const url    = (r[urlIdx] || '').trim();
            const title  = (r[titleIdx] || '').trim();
            const desc   = (r[descIdx] || '').trim();

            let isHomeGallery = false;
            if (homeIdx !== -1) {
                const homeVal = (r[homeIdx] || '').trim().toLowerCase();
                if (homeVal === 'yes' || homeVal === 'true' || homeVal === '1') isHomeGallery = true;
            }

            let isHero = false;
            if (homeHeaderIdx !== -1) {
                const homeHeaderVal = (r[homeHeaderIdx] || '').trim().toLowerCase();
                if (homeHeaderVal === 'yes' || homeHeaderVal === 'true' || homeHeaderVal === '1') isHero = true;
            }

            if (!url && !title && !desc) continue;

            data.push({
                url: normalizeUrl(url),
                title: title || 'Untitled',
                desc: desc || '',
                hasImage: !!url,
                isHome: isHomeGallery,
                isHero: isHero
            });
        }

        return data;
    }

    /* ==========================================================
       🎬 1. HERO SLIDER LOGIC
       ========================================================== */
    function renderHeroSlider() {
        if (!heroContainer) return;

        heroItems = allItems.filter(item => item.isHero);
        if (heroItems.length === 0) heroItems = allItems.filter(item => item.hasImage);

        if (heroItems.length === 0) {
            heroContainer.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#0f172a; color:#94a3b8; font-weight:bold;">No Hero Images Available</div>`;
            return;
        }

        const imagesHTML = heroItems.map((item, i) => {
            if (!item.hasImage) {
                return `<div class="hero-slider-img mil-no-image ${i === 0 ? 'active' : ''}" data-hero-index="${i}"><i class="fa-regular fa-image"></i><span>No Image</span></div>`;
            }
            return `<img class="hero-slider-img ${i === 0 ? 'active' : ''}" data-hero-index="${i}" src="${item.url}" alt="${escapeHTML(item.title)}" loading="eager">`;
        }).join('');

        const initialTitle = heroItems[0]?.title ? escapeHTML(heroItems[0].title) : '';
        const initialDesc  = heroItems[0]?.desc ? escapeHTML(heroItems[0].desc) : '';

        heroContainer.innerHTML = `
            ${imagesHTML}
            <div class="hero-slider-overlay active" id="heroOverlay" style="${(!initialTitle && !initialDesc) ? 'display:none;' : ''}">
                <div class="hero-slider-title" id="heroTitle">${initialTitle}</div>
                <div class="hero-slider-desc" id="heroDesc">${initialDesc}</div>
            </div>
        `;

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

    function nextHeroSlide() {
        if (isHeroAnimating || heroItems.length <= 1) return;
        const next = (heroCurrentIndex + 1) % heroItems.length;
        goToHeroSlide(next);
    }

    function goToHeroSlide(index) {
        if (isHeroAnimating || index === heroCurrentIndex) return;
        isHeroAnimating = true;
        resetHeroAutoRotate();

        const title   = document.getElementById('heroTitle');
        const desc    = document.getElementById('heroDesc');
        const overlay = document.getElementById('heroOverlay');

        if (overlay) overlay.classList.remove('active');

        setTimeout(() => {
            const currentImg = heroContainer.querySelector(`.hero-slider-img[data-hero-index="${heroCurrentIndex}"]`);
            if (currentImg) currentImg.classList.remove('active');

            const nextImg = heroContainer.querySelector(`.hero-slider-img[data-hero-index="${index}"]`);
            if (nextImg) nextImg.classList.add('active');

            const newTitle = heroItems[index].title;
            const newDesc  = heroItems[index].desc;

            if (overlay) {
                if (!newTitle && !newDesc) {
                    overlay.style.display = 'none';
                } else {
                    overlay.style.display = 'block';
                    if (title) title.textContent = newTitle;
                    if (desc)  desc.textContent  = newDesc;
                }
            }

            heroCurrentIndex = index;

            setTimeout(() => {
                if (overlay && (newTitle || newDesc)) overlay.classList.add('active');
                setTimeout(() => { isHeroAnimating = false; }, 500);
            }, 50);
        }, 350);
    }

    function startHeroAutoRotate() {
        if (heroItems.length <= 1) return;
        resetHeroAutoRotate();
    }

    function resetHeroAutoRotate() {
        if (heroAutoTimer) clearInterval(heroAutoTimer);
        if (heroItems.length <= 1) return;
        heroAutoTimer = setInterval(nextHeroSlide, CONFIG.autoRotateMs);
    }

    function stopHeroAutoRotate() {
        if (heroAutoTimer) clearInterval(heroAutoTimer);
        heroAutoTimer = null;
    }

    if (heroContainer) {
        heroContainer.addEventListener('mouseenter', stopHeroAutoRotate);
        heroContainer.addEventListener('mouseleave', () => { if (heroItems.length > 1) resetHeroAutoRotate(); });
    }

    /* ==========================================================
       🎬 2. MINI CARD GALLERY LOGIC
       ========================================================== */
    function renderMiniCard() {
        if (!milContainer) return;

        miniItems = allItems.filter(item => item.isHome);
        if (miniItems.length === 0) miniItems = allItems.filter(item => item.hasImage);

        if (miniItems.length === 0) {
            milContainer.innerHTML = `<div class="mil-empty"><i class="fa-regular fa-images"></i><span>No gallery items available</span></div>`;
            return;
        }

        const imagesHTML = miniItems.map((item, i) => {
            if (!item.hasImage) {
                return `<div class="mil-img mil-no-image ${i === 0 ? 'active' : ''}" data-index="${i}"><i class="fa-regular fa-image"></i><span>No Image</span></div>`;
            }
            return `<img class="mil-img ${i === 0 ? 'active' : ''}" data-index="${i}" src="${item.url}" alt="${escapeHTML(item.title)}" loading="lazy">`;
        }).join('');

        milContainer.innerHTML = `
            <div class="mil-card" id="milCard">
                <div class="mil-media" id="milMedia">
                    ${imagesHTML}
                    <div class="mil-counter" id="milCounter">1 / ${miniItems.length}</div>
                </div>
                <div class="mil-content" id="milContent">
                    <h3 class="mil-title" id="milTitle">${escapeHTML(miniItems[0].title)}</h3>
                    <div class="mil-line"></div>
                    <p class="mil-desc" id="milDesc">${escapeHTML(miniItems[0].desc)}</p>
                </div>
            </div>
        `;

        milContainer.querySelectorAll('img.mil-img').forEach(img => {
            img.addEventListener('error', function () {
                const idx = this.dataset.index;
                const fallback = document.createElement('div');
                fallback.className = `mil-img mil-no-image ${this.classList.contains('active') ? 'active' : ''}`;
                fallback.dataset.index = idx;
                fallback.innerHTML = `<i class="fa-regular fa-image"></i><span>No Image</span>`;
                this.replaceWith(fallback);
            });
        });

        renderMiniDots();

        const card = document.getElementById('milCard');
        if (card) {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.mil-dot') || e.target.closest('.mil-more-btn')) return;
                nextMiniSlide();
            });
        }

        startMiniAutoRotate();
    }

    function renderMiniDots() {
        if (!milDotsWrap) return;
        if (miniItems.length <= 1) { milDotsWrap.innerHTML = ''; return; }

        milDotsWrap.innerHTML = miniItems.map((_, i) =>
            `<button class="mil-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>`
        ).join('');

        milDotsWrap.querySelectorAll('.mil-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(dot.dataset.index, 10);
                if (idx !== miniCurrentIndex) goToMiniSlide(idx);
            });
        });
    }

    function nextMiniSlide() {
        if (isMiniAnimating || miniItems.length <= 1) return;
        const next = (miniCurrentIndex + 1) % miniItems.length;
        goToMiniSlide(next);
    }

    function goToMiniSlide(index) {
        if (isMiniAnimating || index === miniCurrentIndex) return;
        isMiniAnimating = true;
        resetMiniAutoRotate();

        const content = document.getElementById('milContent');
        const title   = document.getElementById('milTitle');
        const desc    = document.getElementById('milDesc');
        const counter = document.getElementById('milCounter');

        if (content) content.classList.add('mil-fading');

        setTimeout(() => {
            const currentImg = milContainer.querySelector(`.mil-img[data-index="${miniCurrentIndex}"]`);
            if (currentImg) currentImg.classList.remove('active');

            const nextImg = milContainer.querySelector(`.mil-img[data-index="${index}"]`);
            if (nextImg) nextImg.classList.add('active');

            if (title)   title.textContent   = miniItems[index].title;
            if (desc)    desc.textContent    = miniItems[index].desc;
            if (counter) counter.textContent = `${index + 1} / ${miniItems.length}`;

            milDotsWrap?.querySelectorAll('.mil-dot').forEach((d, i) => {
                d.classList.toggle('active', i === index);
            });

            miniCurrentIndex = index;

            if (content) {
                setTimeout(() => {
                    content.classList.remove('mil-fading');
                    setTimeout(() => { isMiniAnimating = false; }, 500);
                }, 50);
            } else {
                isMiniAnimating = false;
            }
        }, CONFIG.transitionMs / 2);
    }

    function startMiniAutoRotate() {
        if (miniItems.length <= 1) return;
        resetMiniAutoRotate();
    }

    function resetMiniAutoRotate() {
        if (miniAutoTimer) clearInterval(miniAutoTimer);
        if (miniItems.length <= 1) return;
        miniAutoTimer = setInterval(nextMiniSlide, CONFIG.autoRotateMs);
    }

    function stopMiniAutoRotate() {
        if (miniAutoTimer) clearInterval(miniAutoTimer);
        miniAutoTimer = null;
    }

    if (milContainer) {
        milContainer.addEventListener('mouseenter', stopMiniAutoRotate);
        milContainer.addEventListener('mouseleave', () => { if (miniItems.length > 1) resetMiniAutoRotate(); });
    }

    /* ==========================================================
       🎬 3. GRID GALLERY LOGIC (image-library.html)
       ========================================================== */
    function renderGridGallery() {
        if (!gridContainer) return;

        // Show all items (or only isHome ones — let's use all)
        gridItems = allItems;

        if (gridItems.length === 0) {
            gridContainer.innerHTML = `
                <div class="gallery-empty-state">
                    <i class="fa-regular fa-images"></i>
                    <span>No images available</span>
                </div>
            `;
            return;
        }

        gridContainer.innerHTML = gridItems.map((item, i) => {
            if (!item.hasImage) {
                return `
                    <div class="gallery-card no-image" data-index="${i}">
                        <i class="fa-regular fa-image"></i>
                        <span>No Image</span>
                    </div>
                `;
            }
            return `
                <div class="gallery-card" data-index="${i}">
                    <img src="${escapeHTML(item.url)}" 
                         alt="${escapeHTML(item.title)}" 
                         loading="lazy"
                         onerror="this.parentElement.classList.add('no-image'); this.parentElement.innerHTML='<i class=&quot;fa-regular fa-image&quot;></i><span>No Image</span>';">
                    <div class="gallery-card-title">${escapeHTML(item.title)}</div>
                </div>
            `;
        }).join('');

        // Card click → open modal (with gridItems as source)
        gridContainer.querySelectorAll('.gallery-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.index, 10);
                openModal(idx, gridItems);
            });
        });
    }

    /* ==========================================================
       🖼️ 4. MODAL LOGIC (Works with Mini + Grid)
       ========================================================== */
    function openModal(index, sourceItems) {
        if (!modal) return;
        if (!sourceItems || sourceItems.length === 0) return;
        if (index < 0 || index >= sourceItems.length) return;

        modalSourceItems = sourceItems;
        modalIndex = index;

        const item = modalSourceItems[index];

        if (modalImg) {
            modalImg.style.animation = 'none';
            void modalImg.offsetWidth;
            modalImg.style.animation = '';
            modalImg.src = item.url || '';
            modalImg.alt = item.title || '';
        }

        if (modalTitle) modalTitle.textContent = item.title || 'Untitled';
        if (modalDesc)  modalDesc.textContent  = item.desc  || 'No description available.';
        if (modalCount) modalCount.textContent = `${index + 1} / ${modalSourceItems.length}`;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function modalPrevSlide() {
        if (modalSourceItems.length === 0) return;
        const newIdx = (modalIndex - 1 + modalSourceItems.length) % modalSourceItems.length;
        openModal(newIdx, modalSourceItems);
    }

    function modalNextSlide() {
        if (modalSourceItems.length === 0) return;
        const newIdx = (modalIndex + 1) % modalSourceItems.length;
        openModal(newIdx, modalSourceItems);
    }

    modalClose?.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    modalPrev?.addEventListener('click', (e) => { e.stopPropagation(); modalPrevSlide(); });
    modalNext?.addEventListener('click', (e) => { e.stopPropagation(); modalNextSlide(); });

    document.addEventListener('keydown', (e) => {
        if (!modal || !modal.classList.contains('active')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') modalPrevSlide();
        if (e.key === 'ArrowRight') modalNextSlide();
    });

    // Touch swipe on modal
    let touchStartX = 0;
    modal?.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    modal?.addEventListener('touchend', (e) => {
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) < 60) return;
        if (delta > 0) modalPrevSlide();
        else modalNextSlide();
    }, { passive: true });

    /* ==========================================================
       🔒 HELPERS
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
       🔁 VISIBILITY
       ========================================================== */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopHeroAutoRotate();
            stopMiniAutoRotate();
        } else {
            if (heroItems.length > 1) resetHeroAutoRotate();
            if (miniItems.length > 1) resetMiniAutoRotate();
        }
    });

    /* ==========================================================
       🚀 INITIALIZATION
       ========================================================== */
    (async function init() {
        try {
            console.log('🖼️ MSNS Gallery System Loading...');
            allItems = await fetchSheetData();
            console.log('✅ Loaded total items:', allItems.length);

            // Render whichever components exist on the current page
            renderHeroSlider();
            renderMiniCard();
            renderGridGallery();

        } catch (err) {
            console.error('❌ Gallery initialization error:', err);

            if (heroContainer) {
                heroContainer.innerHTML = `<div style="padding:20px; text-align:center; color:#ef4444; font-weight:bold;">Failed to load hero banner</div>`;
            }
            if (milContainer) {
                milContainer.innerHTML = `<div class="mil-empty"><i class="fa-solid fa-triangle-exclamation"></i><span>Failed to load mini gallery</span></div>`;
            }
            if (gridContainer) {
                gridContainer.innerHTML = `
                    <div class="gallery-empty-state">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Failed to load gallery</span>
                    </div>
                `;
            }
        }
    })();

})();

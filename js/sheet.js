/* ==========================================================
   🖼️ MINI IMAGE LIBRARY — Google Sheets Slider
   Sheet: mini-image-library
   Columns: url | titel | discretion | home
   ========================================================== */

(function () {
    'use strict';

    const CONFIG = {
        sheetId: '1mN5jfN4P3FFevv2Aq0ygWmTzrF7-dVWfdy-8cDFa7ro',
        sheetName: 'mini-image-library',
        autoRotateMs: 5000,        
        transitionMs: 700,         
        maxItems: 20               
    };

    const container = document.getElementById('milContainer');
    const dotsWrap  = document.getElementById('milDots');

    if (!container) return;

    let items = [];
    let currentIndex = 0;
    let autoTimer = null;
    let isAnimating = false;

    function normalizeImageUrl(rawUrl) {
        if (!rawUrl) return '';
        let url = rawUrl.trim().replace(/^["']|["']$/g, '');
        const driveFileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const driveIdMatch   = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const driveUcMatch   = url.match(/uc\?.*id=([a-zA-Z0-9_-]+)/);

        let fileId = null;
        if (driveFileMatch) fileId = driveFileMatch[1];
        else if (driveUcMatch) fileId = driveUcMatch[1];
        else if (url.includes('drive.google.com') && driveIdMatch) fileId = driveIdMatch[1];

        if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
        return url;
    }

    async function fetchSheetData() {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.sheetName)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch sheet: ' + response.status);
        const csv = await response.text();
        return parseCSV(csv);
    }

    function parseCSV(csv) {
        const rows = [];
        let row = [], field = '', inQuotes = false;

        for (let i = 0; i < csv.length; i++) {
            const c = csv[i], next = csv[i + 1];
            if (c === '"') {
                if (inQuotes && next === '"') { field += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) {
                row.push(field); field = '';
            } else if ((c === '\n' || c === '\r') && !inQuotes) {
                if (field !== '' || row.length > 0) { row.push(field); rows.push(row); row = []; field = ''; }
                if (c === '\r' && next === '\n') i++;
            } else field += c;
        }
        if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => h.trim().toLowerCase());
        const urlIdx = headers.findIndex(h => h.includes('url') || h === 'image');
        const titleIdx = headers.findIndex(h => h.includes('titel') || h.includes('title'));
        const descIdx = headers.findIndex(h => h.includes('discre') || h.includes('desc'));
        const homeIdx = headers.findIndex(h => h.includes('home'));

        const data = [];
        for (let i = 1; i < rows.length && data.length < CONFIG.maxItems; i++) {
            const r = rows[i];
            const url = (r[urlIdx] || '').trim();
            const title = (r[titleIdx] || '').trim();
            const desc = (r[descIdx] || '').trim();

            if (homeIdx !== -1) {
                const homeVal = (r[homeIdx] || '').trim().toLowerCase();
                if (homeVal !== 'yes') continue;
            }

            if (!url && !title && !desc) continue;
            data.push({ url: normalizeImageUrl(url), title: title || 'Untitled', desc: desc || '', hasImage: !!url });
        }
        return data;
    }

    function renderCard() {
        if (items.length === 0) {
            container.innerHTML = `<div class="mil-empty"><i class="fa-regular fa-images"></i><span>No gallery items available</span></div>`;
            return;
        }

        const imagesHTML = items.map((item, i) => {
            if (!item.hasImage) return `<div class="mil-img mil-no-image ${i === 0 ? 'active' : ''}" data-index="${i}"><i class="fa-regular fa-image"></i><span>No Image</span></div>`;
            return `<img class="mil-img ${i === 0 ? 'active' : ''}" data-index="${i}" src="${item.url}" alt="${escapeHTML(item.title)}" loading="lazy">`;
        }).join('');

        container.innerHTML = `
            <div class="mil-card" id="milCard">
                <div class="mil-media" id="milMedia">
                    ${imagesHTML}
                    <div class="mil-counter" id="milCounter">1 / ${items.length}</div>
                </div>
                <div class="mil-content" id="milContent">
                    <h3 class="mil-title" id="milTitle">${escapeHTML(items[0].title)}</h3>
                    <div class="mil-line"></div>
                    <p class="mil-desc" id="milDesc">${escapeHTML(items[0].desc)}</p>
                </div>
            </div>
        `;

        container.querySelectorAll('img.mil-img').forEach(img => {
            img.addEventListener('error', function () {
                const fallback = document.createElement('div');
                fallback.className = `mil-img mil-no-image ${this.classList.contains('active') ? 'active' : ''}`;
                fallback.dataset.index = this.dataset.index;
                fallback.innerHTML = `<i class="fa-regular fa-image"></i><span>No Image</span>`;
                this.replaceWith(fallback);
            });
        });

        renderDots();
        const card = document.getElementById('milCard');
        if (card) {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.mil-dot') || e.target.closest('.mil-more-btn')) return;
                nextSlide();
            });
        }
        startAutoRotate();
    }

    function renderDots() {
        if (!dotsWrap || items.length <= 1) return;
        dotsWrap.innerHTML = items.map((_, i) => `<button class="mil-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`).join('');
        dotsWrap.querySelectorAll('.mil-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(dot.dataset.index, 10);
                if (idx !== currentIndex) goToSlide(idx);
            });
        });
    }

    function nextSlide() {
        if (!isAnimating && items.length > 1) goToSlide((currentIndex + 1) % items.length);
    }

    function goToSlide(index) {
        if (isAnimating || index === currentIndex || index < 0 || index >= items.length) return;
        isAnimating = true;
        resetAutoRotate();

        const content = document.getElementById('milContent');
        if (content) content.classList.add('mil-fading');

        setTimeout(() => {
            const currentImg = container.querySelector(`.mil-img[data-index="${currentIndex}"]`);
            if (currentImg) currentImg.classList.remove('active');
            const nextImg = container.querySelector(`.mil-img[data-index="${index}"]`);
            if (nextImg) nextImg.classList.add('active');

            const title = document.getElementById('milTitle');
            const desc = document.getElementById('milDesc');
            const counter = document.getElementById('milCounter');

            if (title) title.textContent = items[index].title;
            if (desc) desc.textContent = items[index].desc;
            if (counter) counter.textContent = `${index + 1} / ${items.length}`;

            dotsWrap?.querySelectorAll('.mil-dot').forEach((d, i) => d.classList.toggle('active', i === index));
            currentIndex = index;

            if (content) {
                setTimeout(() => {
                    content.classList.remove('mil-fading');
                    setTimeout(() => { isAnimating = false; }, 500);
                }, 50);
            } else isAnimating = false;
        }, CONFIG.transitionMs / 2);
    }

    function startAutoRotate() { if (items.length > 1) resetAutoRotate(); }
    function resetAutoRotate() {
        if (autoTimer) clearInterval(autoTimer);
        if (items.length > 1) autoTimer = setInterval(nextSlide, CONFIG.autoRotateMs);
    }
    function stopAutoRotate() { if (autoTimer) clearInterval(autoTimer); autoTimer = null; }

    container.addEventListener('mouseenter', stopAutoRotate);
    container.addEventListener('mouseleave', () => { if (items.length > 1) resetAutoRotate(); });
    document.addEventListener('visibilitychange', () => { document.hidden ? stopAutoRotate() : (items.length > 1 && resetAutoRotate()); });

    function escapeHTML(str) {
        return !str ? '' : String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    (async function init() {
        try {
            items = await fetchSheetData();
            renderCard();
        } catch (err) {
            console.error('❌ Mini Image Library error:', err);
            container.innerHTML = `<div class="mil-empty"><i class="fa-solid fa-triangle-exclamation"></i><span>Failed to load gallery</span></div>`;
        }
    })();
})();

/* ==========================================================
   🖼️ HERO BANNER SLIDER — home-heder tab
   Sheet: home-heder
   Columns: url | titel | text
   ========================================================== */
(function initHeroSlider() {
    'use strict';

    const HERO_CONFIG = {
        sheetId: '1mN5jfN4P3FFevv2Aq0ygWmTzrF7-dVWfdy-8cDFa7ro',
        sheetName: 'home-heder',
        autoRotateMs: 4500,
        transitionMs: 800,
        maxItems: 10
    };

    const heroContainer = document.getElementById('heroSlider');
    
    // 🔥 මෙතැනින් තමයි බලන්නේ ඔයාගේ HTML එකේ ID එක තියෙනවද කියලා
    if (!heroContainer) {
        console.warn('⚠️ Hero Slider: <div id="heroSlider"></div> HTML එකේ හොයාගන්න බැහැ!');
        return; 
    }

    let heroItems = [];
    let heroIndex = 0;
    let heroTimer = null;
    let heroAnimating = false;

    function heroNormalizeUrl(rawUrl) {
        if (!rawUrl) return '';
        let url = rawUrl.trim().replace(/^["']|["']$/g, '');
        const driveFileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const driveIdMatch   = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const driveUcMatch   = url.match(/uc\?.*id=([a-zA-Z0-9_-]+)/);

        let fileId = null;
        if (driveFileMatch) fileId = driveFileMatch[1];
        else if (driveUcMatch) fileId = driveUcMatch[1];
        else if (url.includes('drive.google.com') && driveIdMatch) fileId = driveIdMatch[1];

        if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
        return url;
    }

    async function heroFetch() {
        const url = `https://docs.google.com/spreadsheets/d/${HERO_CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(HERO_CONFIG.sheetName)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Hero fetch failed: ' + res.status);
        const csv = await res.text();
        return heroParseCSV(csv);
    }

    function heroParseCSV(csv) {
        const rows = [];
        let row = [], field = '', inQuotes = false;

        for (let i = 0; i < csv.length; i++) {
            const c = csv[i], next = csv[i + 1];
            if (c === '"') {
                if (inQuotes && next === '"') { field += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) {
                row.push(field); field = '';
            } else if ((c === '\n' || c === '\r') && !inQuotes) {
                if (field !== '' || row.length > 0) { row.push(field); rows.push(row); row = []; field = ''; }
                if (c === '\r' && next === '\n') i++;
            } else field += c;
        }
        if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        // 📌 Sheet එකේ තියන මාතෘකා හරියටම අල්ලගන්නවා (url, titel, text)
        const urlIdx   = headers.findIndex(h => h === 'url');
        const titleIdx = headers.findIndex(h => h === 'titel' || h === 'title');
        const textIdx  = headers.findIndex(h => h === 'text');

        const data = [];
        for (let i = 1; i < rows.length && data.length < HERO_CONFIG.maxItems; i++) {
            const r = rows[i];
            const url   = urlIdx !== -1 ? (r[urlIdx] || '').trim() : '';
            const title = titleIdx !== -1 ? (r[titleIdx] || '').trim() : '';
            const text  = textIdx !== -1 ? (r[textIdx] || '').trim() : '';

            if (!url && !title && !text) continue;

            data.push({
                url: heroNormalizeUrl(url),
                title: title,
                text: text,
                hasImage: !!url
            });
        }
        return data;
    }

    function heroRender() {
        if (heroItems.length === 0) {
            heroContainer.innerHTML = `<div class="hero-empty"><i class="fa-regular fa-image"></i><span>No banner images</span></div>`;
            return;
        }

        const slidesHTML = heroItems.map((item, i) => {
            if (!item.hasImage) return '';
            return `<img class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}" src="${item.url}" alt="${heroEscapeHTML(item.title)}" loading="lazy">`;
        }).join('');

        const dotsHTML = heroItems.length > 1 
            ? `<div class="hero-dots" id="heroDots">${heroItems.map((_, i) => `<button class="hero-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`).join('')}</div>`
            : '';

        const counterHTML = heroItems.length > 1 ? `<div class="hero-counter" id="heroCounter">1 / ${heroItems.length}</div>` : '';

        // 📌 Title එකයි Text එකයි වෙනම පෙන්නන්න හදපු Overlay එක
        const contentHTML = `
            <div class="hero-content-overlay" id="heroOverlay">
                <h1 class="hero-title" id="heroTitle">${heroEscapeHTML(heroItems[0].title)}</h1>
                <p class="hero-text" id="heroText">${heroEscapeHTML(heroItems[0].text)}</p>
            </div>
        `;

        heroContainer.innerHTML = `
            ${slidesHTML}
            ${contentHTML}
            ${dotsHTML}
            ${counterHTML}
        `;

        heroContainer.querySelectorAll('img.hero-slide').forEach(img => {
            img.addEventListener('error', function () {
                this.style.display = 'none';
                if (this.classList.contains('active')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'hero-slide hero-empty active';
                    fallback.innerHTML = `<i class="fa-regular fa-image"></i><span>Image unavailable</span>`;
                    this.replaceWith(fallback);
                }
            });
        });

        const dots = document.getElementById('heroDots');
        if (dots) {
            dots.addEventListener('click', (e) => {
                const dot = e.target.closest('.hero-dot');
                if (!dot) return;
                e.stopPropagation();
                const idx = parseInt(dot.dataset.index, 10);
                if (idx !== heroIndex) heroGoTo(idx);
            });
        }

        heroContainer.addEventListener('click', (e) => {
            if (e.target.closest('.hero-dot')) return;
            heroNext();
        });

        if (heroItems.length > 1) heroStartAuto();
    }

    function heroNext() {
        if (!heroAnimating && heroItems.length > 1) heroGoTo((heroIndex + 1) % heroItems.length);
    }

    function heroGoTo(index) {
        if (heroAnimating || index === heroIndex || index < 0 || index >= heroItems.length) return;
        heroAnimating = true;
        heroResetAuto();

        const overlay = document.getElementById('heroOverlay');
        const counter = document.getElementById('heroCounter');
        
        if (overlay) overlay.classList.add('hero-fading');

        setTimeout(() => {
            const curr = heroContainer.querySelector(`.hero-slide[data-index="${heroIndex}"]`);
            if (curr) curr.classList.remove('active');

            const next = heroContainer.querySelector(`.hero-slide[data-index="${index}"]`);
            if (next) next.classList.add('active');

            // 📌 අලුත් Slide එකට අදාළ Title සහ Text එක මාරු කිරීම
            const titleEl = document.getElementById('heroTitle');
            const textEl = document.getElementById('heroText');
            if (titleEl) titleEl.textContent = heroItems[index].title;
            if (textEl) textEl.textContent = heroItems[index].text;

            if (counter) counter.textContent = `${index + 1} / ${heroItems.length}`;

            heroContainer.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === index));
            heroIndex = index;

            if (overlay) {
                setTimeout(() => {
                    overlay.classList.remove('hero-fading');
                    setTimeout(() => { heroAnimating = false; }, 500);
                }, 50);
            } else {
                heroAnimating = false;
            }
        }, HERO_CONFIG.transitionMs / 2);
    }

    function heroStartAuto() { if (heroItems.length > 1) heroResetAuto(); }
    function heroResetAuto() {
        if (heroTimer) clearInterval(heroTimer);
        if (heroItems.length > 1) heroTimer = setInterval(heroNext, HERO_CONFIG.autoRotateMs);
    }
    function heroStopAuto() { if (heroTimer) clearInterval(heroTimer); heroTimer = null; }

    heroContainer.addEventListener('mouseenter', heroStopAuto);
    heroContainer.addEventListener('mouseleave', () => { if (heroItems.length > 1) heroResetAuto(); });
    document.addEventListener('visibilitychange', () => { document.hidden ? heroStopAuto() : (heroItems.length > 1 && heroResetAuto()); });

    function heroEscapeHTML(str) {
        return !str ? '' : String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    (async function heroInit() {
        try {
            heroItems = await heroFetch();
            heroRender();
        } catch (err) {
            console.error('❌ Hero Slider error:', err);
            if(heroContainer) {
                heroContainer.innerHTML = `<div class="hero-empty"><i class="fa-solid fa-triangle-exclamation"></i><span>Failed to load banner</span></div>`;
            }
        }
    })();
})();

/* ==========================================================
   🖼️ MINI IMAGE LIBRARY — Google Sheets Slider
   Sheet: mini-image-library
   Columns: url | titel | discretion | home
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
        maxItems: 20               // Max items to load
    };

    /* ==========================================================
       📌 DOM
       ========================================================== */
    const container = document.getElementById('milContainer');
    const dotsWrap  = document.getElementById('milDots');

    if (!container) return;

    /* ==========================================================
       🎯 STATE
       ========================================================== */
    let items = [];
    let currentIndex = 0;
    let autoTimer = null;
    let isAnimating = false;

    /* ==========================================================
       🎨 URL NORMALIZER — imgbb & Google Drive
       ========================================================== */
    function normalizeImageUrl(rawUrl) {
        if (!rawUrl) return '';

        let url = rawUrl.trim().replace(/^["']|["']$/g, '');

        // Google Drive file ID extraction
        const driveFileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const driveIdMatch   = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const driveUcMatch   = url.match(/uc\?.*id=([a-zA-Z0-9_-]+)/);

        let fileId = null;
        if (driveFileMatch) {
            fileId = driveFileMatch[1];
        } else if (driveUcMatch) {
            fileId = driveUcMatch[1];
        } else if (url.includes('drive.google.com') && driveIdMatch) {
            fileId = driveIdMatch[1];
        }

        if (fileId) {
            return `https://lh3.googleusercontent.com/d/${fileId}`;
        }

        return url;
    }

    /* ==========================================================
       📥 FETCH FROM GOOGLE SHEETS
       ========================================================== */
    async function fetchSheetData() {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.sheetName)}`;

        console.log('📥 Fetching:', url);

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch sheet: ' + response.status);

        const csv = await response.text();
        return parseCSV(csv);
    }

    /* ==========================================================
       🧩 PARSE CSV (With quoted fields support & home filter)
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

        const urlIdx = headers.findIndex(h =>
            h === 'url' || h.includes('url') || h === 'image'
        );
        const titleIdx = headers.findIndex(h =>
            h === 'titel' || h === 'title' || h.includes('tit')
        );
        const descIdx = headers.findIndex(h =>
            h.includes('discre') || h.includes('desc')
        );
        const homeIdx = headers.findIndex(h =>
            h === 'home' || h.includes('home')
        );

        console.log('📊 Headers:', headers);
        console.log('📊 Indexes — URL:', urlIdx, 'Title:', titleIdx, 'Desc:', descIdx, 'Home:', homeIdx);

        const data = [];
        for (let i = 1; i < rows.length && data.length < CONFIG.maxItems; i++) {
            const r = rows[i];
            const url = (r[urlIdx] || '').trim();
            const title = (r[titleIdx] || '').trim();
            const desc = (r[descIdx] || '').trim();

            // Home Column Filter Logic (Only show items where 'home' column is 'yes')
            if (homeIdx !== -1) {
                const homeVal = (r[homeIdx] || '').trim().toLowerCase();
                if (homeVal !== 'yes') continue;
            }

            if (!url && !title && !desc) continue;

            data.push({
                url: normalizeImageUrl(url),
                title: title || 'Untitled',
                desc: desc || '',
                hasImage: !!url
            });
        }

        return data;
    }

    /* ==========================================================
       🎬 RENDER INITIAL CARD
       ========================================================== */
    function renderCard() {
        if (items.length === 0) {
            container.innerHTML = `
                <div class="mil-empty">
                    <i class="fa-regular fa-images"></i>
                    <span>No gallery items available</span>
                </div>
            `;
            return;
        }

        const imagesHTML = items.map((item, i) => {
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
                    <div class="mil-counter" id="milCounter">1 / ${items.length}</div>
                </div>
                <div class="mil-content" id="milContent">
                    <h3 class="mil-title" id="milTitle">${escapeHTML(items[0].title)}</h3>
                    <div class="mil-line"></div>
                    <p class="mil-desc" id="milDesc">${escapeHTML(items[0].desc)}</p>
                </div>
            </div>
        `;

        // Handle Image Load Errors Cleanly
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
        if (items.length <= 1) {
            dotsWrap.innerHTML = '';
            return;
        }

        dotsWrap.innerHTML = items.map((_, i) =>
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
        if (isAnimating || items.length <= 1) return;
        const next = (currentIndex + 1) % items.length;
        goToSlide(next);
    }

    function goToSlide(index) {
        if (isAnimating || index === currentIndex) return;
        if (index < 0 || index >= items.length) return;

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

            if (title) title.textContent = items[index].title;
            if (desc) desc.textContent = items[index].desc;
            if (counter) counter.textContent = `${index + 1} / ${items.length}`;

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
        if (items.length <= 1) return;
        resetAutoRotate();
    }

    function resetAutoRotate() {
        if (autoTimer) clearInterval(autoTimer);
        if (items.length <= 1) return;
        autoTimer = setInterval(() => {
            nextSlide();
        }, CONFIG.autoRotateMs);
    }

    function stopAutoRotate() {
        if (autoTimer) clearInterval(autoTimer);
        autoTimer = null;
    }

    container.addEventListener('mouseenter', stopAutoRotate);
    container.addEventListener('mouseleave', () => {
        if (items.length > 1) resetAutoRotate();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoRotate();
        else if (items.length > 1) resetAutoRotate();
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
            renderCard();
        } catch (err) {
            console.error('❌ Mini Image Library error:', err);
            container.innerHTML = `
                <div class="mil-empty">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Failed to load gallery</span>
                </div>
            `;
        }
    })();

})();

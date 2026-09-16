/* ==========================================================
   🖼️ MSNS SCHOOL GALLERY — Responsive Grid
   Sheet: mini-image-library
   Columns: url | titel | discretion
   ========================================================== */

(function () {
    'use strict';

    const CONFIG = {
        sheetId: '1mN5jfN4P3FFevv2Aq0ygWmTzrF7-dVWfdy-8cDFa7ro',
        sheetName: 'mini-image-library',
        maxItems: 60
    };

    /* DOM */
    const grid       = document.getElementById('galleryGrid');
    const modal      = document.getElementById('galleryModal');
    const modalImg   = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc  = document.getElementById('modalDesc');
    const modalCount = document.getElementById('modalCounter');
    const modalClose = document.getElementById('modalClose');
    const modalPrev  = document.getElementById('modalPrev');
    const modalNext  = document.getElementById('modalNext');

    if (!grid) return;

    let items = [];
    let modalIndex = 0;

    /* ---------- URL Normalizer ---------- */
    function normalizeUrl(rawUrl) {
        if (!rawUrl) return '';
        let url = rawUrl.trim().replace(/^["']|["']$/g, '');

        const driveMatch = url.match(/(?:\/file\/d\/|id=|uc\?.*id=|\/d\/)([a-zA-Z0-9_-]+)/);
        if ((url.includes('drive.google.com') || url.includes('docs.google.com')) && driveMatch) {
            return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        }
        return url;
    }

    /* ---------- Fetch Sheet ---------- */
    async function fetchSheet() {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.sheetName)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Sheet fetch failed');
        const csv = await res.text();
        return parseCSV(csv);
    }

    /* ---------- Parse CSV ---------- */
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
        const urlIdx   = headers.findIndex(h => h.includes('url') || h === 'image');
        const titleIdx = headers.findIndex(h => h.includes('tit') || h === 'heading');
        const descIdx  = headers.findIndex(h => h.includes('discre') || h.includes('desc') || h === 'text');

        const data = [];
        for (let i = 1; i < rows.length && data.length < CONFIG.maxItems; i++) {
            const r = rows[i];
            const url   = (r[urlIdx] || '').trim();
            const title = (r[titleIdx] || '').trim();
            const desc  = (r[descIdx] || '').trim();

            if (!url && !title && !desc) continue;

            data.push({
                url: normalizeUrl(url),
                title: title || 'Untitled',
                desc: desc || '',
                hasImage: !!url
            });
        }
        return data;
    }

    /* ---------- Render Grid ---------- */
    function renderGrid() {
        if (items.length === 0) {
            grid.innerHTML = `
                <div class="gallery-empty-state">
                    <i class="fa-regular fa-images"></i>
                    <span>No images available</span>
                </div>`;
            return;
        }

        grid.innerHTML = items.map((item, i) => {
            if (!item.hasImage) {
                return `
                    <div class="gallery-card no-image" data-index="${i}">
                        <i class="fa-regular fa-image"></i>
                        <span>No Image</span>
                    </div>`;
            }
            return `
                <div class="gallery-card" data-index="${i}">
                    <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" loading="lazy"
                         onerror="this.parentElement.classList.add('no-image'); this.parentElement.innerHTML='<i class=&quot;fa-regular fa-image&quot;></i><span>No Image</span>';">
                    <div class="gallery-card-title">${escapeHtml(item.title)}</div>
                </div>`;
        }).join('');

        grid.querySelectorAll('.gallery-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.index, 10);
                openModal(idx);
            });
        });
    }

    /* ---------- Modal ---------- */
    function openModal(index) {
        if (index < 0 || index >= items.length) return;
        modalIndex = index;
        const item = items[index];

        if (modalImg) {
            modalImg.style.animation = 'none';
            void modalImg.offsetWidth;
            modalImg.style.animation = '';
            modalImg.src = item.url || '';
            modalImg.alt = item.title || '';
        }

        if (modalTitle) modalTitle.textContent = item.title || 'Untitled';
        if (modalDesc)  modalDesc.textContent  = item.desc  || 'No description available.';
        if (modalCount) modalCount.textContent = `${index + 1} / ${items.length}`;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function modalPrevSlide() {
        if (items.length === 0) return;
        openModal((modalIndex - 1 + items.length) % items.length);
    }

    function modalNextSlide() {
        if (items.length === 0) return;
        openModal((modalIndex + 1) % items.length);
    }

    modalClose?.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    modalPrev?.addEventListener('click', (e) => { e.stopPropagation(); modalPrevSlide(); });
    modalNext?.addEventListener('click', (e) => { e.stopPropagation(); modalNextSlide(); });

    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') modalPrevSlide();
        if (e.key === 'ArrowRight') modalNextSlide();
    });

    /* Touch swipe */
    let touchStartX = 0;
    modal?.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    modal?.addEventListener('touchend', (e) => {
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) < 60) return;
        delta > 0 ? modalPrevSlide() : modalNextSlide();
    }, { passive: true });

    /* ---------- Helpers ---------- */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ---------- Init ---------- */
    (async function init() {
        try {
            console.log('🖼️ Loading gallery...');
            items = await fetchSheet();
            console.log('✅ Loaded', items.length, 'items');
            renderGrid();
        } catch (err) {
            console.error('❌ Gallery error:', err);
            grid.innerHTML = `
                <div class="gallery-empty-state">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Failed to load gallery</span>
                </div>`;
        }
    })();

})();

/* ==========================================================
   🖼️ MSNS SCHOOL GALLERY — Responsive Grid (FIXED VERSION)
   Data Fetching & Parsing Logic from the Working System
   Sheet: mini-image-library | Columns: url | titel | discretion
   ========================================================== */

(function () {
    'use strict';

    /* ==========================================================
       📌 CONFIGURATION
       ========================================================== */
    const CONFIG = {
        sheetId: '1mN5jfN4P3FFevv2Aq0ygWmTzrF7-dVWfdy-8cDFa7ro',
        sheetName: 'mini-image-library',
        maxItems: 60
    };

    /* ==========================================================
       🎯 GLOBAL STATE & DOM ELEMENTS
       ========================================================== */
    let items = [];
    let modalIndex = 0;

    function initGallery() {
        // Elements
        const grid       = document.getElementById('galleryGrid');
        const loading    = document.getElementById('galleryLoading'); // Loading spinner
        const modal      = document.getElementById('galleryModal');
        const modalImg   = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalTitle');
        const modalDesc  = document.getElementById('modalDesc');
        const modalCount = document.getElementById('modalCounter');
        const modalClose = document.getElementById('modalClose');
        const modalPrev  = document.getElementById('modalPrev');
        const modalNext  = document.getElementById('modalNext');

        if (!grid) {
            console.warn('⚠️ MSNS Gallery: #galleryGrid element එක හොයාගන්න බැහැ.');
            return;
        }

        /* ==========================================================
           🎨 URL NORMALIZER (Working Logic)
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
           📥 FETCH DATA FROM GOOGLE SHEETS (Working Logic)
           ========================================================== */
        async function fetchSheetData() {
            const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.sheetName)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Sheet fetch failed: ' + response.status);
            const csv = await response.text();
            return parseCSV(csv);
        }

        /* ==========================================================
           🧩 PARSE CSV (Working Logic)
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
            
            // Header Checkers (පරණ කෝඩ් එකේ විදියටම)
            const urlIdx = headers.findIndex(h => h === 'url' || h.includes('url') || h === 'image');
            const titleIdx = headers.findIndex(h => h === 'titel' || h === 'title' || h.includes('tit') || h === 'heading');
            const descIdx = headers.findIndex(h => h.includes('discre') || h.includes('desc') || h.includes('text') || h === 'discretion');

            const data = [];
            for (let i = 1; i < rows.length && data.length < CONFIG.maxItems; i++) {
                const r = rows[i];
                const url = urlIdx !== -1 ? (r[urlIdx] || '').trim() : '';
                const title = titleIdx !== -1 ? (r[titleIdx] || '').trim() : '';
                const desc = descIdx !== -1 ? (r[descIdx] || '').trim() : '';

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

        /* ==========================================================
           🖼️ RENDER GRID 
           ========================================================== */
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
                        <img src="${escapeHTML(item.url)}" alt="${escapeHTML(item.title)}" loading="lazy">
                        <div class="gallery-card-title">${escapeHTML(item.title)}</div>
                    </div>`;
            }).join('');

            // Fallback for broken images
            grid.querySelectorAll('.gallery-card img').forEach(img => {
                img.addEventListener('error', function() {
                    const parentCard = this.parentElement;
                    parentCard.classList.add('no-image');
                    parentCard.innerHTML = '<i class="fa-regular fa-image"></i><span>No Image</span>';
                });
            });

            // Click event for Modal
            grid.querySelectorAll('.gallery-card').forEach(card => {
                card.addEventListener('click', () => {
                    if(card.classList.contains('no-image')) return; // Don't open modal if no image
                    const idx = parseInt(card.dataset.index, 10);
                    openModal(idx);
                });
            });
        }

        /* ==========================================================
           🔍 MODAL LOGIC (Lightbox)
           ========================================================== */
        function openModal(index) {
            if (!modal || index < 0 || index >= items.length) return;
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
            document.body.style.overflow = 'hidden'; // Stop background scrolling
        }

        function closeModal() {
            if (!modal) return;
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

        // Modal Event Listeners
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

        /* Touch Swipe Support */
        let touchStartX = 0;
        modal?.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
        modal?.addEventListener('touchend', (e) => {
            const delta = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(delta) < 60) return;
            delta > 0 ? modalPrevSlide() : modalNextSlide();
        }, { passive: true });

        /* ==========================================================
           🔒 UTILS
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
           🚀 SYSTEM START
           ========================================================== */
        (async function start() {
            try {
                console.log('🖼️ MSNS Grid Gallery Loading...');
                items = await fetchSheetData();
                console.log('✅ Loaded', items.length, 'items');
                
                // Remove Loading Spinner if it exists
                if (loading) loading.style.display = 'none';
                
                renderGrid();
            } catch (err) {
                console.error('❌ Gallery error:', err);
                if (loading) loading.style.display = 'none';
                if (grid) {
                    grid.innerHTML = `
                        <div class="gallery-empty-state">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>Failed to load gallery. Please check your connection.</span>
                        </div>`;
                }
            }
        })();
    }

    // Bulletproof Initialization (Fixes the infinite loading issue)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGallery);
    } else {
        initGallery();
    }

})();

/* ==========================================================
   🎡 MSNS SCHOOL GALLERY — 3D Image Ring
   Sheet: mini-image-library
   Columns: url | titel | discretion
   ========================================================== */

(function () {
    'use strict';

    /* ==========================================================
       📌 CONFIG
       ========================================================== */
    const CONFIG = {
        sheetId: '1mN5jfN4P3FFevv2Aq0ygWmTzrF7-dVWfdy-8cDFa7ro',
        sheetName: 'mini-image-library',
        maxItems: 12,
        autoRotateSpeed: 30      // seconds per full rotation
    };

    /* ==========================================================
       📌 DOM
       ========================================================== */
    const ring       = document.getElementById('galleryRing');
    const stage      = document.getElementById('galleryStage');
    const loading    = document.getElementById('galleryLoading');

    const prevBtn    = document.getElementById('galleryPrev');
    const nextBtn    = document.getElementById('galleryNext');

    const modal      = document.getElementById('galleryModal');
    const modalImg   = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc  = document.getElementById('modalDesc');
    const modalCount = document.getElementById('modalCounter');
    const modalClose = document.getElementById('modalClose');
    const modalPrev  = document.getElementById('modalPrev');
    const modalNext  = document.getElementById('modalNext');

    if (!ring) return;

    /* ==========================================================
       🎯 STATE
       ========================================================== */
    let items = [];
    let radius = 500;
    let currentAngle = 0;
    let manualRotation = false;
    let rotationTimer = null;
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
       📥 FETCH SHEET
       ========================================================== */
    async function fetchSheet() {
        const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.sheetName)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Sheet fetch failed');
        const csv = await res.text();
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

    /* ==========================================================
       📐 CALCULATE RADIUS
       ========================================================== */
    function calcRadius() {
        const isMobile = window.innerWidth <= 767;
        const itemW = isMobile ? 140 : 220;
        const n = items.length || 1;
        
        // Ideal radius for edge-to-edge: w / (2*tan(π/n))
        const idealR = itemW / (2 * Math.tan(Math.PI / n));
        // Add spacing factor 1.25, minimum radius
        const minR = isMobile ? 320 : 480;
        
        radius = Math.max(minR, idealR * 1.25);
        return radius;
    }

    /* ==========================================================
       🎡 BUILD THE RING
       ========================================================== */
    function buildRing() {
        if (items.length === 0) {
            ring.innerHTML = `
                <div style="
                    position:absolute; left:-150px; top:-30px; width:300px;
                    text-align:center; color:#94a3b8;
                    font-family:'Plus Jakarta Sans', sans-serif;
                    display:flex; flex-direction:column; align-items:center; gap:14px;
                ">
                    <i class="fa-regular fa-images" style="font-size:2.5rem; color:#f59e0b; opacity:0.6;"></i>
                    <span style="font-weight:600; font-size:0.9rem;">No images available</span>
                </div>
            `;
            return;
        }

        calcRadius();

        const n = items.length;
        const angleStep = 360 / n;

        let html = '';

        items.forEach((item, i) => {
            const angle = i * angleStep;
            const transform = `rotateY(${angle}deg) translateZ(${radius}px)`;

            if (!item.hasImage) {
                html += `
                    <div class="gallery-item no-image"
                         data-index="${i}"
                         style="transform: ${transform};">
                        <i class="fa-regular fa-image"></i>
                        <span>No Image</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="gallery-item"
                         data-index="${i}"
                         style="transform: ${transform};">
                        <img src="${escapeHtml(item.url)}" 
                             alt="${escapeHtml(item.title)}"
                             loading="lazy"
                             onerror="this.closest('.gallery-item').classList.add('no-image'); this.closest('.gallery-item').innerHTML='<i class=&quot;fa-regular fa-image&quot;></i><span>No Image</span>';">
                    </div>
                `;
            }
        });

        ring.innerHTML = html;

        // Pause auto rotate on hover
        ring.addEventListener('mouseenter', () => ring.classList.add('paused'));
        ring.addEventListener('mouseleave', () => ring.classList.remove('paused'));

        // Click image → open modal
        ring.querySelectorAll('.gallery-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.index, 10);
                openModal(idx);
            });
        });
    }

    /* ==========================================================
       🔄 MANUAL ROTATION (Prev / Next)
       ========================================================== */
    function rotateBy(deg) {
        manualRotation = true;
        ring.classList.add('paused');

        currentAngle += deg;

        // Apply rotation to the ring (in addition to the animation)
        // Easier: set transform directly, disable animation
        const n = items.length;
        if (n === 0) return;

        ring.style.animation = 'none';
        ring.style.transform = `rotateY(${currentAngle}deg)`;

        // Re-enable auto-rotate after pause
        clearTimeout(rotationTimer);
        rotationTimer = setTimeout(() => {
            resumeRotation();
        }, 4000);
    }

    function resumeRotation() {
        manualRotation = false;
        // Restart animation from current angle
        const n = items.length;
        if (n === 0) return;

        // Normalize currentAngle to 0-360
        const normalized = ((currentAngle % 360) + 360) % 360;
        const duration = (CONFIG.autoRotateSpeed * (360 - normalized)) / 360;

        ring.style.animation = 'none';
        ring.style.transform = `rotateY(${normalized}deg)`;
        ring.classList.remove('paused');

        // Force reflow
        void ring.offsetWidth;

        ring.style.animation = `ringRotate ${duration}s linear 1 forwards, ringRotate ${CONFIG.autoRotateSpeed}s linear ${duration}s infinite`;
    }

    prevBtn?.addEventListener('click', () => rotateBy(36));
    nextBtn?.addEventListener('click', () => rotateBy(-36));

    /* ==========================================================
       🖼️ MODAL
       ========================================================== */
    function openModal(index) {
        if (index < 0 || index >= items.length) return;
        modalIndex = index;

        const item = items[index];

        // Reset animation
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

        // Pause ring
        ring.classList.add('paused');

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        ring.classList.remove('paused');
        // Resume auto-rotate
        if (!manualRotation) resumeRotation();
    }

    function modalPrevSlide() {
        const newIdx = (modalIndex - 1 + items.length) % items.length;
        openModal(newIdx);
    }

    function modalNextSlide() {
        const newIdx = (modalIndex + 1) % items.length;
        openModal(newIdx);
    }

    modalClose?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });

    modal?.addEventListener('click', (e) => {
        // Close only if clicked on backdrop
        if (e.target === modal) closeModal();
    });

    modalPrev?.addEventListener('click', (e) => {
        e.stopPropagation();
        modalPrevSlide();
    });

    modalNext?.addEventListener('click', (e) => {
        e.stopPropagation();
        modalNextSlide();
    });

    // ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
        if (modal.classList.contains('active')) {
            if (e.key === 'ArrowLeft')  modalPrevSlide();
            if (e.key === 'ArrowRight') modalNextSlide();
        }
    });

    // Touch swipe on modal
    let touchStartX = 0;
    modal?.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    modal?.addEventListener('touchend', (e) => {
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) < 60) return;
        if (delta > 0) modalPrevSlide();
        else modalNextSlide();
    }, { passive: true });

    /* ==========================================================
       🔒 HELPERS
       ========================================================== */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ==========================================================
       🔁 RESIZE HANDLING
       ========================================================== */
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            buildRing();
        }, 200);
    });

    /* ==========================================================
       🚀 INIT
       ========================================================== */
    (async function init() {
        try {
            console.log('🎡 Loading gallery from sheet...');
            items = await fetchSheet();
            console.log('✅ Loaded', items.length, 'items');

            if (loading) loading.remove();
            buildRing();

        } catch (err) {
            console.error('❌ Gallery error:', err);
            ring.innerHTML = `
                <div style="
                    position:absolute; left:-160px; top:-30px; width:320px;
                    text-align:center; color:#ef4444;
                    font-family:'Plus Jakarta Sans', sans-serif;
                    display:flex; flex-direction:column; align-items:center; gap:14px;
                ">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem;"></i>
                    <span style="font-weight:600; font-size:0.9rem;">Failed to load gallery</span>
                    <span style="font-size:0.75rem; color:#94a3b8;">Check your internet connection</span>
                </div>
            `;
        }
    })();

})();

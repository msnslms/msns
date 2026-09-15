/* ==========================================================
   🖼️ SCHOOL GALLERY — 3D Image Ring + Mobile Swipe
   ========================================================== */

document.addEventListener("DOMContentLoaded", function () {

    /* ============================================================
       📸 GALLERY DATA — ඔබේ image paths මෙතන දාන්න
       ============================================================ */
    const galleryData = [
        { src: "images/gallery1.jpg", title: "Annual Sports Meet",     desc: "A day of athletic excellence and team spirit at MSNS grounds." },
        { src: "images/gallery2.jpg", title: "Cultural Day",           desc: "Celebrating our rich heritage and traditions together." },
        { src: "images/gallery3.jpg", title: "Science Exhibition",     desc: "Young innovators showcasing their creative projects." },
        { src: "images/gallery4.jpg", title: "Prize Giving Ceremony",  desc: "Honoring academic achievements of our students." },
        { src: "images/gallery5.jpg", title: "Annual Concert",         desc: "Musical performances by our talented students." },
        { src: "images/gallery6.jpg", title: "Cricket Tournament",     desc: "Our team in action on the field — champions!" },
        { src: "images/gallery7.jpg", title: "Art Exhibition",         desc: "Creative works from our art department." },
        { src: "images/gallery8.jpg", title: "Graduation Day",         desc: "Celebrating our graduating class of excellence." }
    ];
    /* ============================================================ */

    // DOM refs
    const ring         = document.getElementById('galleryRing');
    const stage        = document.getElementById('galleryStage');
    const modal        = document.getElementById('galleryModal');
    const modalImage   = document.getElementById('modalImage');
    const modalTitle   = document.getElementById('modalTitle');
    const modalDesc    = document.getElementById('modalDesc');
    const modalCounter = document.getElementById('modalCounter');
    const modalClose   = document.getElementById('modalClose');
    const modalPrev    = document.getElementById('modalPrev');
    const modalNext    = document.getElementById('modalNext');
    const navPrev      = document.getElementById('galleryPrev');
    const navNext      = document.getElementById('galleryNext');

    // State
    const items         = [];
    const N             = galleryData.length;
    let currentIndex    = 0;
    let modalIndex      = 0;
    let autoSlideTimer  = null;
    let isUserSwiping   = false;
    let currentRotation = 0;
    let autoRotate      = true;
    let lastTimestamp   = 0;
    let rafId           = null;

    const isMobile = () => window.matchMedia('(max-width: 767.98px)').matches;

    /* ============================================================
       🏗️ BUILD GALLERY ITEMS
       ============================================================ */
    function buildItems() {
        ring.innerHTML = '';
        items.length = 0;

        galleryData.forEach((data, i) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.dataset.index = i;

            const img = document.createElement('img');
            img.src = data.src;
            img.alt = data.title;
            img.loading = 'lazy';
            img.draggable = false;

            // Fallback if image missing
            img.onerror = function () {
                item.classList.add('no-image');
                item.innerHTML = '<i class="fa-solid fa-image"></i><span>Image ' + (i + 1) + '</span>';
            };

            item.appendChild(img);
            item.addEventListener('click', () => openModal(i));

            ring.appendChild(item);
            items.push(item);
        });
    }

    /* ============================================================
       🎡 LAYOUT 3D RING (Desktop only)
       ============================================================ */
    function layoutRing() {
        items.forEach(it => { it.style.transform = ''; });
        ring.style.transform = '';

        if (isMobile() || N === 0) {
            ring.style.animation = 'none';
            return;
        }

        ring.style.animation = 'none';

        const angleStep = 360 / N;
        const radius = Math.max(430, N * 58);

        items.forEach((item, i) => {
            const angle = angleStep * i;
            item.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
        });

        applyRingRotation();
    }

    function applyRingRotation() {
        if (isMobile()) return;
        ring.style.transform = `rotateY(${currentRotation}deg)`;
    }

    /* ============================================================
       🔄 AUTO ROTATE (Desktop)
       ============================================================ */
    function animateRing(ts) {
        if (!lastTimestamp) lastTimestamp = ts;
        const delta = ts - lastTimestamp;
        lastTimestamp = ts;

        if (autoRotate && !isMobile() && !modal.classList.contains('active')) {
            currentRotation += delta * 0.018; // ≈ 6.5°/sec
            applyRingRotation();
        }
        rafId = requestAnimationFrame(animateRing);
    }

    /* ============================================================
       ⬅️➡️ NAV ARROWS (Desktop) — snap to next item
       ============================================================ */
    function snapToIndex(index) {
        if (N === 0) return;
        const angleStep = 360 / N;
        currentRotation = -angleStep * index;
        applyRingRotation();
    }

    if (navPrev) {
        navPrev.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + N) % N;
            snapToIndex(currentIndex);
        });
    }
    if (navNext) {
        navNext.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % N;
            snapToIndex(currentIndex);
        });
    }

    // Pause auto-rotate while hovering
    if (stage) {
        stage.addEventListener('mouseenter', () => { autoRotate = false; });
        stage.addEventListener('mouseleave', () => { autoRotate = true; });
    }

    /* ============================================================
       📱 MOBILE AUTO-SLIDE
       ============================================================ */
    function scrollToItem(index) {
        const item = items[index];
        if (!item || !stage) return;
        const targetLeft = item.offsetLeft - (stage.clientWidth / 2) + (item.offsetWidth / 2);
        stage.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }

    function startAutoSlide() {
        stopAutoSlide();
        if (!isMobile() || N === 0) return;

        autoSlideTimer = setInterval(() => {
            if (isUserSwiping || modal.classList.contains('active')) return;
            currentIndex = (currentIndex + 1) % N;
            scrollToItem(currentIndex);
        }, 3000);
    }

    function stopAutoSlide() {
        if (autoSlideTimer) {
            clearInterval(autoSlideTimer);
            autoSlideTimer = null;
        }
    }

    if (stage) {
        stage.addEventListener('touchstart', () => {
            isUserSwiping = true;
            stopAutoSlide();
        }, { passive: true });

        stage.addEventListener('touchend', () => {
            isUserSwiping = false;

            const scrollCenter = stage.scrollLeft + stage.clientWidth / 2;
            let minDistance = Infinity;
            items.forEach((item, index) => {
                const itemCenter = item.offsetLeft + item.offsetWidth / 2;
                const distance = Math.abs(itemCenter - scrollCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    currentIndex = index;
                }
            });

            setTimeout(startAutoSlide, 3000);
        }, { passive: true });
    }

    /* ============================================================
       🖼️ MODAL
       ============================================================ */
    function openModal(index) {
        modalIndex = index;
        updateModal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateModal() {
        const data = galleryData[modalIndex];
        if (!data) return;

        // Re-trigger entry animation
        modalImage.style.animation = 'none';
        modalImage.src = data.src;
        modalImage.alt = data.title;
        void modalImage.offsetWidth;
        modalImage.style.animation = '';

        modalTitle.textContent   = data.title;
        modalDesc.textContent    = data.desc;
        modalCounter.textContent = (modalIndex + 1) + ' / ' + N;
    }

    function modalNavigate(dir) {
        modalIndex = (modalIndex + dir + N) % N;
        updateModal();
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalPrev)  modalPrev.addEventListener('click', (e) => { e.stopPropagation(); modalNavigate(-1); });
    if (modalNext)  modalNext.addEventListener('click', (e) => { e.stopPropagation(); modalNavigate(1); });

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'Escape')      closeModal();
        if (e.key === 'ArrowLeft')   modalNavigate(-1);
        if (e.key === 'ArrowRight')  modalNavigate(1);
    });

    /* ============================================================
       🔄 RESIZE HANDLER
       ============================================================ */
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            stopAutoSlide();
            layoutRing();

            if (isMobile()) {
                currentIndex = 0;
                scrollToItem(0);
                startAutoSlide();
            } else {
                if (!rafId) rafId = requestAnimationFrame(animateRing);
            }
        }, 200);
    });

    /* ============================================================
       🚀 INIT
       ============================================================ */
    buildItems();
    layoutRing();

    if (isMobile()) {
        setTimeout(() => {
            scrollToItem(0);
            startAutoSlide();
        }, 100);
    } else {
        rafId = requestAnimationFrame(animateRing);
    }

});

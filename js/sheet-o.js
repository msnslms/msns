/* ==========================================================
   📊 FULL-SCREEN SHEET FOLDER MODAL (UPDATED)
   Google Drive Folder Embed
   ========================================================== */

(function () {
    'use strict';

    /* ==========================================================
       📌 CONFIG
       ========================================================== */
    const CONFIG = {
        folderId: '1SrM4SxX4XkDtW8GHgTfKEDULDNqth4vn',
        // Google Drive embedded folder view (grid layout)
        folderUrl: 'https://drive.google.com/embeddedfolderview?id=1SrM4SxX4XkDtW8GHgTfKEDULDNqth4vn#grid',
        // Direct link for fallback (If iframe fails)
        directUrl: 'https://drive.google.com/drive/folders/1SrM4SxX4XkDtW8GHgTfKEDULDNqth4vn',
        title: 'Term Test Results'
    };

    /* ==========================================================
       📌 DOM
       ========================================================== */
    const modal        = document.getElementById('sheetModal');
    const backdrop     = document.getElementById('sheetModalBackdrop');
    const iframe       = document.getElementById('sheetModalIframe');
    const btnOpen      = document.getElementById('termSheetBtn');
    const btnBack      = document.getElementById('sheetModalBack');
    const btnClose     = document.getElementById('sheetModalClose');

    // ඔයාගේ HTML එකේ මේ ID එකත් තියෙනවා නම් විතරක් වැඩ කරයි (Loading Spinner එකක් සඳහා)
    const spinner      = document.getElementById('sheetLoadingSpinner');

    if (!modal || !iframe) return;

    /* ==========================================================
       🎯 STATE
       ========================================================== */
    let isOpen = false;
    let previousScrollY = 0;

    /* ==========================================================
       🎬 OPEN MODAL
       ========================================================== */
    function openModal() {
        if (isOpen) return;
        isOpen = true;

        // Save scroll position
        previousScrollY = window.scrollY || window.pageYOffset || 0;

        // Show loading spinner (if exists)
        if (spinner) spinner.style.display = 'block';

        // iframe එක ලෝඩ් වෙනකොට ස්පිනර් එක හයිඩ් කරන්න
        iframe.onload = function() {
            if (spinner) spinner.style.display = 'none';
        };

        // Load folder in iframe
        // මෙතන #grid කෝඩ් එක තියෙන්න ඕනේ හරියට grid view එකට එන්න
        iframe.src = CONFIG.folderUrl;

        // Show modal
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

        // Lock body scroll (with scroll position preserved)
        document.body.style.position = 'fixed';
        document.body.style.top = `-${previousScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';

        console.log('📊 Sheet folder modal opened');
    }

    /* ==========================================================
       ❌ CLOSE MODAL
       ========================================================== */
    function closeModal() {
        if (!isOpen) return;
        isOpen = false;

        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');

        // Restore body scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';

        // Restore scroll position
        window.scrollTo(0, previousScrollY);

        // Reset iframe after animation (මෙකෙන් බැක්ග්‍රවුන්ඩ් ලෝඩින් නවත්තනවා)
        setTimeout(() => {
            if (iframe) iframe.src = 'about:blank';
            if (spinner) spinner.style.display = 'none';
        }, 400);

        console.log('📊 Sheet folder modal closed');
    }

    /* ==========================================================
       ⬅️ BACK BUTTON — Return to folder view
       ========================================================== */
    function goBackToFolder() {
        if (!iframe) return;

        if (spinner) spinner.style.display = 'block';

        // Reload folder embed (this "resets" the view to folder listing)
        iframe.src = 'about:blank';
        setTimeout(() => {
            iframe.src = CONFIG.folderUrl;
        }, 100);

        console.log('⬅️ Reset to folder view');
    }

    /* ==========================================================
       🎧 EVENT LISTENERS
       ========================================================== */
    btnOpen?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });

    btnClose?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });

    btnBack?.addEventListener('click', (e) => {
        e.stopPropagation();
        goBackToFolder();
    });

    backdrop?.addEventListener('click', closeModal);

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closeModal();
        }
    });

    // Prevent clicks inside window from bubbling to backdrop
    const windowEl = modal.querySelector('.sheet-modal-window');
    windowEl?.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    console.log('📊 Sheet modal ready — Folder ID:', CONFIG.folderId);
})();

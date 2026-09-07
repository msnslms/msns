/* ============================================
   MSNS AI - PDF Export Logic
   ============================================ */

(function () {
    'use strict';

    // ---------- A4 Constants ----------
    const A4_WIDTH = 794;
    const A4_HEIGHT = 1123;
    const A4_MARGIN = 64;
    const CONTENT_WIDTH = A4_WIDTH - (A4_MARGIN * 2);
    const CONTENT_HEIGHT = A4_HEIGHT - (A4_MARGIN * 2);

    // ---------- State ----------
    let fontSize = 16; // px (12pt ≈ 16px)
    let fontFamily = "'FMAbhaya', 'Abhaya Libre', 'Noto Sans Sinhala', serif";
    let textAlign = 'left';
    let textColor = '#000000';
    let lineHeight = 1.8;
    let totalPages = 0;

    // ---------- DOM Elements ----------
    const pagesContainer = document.getElementById('pagesContainer');
    const pagesWrapper = document.getElementById('pagesWrapper');
    const pdfPreviewArea = document.getElementById('pdfPreviewArea');
    const pdfEmptyState = document.getElementById('pdfEmptyState');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    const textColorPicker = document.getElementById('textColorPicker');
    const lineSpacingSelect = document.getElementById('lineSpacing');

    // ---------- Load Content ----------
    const pdfData = JSON.parse(localStorage.getItem('msns_pdf_data') || '{}');
    let contentHTML = pdfData.content || '';

    if (!contentHTML || contentHTML.trim() === '') {
        // Show empty state
        if (pdfEmptyState) pdfEmptyState.style.display = 'flex';
        if (pdfPreviewArea) pdfPreviewArea.style.display = 'none';
        if (document.querySelector('.pdf-topbar')) document.querySelector('.pdf-topbar').style.display = 'none';
        if (document.querySelector('.pdf-toolbar')) document.querySelector('.pdf-toolbar').style.display = 'none';
        return;
    }

    // ---------- Clean Content for PDF ----------
    function cleanContentForPDF(html) {
        let cleaned = html;

        // Replace YouTube iframes with links
        cleaned = cleaned.replace(
            /<iframe[^>]*youtube\.com\/embed\/([a-zA-Z0-9_-]+)[^>]*><\/iframe>/gi,
            '<p>🎬 Video: <a href="https://youtu.be/$1" target="_blank">https://youtu.be/$1</a></p>'
        );

        // Replace Google Drive iframes with links
        cleaned = cleaned.replace(
            /<iframe[^>]*drive\.google\.com[^>]*><\/iframe>/gi,
            '<p>📄 Document: <a href="https://drive.google.com" target="_blank">Open Document Link</a></p>'
        );

        // Remove any remaining iframes
        cleaned = cleaned.replace(/<iframe[^>]*><\/iframe>/gi, '');

        // Remove video container divs
        cleaned = cleaned.replace(/<div class="video-container">.*?<\/div>/gi, '');

        // Remove pdf-container divs (keep the link)
        cleaned = cleaned.replace(/<div class="pdf-container">.*?<\/div>/gi, '');

        return cleaned;
    }

    contentHTML = cleanContentForPDF(contentHTML);

    // ---------- Parse HTML into Blocks ----------
    function parseBlocks(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return Array.from(doc.body.children);
    }

    // ---------- Measure Block Height ----------
    function measureBlock(block) {
        const measure = document.createElement('div');
        measure.style.cssText = `
            position: absolute;
            visibility: hidden;
            width: ${CONTENT_WIDTH}px;
            font-family: ${fontFamily};
            font-size: ${fontSize}px;
            line-height: ${lineHeight};
            text-align: ${textAlign};
            color: ${textColor};
            word-wrap: break-word;
            overflow-wrap: break-word;
        `;
        measure.appendChild(block.cloneNode(true));
        document.body.appendChild(measure);
        const height = measure.offsetHeight;
        document.body.removeChild(measure);
        return height;
    }

    // ---------- Split Blocks into Pages ----------
    function paginateContent(blocks) {
        const pages = [];
        let currentPageBlocks = [];
        let currentHeight = 0;

        for (const block of blocks) {
            const blockHeight = measureBlock(block);

            // If block is taller than a page, we'll still add it (it will overflow)
            if (currentHeight + blockHeight > CONTENT_HEIGHT && currentPageBlocks.length > 0) {
                pages.push(currentPageBlocks);
                currentPageBlocks = [];
                currentHeight = 0;
            }

            currentPageBlocks.push(block);
            currentHeight += blockHeight;
        }

        if (currentPageBlocks.length > 0) {
            pages.push(currentPageBlocks);
        }

        return pages;
    }

    // ---------- Render All Pages ----------
    function renderPages() {
        const blocks = parseBlocks(contentHTML);
        const pages = paginateContent(blocks);
        totalPages = pages.length;

        if (!pagesContainer) return;
        pagesContainer.innerHTML = '';

        pages.forEach((pageBlocks, index) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'a4-page';
            pageDiv.style.cssText = `
                width: ${A4_WIDTH}px;
                min-height: ${A4_HEIGHT}px;
                padding: ${A4_MARGIN}px;
            `;

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'page-content';
            contentWrapper.style.cssText = `
                font-family: ${fontFamily};
                font-size: ${fontSize}px;
                line-height: ${lineHeight};
                text-align: ${textAlign};
                color: ${textColor};
            `;

            pageBlocks.forEach(block => {
                contentWrapper.appendChild(block.cloneNode(true));
            });
            pageDiv.appendChild(contentWrapper);

            // Page number
            const pageNumberDiv = document.createElement('div');
            pageNumberDiv.className = 'page-number';
            pageNumberDiv.innerText = `Page ${index + 1} of ${totalPages} — MSNS AI`;
            pageDiv.appendChild(pageNumberDiv);

            pagesContainer.appendChild(pageDiv);
        });

        // Render KaTeX in pages
        if (window.renderMathInElement) {
            pagesContainer.querySelectorAll('.page-content').forEach(el => {
                try {
                    renderMathInElement(el, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false},
                            {left: '\\(', right: '\\)', display: false},
                            {left: '\\[', right: '\\[', display: true}
                        ],
                        throwOnError: false
                    });
                } catch (err) {
                    console.error('KaTeX Error in PDF:', err);
                }
            });
        }

        handleResize();
    }

    // ---------- Responsive Scaling ----------
    function handleResize() {
        if (!pagesContainer || !pdfPreviewArea) return;

        const availableWidth = pdfPreviewArea.clientWidth - 40;
        const scale = Math.min(1, availableWidth / A4_WIDTH);

        pagesWrapper.style.transform = `scale(${scale})`;
        pagesWrapper.style.transformOrigin = 'top center';

        // Adjust wrapper height to compensate for scale
        const naturalHeight = Array.from(pagesContainer.children).reduce(
            (sum, page) => sum + page.offsetHeight + 20, 0
        );
        pagesWrapper.style.height = `${naturalHeight * scale}px`;
        pagesWrapper.style.width = `${A4_WIDTH}px`;
        pagesWrapper.style.margin = '0 auto';
    }

    // ---------- Update All Page Styles ----------
    function updatePageStyles() {
        const pageContents = document.querySelectorAll('.a4-page .page-content');
        pageContents.forEach(el => {
            el.style.fontFamily = fontFamily;
            el.style.fontSize = `${fontSize}px`;
            el.style.lineHeight = lineHeight;
            el.style.textAlign = textAlign;
            el.style.color = textColor;
        });

        const pageNumbers = document.querySelectorAll('.a4-page .page-number');
        pageNumbers.forEach(el => {
            el.innerText = el.innerText.replace(/Page \d+ of \d+/, `Page ${el.innerText.match(/Page \d+/)[0].replace('Page ', '')} of ${totalPages}`);
        });
    }

    // ---------- Debounce ----------
    function debounce(fn, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    // ---------- Event Listeners ----------
    // Font Size
    document.getElementById('fontSizeMinus')?.addEventListener('click', () => {
        if (fontSize > 8) {
            fontSize -= 1;
            fontSizeDisplay.innerText = `${Math.round(fontSize * 0.75)}pt`;
            updatePageStyles();
            handleResize();
        }
    });

    document.getElementById('fontSizePlus')?.addEventListener('click', () => {
        if (fontSize < 32) {
            fontSize += 1;
            fontSizeDisplay.innerText = `${Math.round(fontSize * 0.75)}pt`;
            updatePageStyles();
            handleResize();
        }
    });

    // Alignment
    document.querySelectorAll('.align-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            textAlign = btn.dataset.align;
            updatePageStyles();
        });
    });

    // Text Color
    textColorPicker?.addEventListener('input', debounce((e) => {
        textColor = e.target.value;
        updatePageStyles();
    }, 100));

    // Line Spacing
    lineSpacingSelect?.addEventListener('change', (e) => {
        lineHeight = parseFloat(e.target.value);
        updatePageStyles();
        handleResize();
    });

    // Save PDF Button
    document.getElementById('savePdfBtn')?.addEventListener('click', () => {
        window.print();
    });

    // Window Resize
    window.addEventListener('resize', debounce(handleResize, 200));
    window.visualViewport?.addEventListener('resize', debounce(handleResize, 200));

    // ---------- Initial Render ----------
    fontSizeDisplay.innerText = `${Math.round(fontSize * 0.75)}pt`;
    renderPages();
})();

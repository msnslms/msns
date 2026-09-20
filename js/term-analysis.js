/* ==========================================================
   MSNS Term Test Papers - Main Logic & Event Handling
   ========================================================== */
(function() {
    'use strict';

    // Google Sheet Configuration
    const SHEET_ID = '1u6fKlgiG9p1e9WsyRIwaM-w-OnNveBGIg0_kjC50Z6M';
    const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

    // State Variables
    let allData = [];
    let zipData = [];
    let currentYear = '';
    let currentTerm = '';
    let currentGrade = 'All'; 

    // DOM Elements
    const yearSelect = document.getElementById('yearSelect');
    const termSelect = document.getElementById('termSelect');
    const gradePillsEl = document.getElementById('gradePills');
    const paperListEl = document.getElementById('paperList');
    const dynamicTitle = document.getElementById('dynamicTitle');
    const previewOverlay = document.getElementById('previewOverlay');
    const previewIframe = document.getElementById('previewIframe');
    const previewClose = document.getElementById('previewClose');
    const zipContainer = document.getElementById('zipContainer');
    const downloadZipBtn = document.getElementById('downloadZipBtn');

    // ==========================================================
    // Disclaimer Modal Logic
    // ==========================================================
    function initDisclaimer() {
        const disclaimerOverlay = document.getElementById('disclaimerOverlay');
        const agreeBtn = document.getElementById('agreeBtn');
        const disagreeBtn = document.getElementById('disagreeBtn');

        if (!disclaimerOverlay) return;

        disclaimerOverlay.classList.add('active');
        disclaimerOverlay.style.display = 'flex';

        if (agreeBtn) {
            agreeBtn.addEventListener('click', () => {
                disclaimerOverlay.classList.remove('active');
                setTimeout(() => { disclaimerOverlay.style.display = 'none'; }, 300);
            });
        }

        if (disagreeBtn) {
            disagreeBtn.addEventListener('click', () => {
                window.location.href = 'index.html'; 
            });
        }
    }

    // ==========================================================
    // Helper Functions
    // ==========================================================
    function parseCSV(text) {
        let lines = [];
        let row = [];
        let inQuotes = false;
        let currentStr = '';

        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            let nextChar = text[i+1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentStr += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(currentStr.trim());
                currentStr = '';
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') { i++; }
                row.push(currentStr.trim());
                if (row.length > 0 && row.some(cell => cell !== '')) {
                    lines.push(row);
                }
                row = [];
                currentStr = '';
            } else {
                currentStr += char;
            }
        }
        if (currentStr || row.length > 0) {
            row.push(currentStr.trim());
            lines.push(row);
        }
        return lines;
    }

    function extractDriveId(url) {
        if (!url) return null;
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function goToNextStep(elementId) {
        const targetElement = document.getElementById(elementId);
        if (targetElement) {
            setTimeout(() => {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    // ==========================================================
    // Data Fetching & Processing
    // ==========================================================
    async function fetchData() {
        try {
            const response = await fetch(SHEET_CSV_URL);
            const csvText = await response.text();
            const rows = parseCSV(csvText);

            if (rows.length < 2) {
                throw new Error("No data found in sheet.");
            }

            allData = [];
            zipData = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 5) continue;

                const type = (row[0] || '').toLowerCase();
                const url = row[1] || '';
                const classStr = row[2] || '';
                const year = row[3] || '';
                const term = row[4] || '';

                if (!url) continue;

                if (type === 'zip') {
                    zipData.push({ url, classStr, year, term });
                    continue;
                }

                if (type !== 'sheet') continue;

                let grade = '';
                let section = '';
                const classMatch = classStr.match(/^(\d+)([A-Za-z]+)$/);
                if (classMatch) {
                    grade = classMatch[1];
                    section = classMatch[2].toUpperCase();
                } else {
                    grade = classStr;
                }

                allData.push({ type, url, classStr, year, term, grade, section });
            }

            initFilters();
        } catch (error) {
            console.error("Error fetching data:", error);
            if (paperListEl) {
                paperListEl.innerHTML = `<div class="no-docs-card">Failed to load data. Please check the Google Sheet.</div>`;
            }
        }
    }

    // ==========================================================
    // UI Initialization
    // ==========================================================
    function initFilters() {
        const years = [...new Set(allData.map(item => item.year))].filter(y => y).sort((a, b) => b - a);
        
        if (yearSelect) {
            yearSelect.innerHTML = '<option value="">Select Year</option>';
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });

            if (years.length > 0) {
                yearSelect.value = years[0];
                currentYear = years[0];
                populateTerms(years[0]);
            }
        }

        renderGrades();
    }

    function populateTerms(year) {
        const terms = [...new Set(allData.filter(item => item.year === year).map(item => item.term))].filter(t => t).sort();
        
        if (termSelect) {
            termSelect.innerHTML = '<option value="">Select Term</option>';
            terms.forEach(term => {
                const option = document.createElement('option');
                option.value = term;
                option.textContent = term;
                termSelect.appendChild(option);
            });

            if (terms.length > 0) {
                termSelect.value = terms[0];
                currentTerm = terms[0];
            } else {
                currentTerm = '';
            }
        }
        
        renderPapers();
    }

    function renderGrades() {
        if (!gradePillsEl) return;
        const grades = ['6', '7', '8', '9', '10', '11', '12', '13', 'All'];
        let html = '';
        
        grades.forEach(g => {
            const displayGrade = g === 'All' ? 'All' : `Grade ${g}`;
            const active = g === currentGrade ? 'active' : '';
            html += `<div class="grade-pill ${active}" data-grade="${g}">${displayGrade}</div>`;
        });

        gradePillsEl.innerHTML = html;

        document.querySelectorAll('.grade-pill').forEach(el => {
            el.addEventListener('click', function() {
                currentGrade = this.dataset.grade;
                renderGrades();
                renderPapers();
                goToNextStep('paperList');
            });
        });

        const activePill = gradePillsEl.querySelector('.grade-pill.active');
        if (activePill) {
            activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    // ==========================================================
    // Rendering Papers & ZIP Download
    // ==========================================================
    function renderPapers() {
        if (!paperListEl) return;

        if (!currentYear || !currentTerm) {
            paperListEl.innerHTML = `<div class="no-docs-card">Please select a Year and Term.</div>`;
            if (dynamicTitle) dynamicTitle.innerHTML = `<span>Select filters to view papers</span>`;
            if (zipContainer) zipContainer.style.display = 'none';
            return;
        }

        const matchingZipRecord = zipData.find(z => z.year === currentYear && z.term === currentTerm);
        
        if (matchingZipRecord && zipContainer && downloadZipBtn) {
            zipContainer.style.display = 'block';
            downloadZipBtn.onclick = function() {
                const fileId = extractDriveId(matchingZipRecord.url);
                const downloadUrl = fileId 
                    ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download` 
                    : matchingZipRecord.url;
                window.open(downloadUrl, '_blank');
            };
        } else if (zipContainer) {
            zipContainer.style.display = 'none';
        }

        let filteredData = allData.filter(item => {
            const matchYear = item.year === currentYear;
            const matchTerm = item.term === currentTerm;
            const matchGrade = currentGrade === 'All' || item.grade === currentGrade;
            return matchYear && matchTerm && matchGrade;
        });

        const gradeText = currentGrade === 'All' ? 'All Grades' : `Grade ${currentGrade}`;
        if (dynamicTitle) {
            dynamicTitle.innerHTML = `<span>${currentYear} - ${currentTerm} Term Test - ${gradeText}</span>`;
        }

        if (filteredData.length === 0) {
            paperListEl.innerHTML = `
                <div class="no-docs-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <div>No papers found for this selection.</div>
                </div>
            `;
            return;
        }

        let html = '';
        filteredData.forEach(item => {
            const fileId = extractDriveId(item.url);
            const downloadUrl = fileId 
                ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download` 
                : item.url;
            const previewUrl = fileId 
                ? `https://drive.google.com/file/d/${fileId}/preview` 
                : item.url;

            html += `
                <div class="subject-card">
                    <div class="subject-header">
                        <svg class="subject-icon-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <span class="subject-title">${escapeHtml(item.classStr)} - ${escapeHtml(item.year)} ${escapeHtml(item.term)} Term</span>
                    </div>
                    <div class="subject-actions">
                        <button class="action-btn btn-preview" onclick="openPdfPreview('${previewUrl}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            Preview
                        </button>
                        <a href="${downloadUrl}" class="action-btn btn-download" download target="_blank">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download
                        </a>
                    </div>
                </div>
            `;
        });

        paperListEl.innerHTML = html;
    }

    // ==========================================================
    // Preview Modal Logic
    // ==========================================================
    window.openPdfPreview = function(url) {
        if (!url || url === '#') {
            alert('Preview URL is not available.');
            return;
        }
        if (previewIframe && previewOverlay) {
            previewIframe.src = url;
            previewOverlay.classList.add('active');
        }
    };

    function closePreview() {
        if (previewOverlay && previewIframe) {
            previewOverlay.classList.remove('active');
            previewIframe.src = 'about:blank';
        }
    }

    if (previewClose) previewClose.addEventListener('click', closePreview);
    if (previewOverlay) {
        previewOverlay.addEventListener('click', (e) => {
            if (e.target === previewOverlay) closePreview();
        });
    }

    // Select Event Listeners
    if (yearSelect) {
        yearSelect.addEventListener('change', function() {
            currentYear = this.value;
            if (currentYear) {
                populateTerms(currentYear);
            } else {
                if (termSelect) termSelect.innerHTML = '<option value="">Select Year First</option>';
                currentTerm = '';
                renderPapers();
            }
        });
    }

    if (termSelect) {
        termSelect.addEventListener('change', function() {
            currentTerm = this.value;
            renderPapers();
        });
    }

    // ==========================================================
    // Mobile Sidebar & Scroll to Top Navigation
    // ==========================================================
    function initNavigation() {
        const menuToggle = document.getElementById('menuToggle');
        const closeMenu = document.getElementById('closeMenu');
        const sidebar = document.getElementById('sidebar');
        const menuOverlay = document.getElementById('menuOverlay');
        const backToTopBtn = document.getElementById('backToTop');

        if (menuToggle && sidebar && menuOverlay) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.add('active');
                menuOverlay.classList.add('active');
            });
        }

        const hideMenu = () => {
            if (sidebar) sidebar.classList.remove('active');
            if (menuOverlay) menuOverlay.classList.remove('active');
        };

        if (closeMenu) closeMenu.addEventListener('click', hideMenu);
        if (menuOverlay) menuOverlay.addEventListener('click', hideMenu);

        if (backToTopBtn) {
            window.addEventListener('scroll', function() {
                if (document.body.scrollTop > 250 || document.documentElement.scrollTop > 250) {
                    backToTopBtn.style.display = "flex";
                } else {
                    backToTopBtn.style.display = "none";
                }
            });
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    // ==========================================================
    // Universal Header Overlap Fix
    // ==========================================================
    function fixHeaderOverlap() {
        const header = document.querySelector('header#top') || document.querySelector('header');
        if (!header) return;
        const headerHeight = header.offsetHeight || 65;
        const safeOffset = headerHeight + 15;
        document.documentElement.style.scrollPaddingTop = safeOffset + 'px';
        let styleTag = document.getElementById('auto-header-fix-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'auto-header-fix-style';
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = `
            html { scroll-padding-top: ${safeOffset}px !important; }
            .content-wrapper { margin-top: 5px; }
            .subject-card, .grade-selector, .lang-selection-section, .news-banner, section, [id] {
                scroll-margin-top: ${safeOffset}px !important;
            }
        `;
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        fetchData();
        initDisclaimer();
        initNavigation();
        fixHeaderOverlap();
    });

    window.addEventListener('resize', fixHeaderOverlap);
    window.addEventListener('load', fixHeaderOverlap);

})();


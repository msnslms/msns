(function() {
    'use strict';

    // ==========================================================
    // Google Sheet Configuration
    // ==========================================================
    const SHEET_ID = '1u6fKlgiG9p1e9WsyRIwaM-w-OnNveBGIg0_kjC50Z6M';
    const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

    // State Variables
    let allData = [];
    let filteredData = [];
    let currentYear = '';
    let currentTerm = '';
    let currentGrade = 'All'; // Default to All

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
    const zipProgress = document.getElementById('zipProgress');
    const zipCount = document.getElementById('zipCount');
    const zipTotal = document.getElementById('zipTotal');

    // ==========================================================
    // Helper Functions
    // ==========================================================
    
    // CSV Parser
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

    // Extract Google Drive File ID
    function extractDriveId(url) {
        if (!url) return null;
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Auto Scroll
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

            // Assuming Row 0 is header: type, url, class, year, term
            // Data starts from Row 1
            allData = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 5) continue; // Skip incomplete rows

                const type = row[0] || '';
                const url = row[1] || '';
                const classStr = row[2] || '';
                const year = row[3] || '';
                const term = row[4] || '';

                if (type.toLowerCase() !== 'sheet' || !url) continue;

                // Parse Class (e.g., "6A" -> grade: "6", section: "A")
                let grade = '';
                let section = '';
                const classMatch = classStr.match(/^(\d+)([A-Za-z]+)$/);
                if (classMatch) {
                    grade = classMatch[1];
                    section = classMatch[2].toUpperCase();
                } else {
                    grade = classStr; // Fallback if no section
                }

                allData.push({
                    type,
                    url,
                    classStr,
                    year,
                    term,
                    grade,
                    section
                });
            }

            initFilters();
        } catch (error) {
            console.error("Error fetching data:", error);
            paperListEl.innerHTML = `<div class="no-docs-card">Failed to load data. Please check the Google Sheet.</div>`;
        }
    }

    // ==========================================================
    // UI Initialization
    // ==========================================================
    function initFilters() {
        // Extract unique years
        const years = [...new Set(allData.map(item => item.year))].filter(y => y).sort((a, b) => b - a);
        
        yearSelect.innerHTML = '<option value="">Select Year</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });

        // Default selection
        if (years.length > 0) {
            yearSelect.value = years[0];
            currentYear = years[0];
            populateTerms(years[0]);
        }

        // Render Grade Buttons
        renderGradeButtons();
    }

    function populateTerms(year) {
        const terms = [...new Set(allData.filter(item => item.year === year).map(item => item.term))].filter(t => t).sort();
        
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
        
        renderPapers();
    }

    function renderGradeButtons() {
        const grades = ['6', '7', '8', '9', '10', '11', '12', '13', 'All'];
        let html = '';
        
        grades.forEach(g => {
            const displayGrade = g === 'All' ? 'All' : `Grade ${g}`;
            const active = g === currentGrade ? 'active' : '';
            html += `<div class="grade-btn ${active}" data-grade="${g}">${displayGrade}</div>`;
        });

        gradePillsEl.innerHTML = html;

        document.querySelectorAll('.grade-btn').forEach(el => {
            el.addEventListener('click', function() {
                currentGrade = this.dataset.grade;
                renderGradeButtons(); // Re-render to update active state
                renderPapers();
                goToNextStep('paperList');
            });
        });
    }

    // ==========================================================
    // Rendering Papers
    // ==========================================================
    function renderPapers() {
        if (!currentYear || !currentTerm) {
            paperListEl.innerHTML = `<div class="no-docs-card">Please select a Year and Term.</div>`;
            dynamicTitle.innerHTML = `<span>Select filters to view papers</span>`;
            zipContainer.style.display = 'none';
            return;
        }

        // Filter Data
        filteredData = allData.filter(item => {
            const matchYear = item.year === currentYear;
            const matchTerm = item.term === currentTerm;
            const matchGrade = currentGrade === 'All' || item.grade === currentGrade;
            return matchYear && matchTerm && matchGrade;
        });

        // Update Title
        const gradeText = currentGrade === 'All' ? 'All Grades' : `Grade ${currentGrade}`;
        dynamicTitle.innerHTML = `<span>${currentYear} - ${currentTerm} Term Test - ${gradeText}</span>`;

        if (filteredData.length === 0) {
            paperListEl.innerHTML = `
                <div class="no-docs-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <div>No papers found for this selection.</div>
                </div>
            `;
            zipContainer.style.display = 'none';
            return;
        }

        // Render Cards
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
        zipContainer.style.display = 'block';
    }

    // ==========================================================
    // Preview Modal Logic
    // ==========================================================
    window.openPdfPreview = function(url) {
        if (!url || url === '#') {
            alert('Preview URL is not available.');
            return;
        }
        previewIframe.src = url;
        previewOverlay.classList.add('active');
    };

    function closePreview() {
        previewOverlay.classList.remove('active');
        previewIframe.src = 'about:blank';
    }

    previewClose.addEventListener('click', closePreview);
    previewOverlay.addEventListener('click', (e) => {
        if (e.target === previewOverlay) closePreview();
    });

    // ==========================================================
    // ZIP Generation Logic
    // ==========================================================
    downloadZipBtn.addEventListener('click', async () => {
        if (filteredData.length === 0) return;

        const zip = new JSZip();
        let completed = 0;
        const total = filteredData.length;

        zipProgress.style.display = 'block';
        zipTotal.textContent = total;
        zipCount.textContent = completed;
        downloadZipBtn.disabled = true;
        downloadZipBtn.innerHTML = 'Preparing ZIP...';

        try {
            for (const item of filteredData) {
                const fileId = extractDriveId(item.url);
                if (!fileId) continue;

                // Direct download link for fetching blob
                const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
                
                try {
                    const response = await fetch(downloadUrl, { mode: 'cors' });
                    if (!response.ok) throw new Error('Network response was not ok');
                    
                    const blob = await response.blob();
                    // Sanitize filename
                    const safeName = `${item.classStr}_${item.year}_${item.term}_Term.pdf`.replace(/[^a-z0-9_\-\.]/gi, '_');
                    zip.file(safeName, blob);
                    
                    completed++;
                    zipCount.textContent = completed;
                } catch (err) {
                    console.warn(`Failed to fetch ${item.classStr}:`, err);
                    // Continue with other files even if one fails
                }
            }

            if (completed === 0) {
                alert("Could not download any files. This might be due to CORS restrictions or invalid links.");
                resetZipButton();
                return;
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `MSNS_Term_Test_${currentYear}_${currentTerm}_Grade_${currentGrade}.zip`);
            
        } catch (error) {
            console.error("ZIP Generation Error:", error);
            alert("An error occurred while generating the ZIP file.");
        } finally {
            resetZipButton();
        }
    });

    function resetZipButton() {
        zipProgress.style.display = 'none';
        downloadZipBtn.disabled = false;
        downloadZipBtn.innerHTML = '<i class="bi bi-file-earmark-zip"></i> Download All as ZIP';
    }

    // ==========================================================
    // Event Listeners for Selects
    // ==========================================================
    yearSelect.addEventListener('change', function() {
        currentYear = this.value;
        if (currentYear) {
            populateTerms(currentYear);
        } else {
            termSelect.innerHTML = '<option value="">Select Year First</option>';
            currentTerm = '';
            renderPapers();
        }
    });

    termSelect.addEventListener('change', function() {
        currentTerm = this.value;
        renderPapers();
    });

    // ==========================================================
    // Initialize
    // ==========================================================
    fetchData();

})();

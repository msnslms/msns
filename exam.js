// Global Configuration & Cache
const NPOINT_API_URL = 'https://api.npoint.io/14e592b7888053bb471b';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let npointManifestCache = null;
let preloadedSheetMatrix = null;
let currentPreloadKey = '';

// Helper function
const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    initGradeChangeListener();
    initPreloadListeners();
    initSearchForm();
    initPDFGenerator();
    preloadNpointManifest(); // Start initial background fetch
});

// UI Helper
function showStatus(msg, type = 'info') {
    const box = $('statusMessage');
    if (!box) return;
    box.className = `status-msg ${type}`;
    box.innerText = msg;
}

// 1. Initial Manifest Preload
async function preloadNpointManifest() {
    try {
        const res = await fetch(NPOINT_API_URL);
        if (res.ok) {
            npointManifestCache = await res.json();
            console.log('⚡ NPoint Manifest successfully preloaded.');
        }
    } catch (err) {
        console.warn('Manifest preload issue:', err);
    }
}

// Stream Selection Listener (Triggered for Grade 12 & 13)
function initGradeChangeListener() {
    const gradeSelect = $('searchGrade');
    const streamBox = $('streamSelectBox');

    gradeSelect?.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (streamBox) {
            streamBox.style.display = (val === 12 || val === 13) ? 'block' : 'none';
        }
    });
}

// 2. High-Speed Background Pre-fetching on Selection
function initPreloadListeners() {
    const triggerElements = ['searchYear', 'searchTerm', 'searchGrade', 'searchClass', 'searchStream'];
    
    triggerElements.forEach(id => {
        $(id)?.addEventListener('change', async () => {
            const year = $('searchYear')?.value;
            const term = $('searchTerm')?.value;
            const grade = $('searchGrade')?.value;
            const cls = $('searchClass')?.value;
            const stream = (parseInt(grade) >= 12) ? $('searchStream')?.value : '';

            if (year && term && grade && cls) {
                const fetchKey = `${year}_T${term}_G${grade}_C${cls}_${stream}`;
                if (currentPreloadKey !== fetchKey) {
                    currentPreloadKey = fetchKey;
                    preloadedSheetMatrix = null;
                    console.log('🚀 Pre-fetching sheet data in background...');
                    try {
                        preloadedSheetMatrix = await getOrFetchSheetData(year, term, grade, cls, stream);
                    } catch (e) {
                        preloadedSheetMatrix = null;
                    }
                }
            }
        });
    });
}

// 3. Fetch Google Sheet Link and Parse to 2D Array Matrix
async function getOrFetchSheetData(year, term, grade, cls, stream) {
    const cacheKey = `sheet_data_${year}_T${term}_G${grade}_C${cls}_${stream || 'none'}`;
    const cachedItem = localStorage.getItem(cacheKey);

    if (cachedItem) {
        try {
            const { timestamp, data } = JSON.parse(cachedItem);
            if (Date.now() - timestamp < ONE_WEEK_MS) {
                return data;
            }
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    if (!npointManifestCache) {
        await preloadNpointManifest();
    }

    if (!npointManifestCache || !Array.isArray(npointManifestCache)) {
        throw new Error('Could not fetch configuration data.');
    }

    // Match Record from NPoint API JSON
    const matched = npointManifestCache.find(item => {
        const matchYear = item.year && item.year.toString().trim() === year.toString().trim();
        
        const itemTermNum = item.term ? item.term.toString().replace(/\D/g, '') : '';
        const searchTermNum = term ? term.toString().replace(/\D/g, '') : '';
        const matchTerm = (itemTermNum && searchTermNum && itemTermNum === searchTermNum) ||
                          (item.term && term && item.term.toString().toLowerCase().includes(term.toString().toLowerCase()));

        const matchGrade = item.grade && item.grade.toString().trim() === grade.toString().trim();
        const matchClass = item.class && item.class.toString().trim().toLowerCase() === cls.toString().trim().toLowerCase();
        
        let matchStream = true;
        if (parseInt(grade) >= 12 && stream) {
            matchStream = item.stream && item.stream.toString().trim().toLowerCase() === stream.toString().trim().toLowerCase();
        }

        return matchYear && matchTerm && matchGrade && matchClass && matchStream;
    });

    if (!matched || (!matched.sheetUrl && !matched.link && !matched.url)) {
        throw new Error('Result sheet URL for this selection was not found.');
    }

    const rawUrl = matched.sheetUrl || matched.link || matched.url;
    const matrix = await fetchGoogleSheetAsMatrix(rawUrl);

    try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: matrix }));
    } catch(e) {}

    return matrix;
}

// Google Sheets GViz Fetcher (Fixed & Robust Parsing)
async function fetchGoogleSheetAsMatrix(sheetUrl) {
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) throw new Error('Invalid Google Sheet URL format.');
    
    const spreadsheetId = sheetIdMatch[1];
    
    // Extract gid if available
    let gidMatch = sheetUrl.match(/gid=([0-9]+)/);
    let gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';

    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json${gidParam}`;

    const res = await fetch(gvizUrl);
    if (!res.ok) throw new Error('Failed to download Google Sheet data.');

    const text = await res.text();
    
    // Robust Extraction of JSON Payload
    const startIdx = text.indexOf('(');
    const endIdx = text.lastIndexOf(')');
    if (startIdx === -1 || endIdx === -1) {
        throw new Error('Invalid response structure from Google Sheets.');
    }
    
    const jsonString = text.substring(startIdx + 1, endIdx);
    const json = JSON.parse(jsonString);

    if (!json.table || !json.table.rows) {
        throw new Error('No data found in Google Sheet.');
    }

    const rows = json.table.rows;
    return rows.map(r => {
        if (!r || !r.c) return [];
        return r.c.map(cell => {
            if (!cell) return '';
            const val = (cell.f !== undefined && cell.f !== null) ? cell.f : cell.v;
            return (val !== null && val !== undefined) ? val.toString().trim() : '';
        });
    });
}

// 4. Form Submit & Result Processor
function initSearchForm() {
    const form = $('resultSearchForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const year = $('searchYear')?.value || '';
        const term = $('searchTerm')?.value || '';
        const grade = $('searchGrade')?.value || '';
        const cls = $('searchClass')?.value || '';
        const indexNum = $('searchIndex')?.value ? $('searchIndex').value.trim() : '';
        const stream = (parseInt(grade) >= 12) ? ($('searchStream')?.value || '') : '';

        if (!grade || !cls || !indexNum) {
            showStatus('Please enter all required details.', 'error');
            return;
        }

        // Get submit button and set Loading state
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
        const originalBtnText = submitBtn ? submitBtn.innerText : 'Get Results';

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Loading... ⏳';
        }

        const resultCard = $('resultCardWrapper');
        if (resultCard) resultCard.style.display = 'none';

        showStatus('⏳ Fetching results, please wait...', 'info');

        try {
            const fetchKey = `${year}_T${term}_G${grade}_C${cls}_${stream}`;
            let sheetMatrix = null;

            if (currentPreloadKey === fetchKey && preloadedSheetMatrix) {
                sheetMatrix = preloadedSheetMatrix;
            } else {
                sheetMatrix = await getOrFetchSheetData(year, term, grade, cls, stream);
            }

            if (!sheetMatrix || sheetMatrix.length === 0) {
                showStatus('No documents were found for this selection.', 'error');
                return;
            }

            const isSuccess = processAndRenderResults(sheetMatrix, indexNum, grade, cls, year, term, stream);
            if (isSuccess) {
                showStatus('✅ Results fetched successfully!', 'success');
            }
        } catch (err) {
            console.error(err);
            showStatus(err.message || 'An error occurred while fetching results.', 'error');
        } finally {
            // Restore submit button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        }
    });
}

// 5. Dynamic Parsing Logic for All Grades
function processAndRenderResults(matrix, indexNum, gradeStr, cls, year, term, stream) {
    const gradeVal = parseInt(gradeStr);
    
    // Header Row Detection (Row 6 to 9)
    let headerRowIdx = -1;
    let indexColIdx = -1;
    let nameColIdx = -1;

    for (let r = 0; r < Math.min(matrix.length, 12); r++) {
        const row = matrix[r] || [];
        for (let c = 0; c < row.length; c++) {
            const val = (row[c] || '').toString().toLowerCase();
            if (val.includes('index') || val === 'index no' || val === 'index_no') {
                headerRowIdx = r;
                indexColIdx = c;
            }
            if (val.includes('name')) {
                nameColIdx = c;
            }
        }
        if (headerRowIdx !== -1 && nameColIdx !== -1) break;
    }

    // Fallbacks
    if (headerRowIdx === -1) headerRowIdx = (gradeVal === 10 || gradeVal === 11) ? 6 : 7;
    if (indexColIdx === -1) indexColIdx = 1; // B Column
    if (nameColIdx === -1) nameColIdx = 2;  // C Column

    const headerRow = matrix[headerRowIdx] || [];

    // Find Student Row
    let studentRow = null;
    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
        const row = matrix[r] || [];
        const rowVal = row[indexColIdx];
        if (rowVal && rowVal.toString().trim().toLowerCase() === indexNum.toLowerCase()) {
            studentRow = row;
            break;
        }
    }

    if (!studentRow) {
        showStatus(`Index number "${indexNum}" was not found in this sheet.`, 'error');
        return false;
    }

    const studentName = studentRow[nameColIdx] || 'N/A';
    let subjectsList = [];
    let totalVal = 'N/A', avgVal = 'N/A', positionVal = 'N/A';

    // Blacklisted column titles for Bucket/Category Headers
    const ignoredHeaders = [
        'main subjects', 'bucket 1', 'bucket 2', 'bucket 3', 
        'bucket i', 'bucket ii', 'bucket iii', 'group 1', 'group 2', 'group 3',
        'index', 'index no', 'index_no', 'name', 'student name'
    ];

    if (gradeVal === 10 || gradeVal === 11) {
        // Grades 10 - 11 Dynamic Processing
        for (let c = nameColIdx + 1; c < headerRow.length; c++) {
            const title = (headerRow[c] || '').toString().trim();
            const lowerTitle = title.toLowerCase();

            if (!title || ignoredHeaders.some(ignored => lowerTitle === ignored)) continue;

            if (lowerTitle.includes('total')) {
                totalVal = studentRow[c] || 'N/A';
            } else if (lowerTitle.includes('average') || lowerTitle.includes('avg')) {
                avgVal = studentRow[c] || 'N/A';
            } else if (lowerTitle.includes('position') || lowerTitle.includes('rank') || lowerTitle.includes('place')) {
                positionVal = studentRow[c] || 'N/A';
            } else {
                // Actual Subject
                const mark = studentRow[c] !== undefined && studentRow[c] !== '' ? studentRow[c] : '-';
                subjectsList.push({ name: title, mark: mark });
            }
        }
    } else {
        // Grades 6-9 & 12-13 Dynamic Processing
        let totalCol = -1, avgCol = -1, posCol = -1;

        for (let c = headerRow.length - 1; c > nameColIdx; c--) {
            const title = (headerRow[c] || '').toString().toLowerCase();
            if (title.includes('total') && totalCol === -1) totalCol = c;
            if ((title.includes('avg') || title.includes('average')) && avgCol === -1) avgCol = c;
            if ((title.includes('position') || title.includes('rank') || title.includes('place')) && posCol === -1) posCol = c;
        }

        const endSubjectCol = totalCol !== -1 ? totalCol : headerRow.length;

        for (let c = nameColIdx + 1; c < endSubjectCol; c++) {
            const title = (headerRow[c] || '').toString().trim();
            if (!title) continue;
            const mark = studentRow[c] !== undefined && studentRow[c] !== '' ? studentRow[c] : '-';
            subjectsList.push({ name: title, mark: mark });
        }

        if (totalCol !== -1) totalVal = studentRow[totalCol] || 'N/A';
        if (avgCol !== -1) avgVal = studentRow[avgCol] || 'N/A';
        if (posCol !== -1) positionVal = studentRow[posCol] || 'N/A';
    }

    // Render Clean English Template
    renderEnglishA4Report({
        year,
        term,
        grade: gradeStr,
        cls,
        stream,
        indexNum,
        studentName,
        subjectsList,
        totalVal,
        avgVal,
        positionVal
    });

    return true;
}

// 6. UI Builder (100% English Output)
function renderEnglishA4Report(data) {
    if ($('rIndex')) $('rIndex').innerText = data.indexNum;
    if ($('rClass')) $('rClass').innerText = `Grade ${data.grade}-${data.cls}${data.stream ? ' (' + data.stream + ')' : ''}`;
    if ($('rName')) $('rName').innerText = data.studentName;
    
    // Exam Header Title
    const ordinalTerm = data.term === '1' ? '1st' : data.term === '2' ? '2nd' : '3rd';
    if ($('a4TermTitle')) $('a4TermTitle').innerText = `${data.year} - ${ordinalTerm} Term Evaluation Report`;

    // Populate Subjects Table
    const tableBody = $('rTableBody');
    if (tableBody) {
        tableBody.innerHTML = '';
        data.subjectsList.forEach((sub, idx) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${idx + 1}</td>
                <td style="text-align: left; font-weight: 600;">${sub.name}</td>
                <td style="font-weight: 700;">${sub.mark}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Inject Total, Average, Position inside summary card & table bottom
    if ($('rTotal')) $('rTotal').innerText = data.totalVal;
    if ($('rAvg')) $('rAvg').innerText = data.avgVal;
    if ($('rRank')) $('rRank').innerText = data.positionVal;

    const resultCard = $('resultCardWrapper');
    if (resultCard) {
        resultCard.style.display = 'block';
        resultCard.scrollIntoView({ behavior: 'smooth' });
    }
}

// 7. Dynamic Single Page PDF Downloader via html2pdf.js
function initPDFGenerator() {
    window.downloadResultPDF = function () {
        const element = document.getElementById('a4Sheet');
        const indexNum = $('rIndex')?.innerText || 'Result';

        const opt = {
            margin:       [10, 10, 10, 10],
            filename:     `Student_Result_${indexNum}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: 'avoid-all' }
        };

        if (typeof html2pdf !== 'undefined') {
            html2pdf().set(opt).from(element).save();
        } else {
            window.print();
        }
    };
}

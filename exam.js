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

// UI Helper (Button Loading State)
function toggleButtonLoading(isLoading) {
    const form = $('resultSearchForm');
    if (!form) return;

    let loaderText = $('btnLoaderText');
    
    // Loader element එක නැත්නම් අලුතින් හදනවා
    if (!loaderText) {
        loaderText = document.createElement('div');
        loaderText.id = 'btnLoaderText';
        loaderText.style.cssText = 'color: #ff8c00; font-weight: bold; margin-top: 15px; text-align: center; font-size: 15px; display: none; animation: pulse 1.5s infinite;';
        form.appendChild(loaderText);
        
        const style = document.createElement('style');
        style.innerHTML = `@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`;
        document.head.appendChild(style);
    }

    if (isLoading) {
        loaderText.innerHTML = '⏳ Loading result... කරුණාකර රැඳී සිටින්න...';
        loaderText.style.display = 'block';
    } else {
        loaderText.style.display = 'none';
    }
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
        throw new Error('Could not fetch configuration data. Please check connection.');
    }

    // Match Record from NPoint API JSON
    const matched = npointManifestCache.find(item => {
        const matchYear = item.year && item.year.toString().trim() === year.toString().trim();
        
        const itemTermNum = item.term ? item.term.toString().replace(/\D/g, '') : '';
        const searchTermNum = term.toString().replace(/\D/g, '');
        const matchTerm = (itemTermNum && searchTermNum && itemTermNum === searchTermNum) ||
                          (item.term && item.term.toString().toLowerCase().includes(term.toString().toLowerCase()));

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

// Google Sheets GViz Fetcher (Robust Parsing)
async function fetchGoogleSheetAsMatrix(sheetUrl) {
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) throw new Error('Invalid Google Sheet URL format.');
    
    const spreadsheetId = sheetIdMatch[1];
    
    let gidMatch = sheetUrl.match(/gid=([0-9]+)/);
    let gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';

    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json${gidParam}`;

    const res = await fetch(gvizUrl);
    if (!res.ok) throw new Error('Failed to download Google Sheet data.');

    const text = await res.text();
    
    // Extract JSON part safely
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
        throw new Error('Invalid response structure from Google Sheets.');
    }
    
    const jsonString = text.substring(startIdx, endIdx + 1);
    const json = JSON.parse(jsonString);

    if (!json.table || !json.table.rows) {
        throw new Error('No data found in Google Sheet.');
    }

    const rows = json.table.rows;
    return rows.map(r => {
        if (!r || !r.c) return [];
        return r.c.map(cell => cell ? (cell.v !== null && cell.v !== undefined ? cell.v.toString().trim() : '') : '');
    });
}

// 4. Form Submit & Result Processor
function initSearchForm() {
    const form = $('resultSearchForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const year = $('searchYear').value;
        const term = $('searchTerm').value;
        const grade = $('searchGrade').value;
        const cls = $('searchClass').value;
        const indexNum = $('searchIndex').value.trim();
        const stream = (parseInt(grade) >= 12) ? $('searchStream').value : '';

        if (!grade || !cls || !indexNum) {
            showStatus('Please enter all required details.', 'error');
            return;
        }

        // Hide previous result and show loading state
        $('resultCardWrapper').style.display = 'none';
        showStatus(''); 
        toggleButtonLoading(true);

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
                toggleButtonLoading(false);
                return;
            }

            processAndRenderResults(sheetMatrix, indexNum, grade, cls, year, term, stream);
            showStatus('', 'info');
        } catch (err) {
            console.error(err);
            showStatus(err.message || 'An error occurred while fetching results.', 'error');
        } finally {
            toggleButtonLoading(false);
        }
    });
}

// 5. Dynamic Parsing Logic for All Grades
function processAndRenderResults(matrix, indexNum, gradeStr, cls, year, term, stream) {
    const gradeVal = parseInt(gradeStr);
    
    // Header Row Detection
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
        return;
    }

    const studentName = studentRow[nameColIdx] || 'N/A';
    let subjectsList = [];
    let totalVal = 'N/A', avgVal = 'N/A', positionVal = 'N/A';

    const ignoredHeaders = [
        'main subjects', 'bucket 1', 'bucket 2', 'bucket 3', 
        'bucket i', 'bucket ii', 'bucket iii', 'group 1', 'group 2', 'group 3',
        'index', 'index no', 'index_no', 'name', 'student name'
    ];

    if (gradeVal === 10 || gradeVal === 11) {
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
                const mark = studentRow[c] !== undefined && studentRow[c] !== '' ? studentRow[c] : '-';
                subjectsList.push({ name: title, mark: mark });
            }
        }
    } else {
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

    renderEnglishA4Report({
        year, term, grade: gradeStr, cls, stream, indexNum,
        studentName, subjectsList, totalVal, avgVal, positionVal
    });
}

// 6. UI Builder (100% English Output)
function renderEnglishA4Report(data) {
    $('rIndex').innerText = data.indexNum;
    $('rClass').innerText = `Grade ${data.grade}-${data.cls}${data.stream ? ' (' + data.stream + ')' : ''}`;
    $('rName').innerText = data.studentName;
    
    const ordinalTerm = data.term === '1' ? '1st' : data.term === '2' ? '2nd' : '3rd';
    $('a4TermTitle').innerText = `${data.year} - ${ordinalTerm} Term Evaluation Report`;

    const tableBody = $('rTableBody');
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

    $('rTotal').innerText = data.totalVal;
    $('rAvg').innerText = data.avgVal;
    $('rRank').innerText = data.positionVal;

    $('resultCardWrapper').style.display = 'block';
    
    setTimeout(() => {
        $('resultCardWrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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

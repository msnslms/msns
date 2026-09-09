// 1. Data ටික Direct JS Variable එකක් ලෙස මෙතනම ඇතුළත් කර ඇත (No fetch required!)
const MANIFEST_DATA = [
  { "year": "2026", "term": "2", "grade": "6", "class": "A", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/15OgTuVlHFgOwW6eCqdIsaVlScFRNw1hp/edit" },
  { "year": "2026", "term": "2", "grade": "6", "class": "B", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1odkEX5pSnEP1oguNeA4_FxpKyjNdFCwZ/edit" },
  { "year": "2026", "term": "2", "grade": "6", "class": "C", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1kyW6Qsz067VRdE9dzZBcjg8G4Xo9bfld/edit" },
  { "year": "2026", "term": "2", "grade": "6", "class": "D", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1aMLfKyJJNUr0wnDh03HEB5_7Z9DudhRM/edit" },
  { "year": "2026", "term": "2", "grade": "6", "class": "E", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1BTlRnlSjZ2p9zlpdjzjs72Rkb1eFdHdd/edit" },
  { "year": "2026", "term": "2", "grade": "6", "class": "F", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1RxK0mxjZD8aaEVzBVTymWvXLuIM3Ciyi/edit" },
  { "year": "2026", "term": "2", "grade": "6", "class": "G", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1V5r17qjDOK9tHy0Nrg99vrhPjnuvdqb-/edit" },
  { "year": "2026", "term": "2", "grade": "7", "class": "A", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1qP6WYzxWSuwwURFe9vOpnBrRlOFHgkgd/edit" },
  { "year": "2026", "term": "2", "grade": "7", "class": "B", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1S_HR-97DLd0gXTGSCDVChH3GIDkpnHud/edit" },
  { "year": "2026", "term": "2", "grade": "7", "class": "C", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1X29gmNf5Iku_pNL5FDtIX7Hu6qFVtSAj/edit" },
  { "year": "2026", "term": "2", "grade": "7", "class": "D", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1RxrRx2lPTYa_697eGTpqIIns4_kKDRSC/edit" },
  { "year": "2026", "term": "2", "grade": "7", "class": "E", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1w33XYAG56nbSD52fGN1Uk8jeOlxHFd5z/edit" },
  { "year": "2026", "term": "2", "grade": "7", "class": "F", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1Hrd_8Nlhswkm_JMmIHkx-c4eYT8liRFg/edit" },
  { "year": "2026", "term": "2", "grade": "7", "class": "G", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1L9cAT5aEw_o2VxcUuuyv9kjqothUwu1H/edit" },
  { "year": "2026", "term": "2", "grade": "8", "class": "A", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1hbSCHIPcLnCVBdXzDxydZY5Y3gicOyMK/edit" },
  { "year": "2026", "term": "2", "grade": "8", "class": "B", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1Q-KcRDhiCrJg3PGZHdsO7B-gwfI_DyAP/edit" },
  { "year": "2026", "term": "2", "grade": "8", "class": "C", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1PFBHf61D_pT3N7i8rJl21DM4cp7uHV0F/edit" },
  { "year": "2026", "term": "2", "grade": "8", "class": "D", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/15EXfofSmnwLanSHesZ8Sa-k0sHgTK3zI/edit" },
  { "year": "2026", "term": "2", "grade": "8", "class": "E", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/19rK44V3IiFLia9YJcXAl8XAtRLETxhUi/edit" },
  { "year": "2026", "term": "2", "grade": "8", "class": "F", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1pXanpx3daGYDZzoyePF4S88SYosGA1qm/edit" },
  { "year": "2026", "term": "2", "grade": "8", "class": "G", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1r-DzwQQYbiAOEqB6Ukn9jDrmP8N85z4n/edit" },
  { "year": "2026", "term": "2", "grade": "9", "class": "A", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1katmCAUhoUyseAhv1ny23b1NgrkMc4N7/edit" },
  { "year": "2026", "term": "2", "grade": "9", "class": "B", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1CoHRzXx6bBegNAzDIG7kn7QD-egSeMJo/edit" },
  { "year": "2026", "term": "2", "grade": "9", "class": "C", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1akQz_PPT3Addt5Q1aqRXsJ-62-rry760/edit" },
  { "year": "2026", "term": "2", "grade": "9", "class": "D", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1JCtghR_AC8j0FQOOcavUvSz1ihi3GS7U/edit" },
  { "year": "2026", "term": "2", "grade": "9", "class": "E", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1JCtghR_AC8j0FQOOcavUvSz1ihi3GS7U/edit" },
  { "year": "2026", "term": "2", "grade": "9", "class": "F", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1FngqXftN6_a6SQ17wo1BDkxD8YmpJdWw/edit" },
  { "year": "2026", "term": "2", "grade": "9", "class": "G", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1FgDdV0XKWoOQffcFMbmjG91W2LePGrCC/edit" },
  { "year": "2026", "term": "2", "grade": "10", "class": "A", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1lItLzggNq1Ioj4uo44muICvNrb109uFP/edit" },
  { "year": "2026", "term": "2", "grade": "10", "class": "B", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1yiQVXWqGw0sYDTcMezcvF42T-W-Nadtn/edit" },
  { "year": "2026", "term": "2", "grade": "10", "class": "C", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1yvTcYsUthpHKkWCs44VQ5iOxWCWpUUJL/edit" },
  { "year": "2026", "term": "2", "grade": "10", "class": "D", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1x3smT-aK6Nu6KFalXfODI0P5lqYDQ4LV/edit" },
  { "year": "2026", "term": "2", "grade": "10", "class": "E", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/10jBjYe6tXw-xXe340MYfdPURTWhpBjKf/edit" },
  { "year": "2026", "term": "2", "grade": "10", "class": "F", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1fqn-hWXjBqWvJPbERVOqqVqJIBxmtBLd/edit" },
  { "year": "2026", "term": "2", "grade": "10", "class": "G", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1QxgxoC_OK17GswYTs7QfQtTF2ua1czwQ/edit" },
  { "year": "2026", "term": "2", "grade": "11", "class": "A", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1297WBMLa-DwtP63AM6rCn-RBsP8imJjL/edit" },
  { "year": "2026", "term": "2", "grade": "11", "class": "B", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1PkPsY-R_8nULLJcI_JQvuo_NXuq4GJw6/edit" },
  { "year": "2026", "term": "2", "grade": "11", "class": "C", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1VVQfKtdytq10kSFjo2mRyJefNBxC3XMa/edit" },
  { "year": "2026", "term": "2", "grade": "11", "class": "D", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1fJ34qv5wRXupcQAqnjBj3s8JbXuq71vT/edit" },
  { "year": "2026", "term": "2", "grade": "11", "class": "E", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1aD9_07EBw_tapenguXPfX7TJ56O8dw8J/edit" },
  { "year": "2026", "term": "2", "grade": "11", "class": "F", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1aD9_07EBw_tapenguXPfX7TJ56O8dw8J/edit" },
  { "year": "2026", "term": "2", "grade": "11", "class": "G", "stream": "", "sheetUrl": "https://docs.google.com/spreadsheets/d/1Z_1JOn2n_4ypdVHFlXfoaaW9XXZ6XPVW/edit" }
];

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let npointManifestCache = MANIFEST_DATA; 
let preloadedSheetMatrix = null;
let currentPreloadKey = '';

// Helper function
const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    initGradeChangeListener();
    initPreloadListeners();
    initSearchForm();
    initPDFGenerator();
});

// UI Helper (Status Message)
function showStatus(msg, type = 'info') {
    const box = $('statusMessage');
    if (!box) return;
    box.className = `status-msg ${type}`;
    box.innerText = msg;
}

// UI Helper (Green Button Loading State Animation)
function toggleButtonLoading(isLoading) {
    const form = $('resultSearchForm');
    if (!form) return;

    let loaderText = $('btnLoaderText');
    
    if (!loaderText) {
        loaderText = document.createElement('div');
        loaderText.id = 'btnLoaderText';
        // කොළ පාට (Green) වර්ණය සහ Animation එක මෙතනින් සකසා ඇත
        loaderText.style.cssText = 'color: #28a745; font-weight: bold; margin-top: 15px; text-align: center; font-size: 16px; display: none; animation: pulse 1.5s infinite;';
        form.appendChild(loaderText);
        
        const style = document.createElement('style');
        style.innerHTML = `@keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }`;
        document.head.appendChild(style);
    }

    if (isLoading) {
        loaderText.innerHTML = '⏳ Loading... (දත්ත ලබා ගනිමින් පවතී...)';
        loaderText.style.display = 'block';
    } else {
        loaderText.style.display = 'none';
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

    if (!npointManifestCache || !Array.isArray(npointManifestCache)) {
        throw new Error('Manifest data එක හමු නොවීය. කරුණාකර JS file එක පරීක්ෂා කරන්න.');
    }

    // Match Record (Flexible matching for Case & Trim)
    const matched = npointManifestCache.find(item => {
        const itemYear = (item.year || item.Year || '').toString().trim();
        const itemTerm = (item.term || item.Term || '').toString().trim().replace(/\D/g, '');
        const itemGrade = (item.grade || item.Grade || '').toString().trim();
        const itemClass = (item.class || item.Class || '').toString().trim().toLowerCase();
        const itemStream = (item.stream || item.Stream || '').toString().trim().toLowerCase();
        
        const rawStream = stream ? stream.toString().trim().toLowerCase() : '';

        const matchYear = itemYear === year.toString().trim();
        const matchTerm = itemTerm === term.toString().replace(/\D/g, '');
        const matchGrade = itemGrade === grade.toString().trim();
        const matchClass = itemClass === cls.toString().trim().toLowerCase();
        let matchStream = true;

        if (parseInt(grade) >= 12 && stream) {
            matchStream = itemStream === rawStream;
        }

        return matchYear && matchTerm && matchGrade && matchClass && matchStream;
    });

    if (!matched || (!matched.sheetUrl && !matched.link && !matched.url)) {
        throw new Error('තෝරාගත් වසර, ශ්‍රේණිය සහ පන්තිය සඳහා Sheet Link එක JS Data හි හමු නොවීය.');
    }

    const rawUrl = matched.sheetUrl || matched.link || matched.url;
    const matrix = await fetchGoogleSheetAsMatrix(rawUrl);

    try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: matrix }));
    } catch(e) {}

    return matrix;
}

// Google Sheets GViz Fetcher
async function fetchGoogleSheetAsMatrix(sheetUrl) {
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) throw new Error('Google Sheet URL එක වැරදියි. URL එක නිවැරදිදැයි බලන්න.');
    
    const spreadsheetId = sheetIdMatch[1];
    
    let gidMatch = sheetUrl.match(/gid=([0-9]+)/);
    let gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';

    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json${gidParam}`;

    const res = await fetch(gvizUrl);
    if (!res.ok) throw new Error('Google Sheet එක Download කරගත නොහැකි විය. Sheet එක Public View දී ඇත්දැයි බලන්න.');

    const text = await res.text();
    
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
        throw new Error('Google Sheet එකෙන් ලැබුණු Data සැකසීමට නොහැකි විය.');
    }
    
    const jsonString = text.substring(startIdx, endIdx + 1);
    const json = JSON.parse(jsonString);

    if (!json.table || !json.table.rows) {
        throw new Error('Google Sheet එකේ කිසිදු Data එකක් නැත.');
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
            showStatus('කරුණාකර අවශ්‍ය සියලුම විස්තර ඇතුළත් කරන්න.', 'error');
            return;
        }

        $('resultCardWrapper').style.display = 'none';
        showStatus(''); 
        toggleButtonLoading(true); // Loading එක On වෙනවා

        try {
            const fetchKey = `${year}_T${term}_G${grade}_C${cls}_${stream}`;
            let sheetMatrix = null;

            if (currentPreloadKey === fetchKey && preloadedSheetMatrix) {
                sheetMatrix = preloadedSheetMatrix;
            } else {
                sheetMatrix = await getOrFetchSheetData(year, term, grade, cls, stream);
            }

            if (!sheetMatrix || sheetMatrix.length === 0) {
                showStatus('මෙම තෝරා ගැනීමට අදාළ දත්ත හමු නොවීය.', 'error');
                toggleButtonLoading(false);
                return;
            }

            processAndRenderResults(sheetMatrix, indexNum, grade, cls, year, term, stream);
            showStatus('', 'info');
        } catch (err) {
            console.error(err);
            showStatus(err.message || 'දත්ත ලබාගැනීමේදී දෝෂයක් සිදු විය.', 'error');
        } finally {
            toggleButtonLoading(false); // Loading එක Off වෙනවා
        }
    });
}

// 5. Dynamic Parsing Logic
function processAndRenderResults(matrix, indexNum, gradeStr, cls, year, term, stream) {
    const gradeVal = parseInt(gradeStr);
    
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

    if (headerRowIdx === -1) headerRowIdx = (gradeVal === 10 || gradeVal === 11) ? 6 : 7;
    if (indexColIdx === -1) indexColIdx = 1;
    if (nameColIdx === -1) nameColIdx = 2;

    const headerRow = matrix[headerRowIdx] || [];

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
        showStatus(`"${indexNum}" විභාග අංකය මෙම Sheet එකෙහි හමු නොවීය.`, 'error');
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

// 6. UI Builder
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

// 7. PDF Downloader
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

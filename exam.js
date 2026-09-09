// Import Firebase ES Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration (ඔබගේ Configuration එක වෙනස් කර නැත)
const firebaseConfig = {
  apiKey: "AIzaSyDgg7n1LwcrRiV2kjgSM5E3XX27twweMg8",
  authDomain: "msns-79.firebaseapp.com",
  projectId: "msns-79",
  storageBucket: "msns-79.firebasestorage.app",
  messagingSenderId: "108137376740",
  appId: "1:108137376740:web:78ed2f442c035a072f75f1",
  measurementId: "G-3GTFJKTS7D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements 
const $ = (id) => document.getElementById(id);

// Caching Duration: 1 Week in Milliseconds
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

document.addEventListener('DOMContentLoaded', () => {
    initGradeChangeListener();
    initSearchForm();
});

function initGradeChangeListener() {
    const gradeSelect = $('searchGrade');
    const streamBox = $('streamSelectBox');
    const streamSelect = $('searchStream');

    gradeSelect?.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (streamBox) {
            if (val === 12 || val === 13) {
                streamBox.style.display = 'block';
                streamSelect.required = true; // 12/13 නම් Stream එක අනිවාර්යයි
            } else {
                streamBox.style.display = 'none';
                streamSelect.required = false; // නැත්නම් අනිවාර්ය නෑ
                streamSelect.value = ''; // අගය හිස් කරනවා
            }
        }
    });
}

function showStatus(msg, type = 'info') {
    const box = $('statusMessage');
    if (!box) return;
    
    // පරණ classes අයින් කරලා අලුත් ඒවා දානවා
    box.className = `status-msg ${type}`;
    
    // Loading animation එකක් එක්ක message එක පෙන්වීම
    if (type === 'info') {
        box.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${msg}`;
    } else if (type === 'error') {
        box.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
    } else if (type === 'success') {
        box.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
    } else {
        box.innerText = msg;
    }
}

function initSearchForm() {
    const form = $('resultSearchForm');
    const btnSearch = $('btnSearch'); // Search Button එක

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const year = $('searchYear').value;
        const term = $('searchTerm').value;
        const grade = $('searchGrade').value;
        const cls = $('searchClass').value;
        const indexNum = $('searchIndex').value.trim();
        const stream = (parseInt(grade) >= 12) ? $('searchStream').value : '';

        if (!grade || !cls || !indexNum) {
            showStatus('කරුණාකර සියලු විස්තර සම්පූර්ණ කරන්න.', 'error');
            return;
        }

        $('resultCardWrapper').style.display = 'none';
        showStatus('දත්ත ලබා ගනිමින් පවතී... කරුණාකර රැඳී සිටින්න.', 'info');
        
        // Button එක disable කරනවා සෙවුම අවසන් වෙනකන්
        if(btnSearch) {
             btnSearch.disabled = true;
             btnSearch.style.opacity = '0.7';
        }

        try {
            // 1. Google Sheet Data ගන්නවා (කලින් තිබුණ Logic එකමයි)
            const parsedSheetData = await getOrFetchSheetData(year, term, grade, cls, stream);
            
            if (!parsedSheetData || parsedSheetData.length === 0) {
                showStatus('මෙම පන්තියට අදාළ Google Sheet ලේඛනය හමුනොවුණි.', 'error');
                if(btnSearch) { btnSearch.disabled = false; btnSearch.style.opacity = '1'; }
                return;
            }

            // 2. ඒ Data ඇතුලෙන් ළමයාව හොයනවා
            renderStudentResult(parsedSheetData, indexNum, grade, cls, year, term);
            
        } catch (err) {
            console.error(err);
            showStatus('ප්‍රතිඵල ලබාගැනීමේදී දෝෂයක් සිදුවිය: ' + err.message, 'error');
        } finally {
            // අන්තිමට Button එක ආයෙත් enable කරනවා
            if(btnSearch) {
                 btnSearch.disabled = false;
                 btnSearch.style.opacity = '1';
            }
        }
    });
}

/**
 * Fetch Firestore URL or Load Cached Sheet Data (1-Week Local Cache)
 * වෙනස් කර නැත - කලින් තිබුණ විදිහටමයි
 */
async function getOrFetchSheetData(year, term, grade, cls, stream) {
    const cacheKey = `term_data_${year}_T${term}_G${grade}_C${cls}_${stream || 'none'}`;
    const cachedItem = localStorage.getItem(cacheKey);

    if (cachedItem) {
        try {
            const { timestamp, data } = JSON.parse(cachedItem);
            if (Date.now() - timestamp < ONE_WEEK_MS) {
                console.log('⚡ Loading sheet data from 7-day LocalCache...');
                return data;
            }
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    console.log('🔥 Querying Firestore for term-test sheet URL...');
    
    try {
        const q = query(
            collection(db, 'term-test-results'), 
            where('grade', 'in', [grade, parseInt(grade), grade.toString()])
        );

        const querySnap = await getDocs(q);
        
        if (querySnap.empty) {
            throw new Error(`Grade ${grade} සඳහා මාර්ගගත Sheet සබැඳියක් Firestore හි හමුනොවුණි.`);
        }

        let matchedDocData = null;

        for (const doc of querySnap.docs) {
            const data = doc.data();

            const matchYear = data.year && (data.year.toString() === year.toString());
            const matchTerm = data.term && (data.term.toString() === term.toString());
            const matchClass = data.class && (data.class.toString().trim().toLowerCase() === cls.trim().toLowerCase());
            
            let matchStream = true;
            if (parseInt(grade) >= 12 && stream) {
                matchStream = data.stream && (data.stream.toString().trim().toLowerCase() === stream.trim().toLowerCase());
            }

            if (matchYear && matchTerm && matchClass && matchStream) {
                matchedDocData = data;
                break;
            }
        }

        if (!matchedDocData) {
            throw new Error(`Grade ${grade}-${cls} (Year: ${year}, Term: ${term}) සඳහා අදාළ දත්ත Firestore හි ඇතුලත් කර නැත.`);
        }

        const rawSheetUrl = matchedDocData.sheetUrl;

        if (!rawSheetUrl) throw new Error('Firestore හි Sheet URL එක හිස්ව පවතී.');

        const sheetData = await fetchGoogleSheetCSV(rawSheetUrl);

        localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: sheetData
        }));

        return sheetData;

    } catch (error) {
        console.error("Firestore Query Error: ", error);
        throw error;
    }
}

/**
 * Handles both Standard Google Sheets and Google Drive Excel (.xlsx) Links
 * වෙනස් කර නැත - කලින් තිබුණ විදිහටමයි
 */
async function fetchGoogleSheetCSV(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
        throw new Error('වලංගු නැති Google Sheet හෝ Drive URL එකකි.');
    }

    const sheetId = match[1];

    try {
        const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        let response = await fetch(csvExportUrl);

        if (!response.ok) {
            console.log("Standard export failed. Trying alternative export method for Drive file...");
            const altExportUrl = `https://docs.google.com/spreadsheets/u/0/d/${sheetId}/export?format=csv`;
            response = await fetch(altExportUrl);
        }

        if (!response.ok) {
            throw new Error(`Google Sheet එක ලබාගැනීමට අපොහොසත් විය. (Status: ${response.status}). Sheet එක "Anyone with the link can view" ලෙස සකසා ඇත්දැයි පරීක්ෂා කරන්න.`);
        }

        const csvText = await response.text();
        
        if (csvText.trim().startsWith('<html') || csvText.trim().startsWith('<!DOCTYPE')) {
            throw new Error('Sheet එක ලබාගැනීමට නොහැක. කරුණාකර එය Public/Viewer (Anyone with the link) ලෙස Share කර ඇති බව තහවුරු කරන්න.');
        }

        return parseCSVText(csvText);

    } catch (error) {
         console.error("Fetch Error:", error);
         throw new Error('Sheet එක කියවීමේදී දෝෂයක්: ' + error.message);
    }
}

/**
 * Simple CSV Parser
 * වෙනස් කර නැත - කලින් තිබුණ විදිහටමයි
 */
function parseCSVText(csvText) {
    const lines = csvText.split(/\r\n|\n/);
    const result = [];
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const cleanedRow = row.map(cell => cell ? cell.replace(/^"(.*)"$/, '$1').trim() : '');
        result.push(cleanedRow);
    }
    return result;
}

/**
 * Locate Student Index & Extract Results Based on Grade Structure
 * අලුත් UI එකට හරියටම set වෙන්න පොඩි වෙනස්කම් කරලා තියෙනවා
 */
function renderStudentResult(rows, indexNum, grade, cls, year, term) {
    const numGrade = parseInt(grade);
    let subjectRowIndex, dataStartRowIndex, indexCol, nameCol, firstSubjectCol;

    if (numGrade >= 10 && numGrade <= 11) {
        subjectRowIndex = 6;
        dataStartRowIndex = 7;
        indexCol = 1;
        nameCol = 2;
        firstSubjectCol = 3;
    } else {
        subjectRowIndex = 7;
        dataStartRowIndex = 8;
        indexCol = 1;
        nameCol = 2;
        firstSubjectCol = 3;
    }

    if (rows.length <= dataStartRowIndex) {
        showStatus('Sheet එකේ දත්ත ප්‍රමාණවත් නොවේ.', 'error');
        return;
    }

    const subjectsRow = rows[subjectRowIndex] || [];
    let targetStudentRow = null;

    for (let r = dataStartRowIndex; r < rows.length; r++) {
        const row = rows[r];
        if (row[indexCol] && row[indexCol].toString().trim().toLowerCase() === indexNum.toLowerCase()) {
            targetStudentRow = row;
            break;
        }
    }

    if (!targetStudentRow) {
        showStatus(`විභාග අංක ${indexNum} සඳහා ප්‍රතිඵල හමුනොවුණි.`, 'error');
        return;
    }

    const studentName = targetStudentRow[nameCol] || 'N/A';
    const markList = [];
    let totalMarks = '-';
    let avgMarks = '-';
    let rankPos = '-';

    for (let c = firstSubjectCol; c < subjectsRow.length; c++) {
        const subTitle = subjectsRow[c]?.trim();
        const markVal = targetStudentRow[c]?.trim() || '-';

        if (!subTitle) continue;

        const lowerSub = subTitle.toLowerCase();
        if (lowerSub.includes('total') || lowerSub.includes('එකතුව')) {
            totalMarks = markVal;
        } else if (lowerSub.includes('avg') || lowerSub.includes('average') || lowerSub.includes('සාමාන්‍ය')) {
            avgMarks = markVal;
        } else if (lowerSub.includes('position') || lowerSub.includes('rank') || lowerSub.includes('ස්ථානය')) {
            rankPos = markVal;
        } else {
            markList.push({ subject: subTitle, mark: markVal });
        }
    }

    // අලුත් term.html එකේ id වලට data දානවා
    $('rIndex').innerText = indexNum;
    $('rClass').innerText = `Grade ${grade} - ${cls}`;
    $('rName').innerText = studentName;
    
    // Term Title එක format කරනවා
    const termSuffix = term === "1" ? "1 වන" : (term === "2" ? "2 වන" : "3 වන");
    $('a4TermTitle').innerText = `${year} - ${termSuffix} වාර පරීක්ෂණ වාර්තාව`;

    const tBody = $('rTableBody');
    tBody.innerHTML = '';

    markList.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td style="text-align: left; font-weight: 600;">${item.subject}</td>
            <td style="font-weight: 700;">${item.mark}</td>
        `;
        tBody.appendChild(tr);
    });

    $('rTotal').innerText = totalMarks;
    $('rAvg').innerText = avgMarks;
    $('rRank').innerText = rankPos;

    showStatus('ප්‍රතිඵල සාර්ථකව සොයාගන්නා ලදී!', 'success');
    $('resultCardWrapper').style.display = 'block';
    
    // Smooth scroll to results
    setTimeout(() => {
        $('resultCardWrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

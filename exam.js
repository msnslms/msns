// Import Firebase ES Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
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

    gradeSelect?.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (streamBox) {
            streamBox.style.display = (val === 12 || val === 13) ? 'block' : 'none';
        }
    });
}

function showStatus(msg, type = 'info') {
    const box = $('statusMessage');
    if (!box) return;
    box.className = `status-msg ${type}`;
    box.innerText = msg;
}

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
            showStatus('කරුණාකර සියලු විස්තර සම්පූර්ණ කරන්න.', 'error');
            return;
        }

        $('resultCardWrapper').style.display = 'none';
        showStatus('දත්ත ලබා ගනිමින් පවතී... කරුණාකර රැඳී සිටින්න.', 'info');

        try {
            const parsedSheetData = await getOrFetchSheetData(year, term, grade, cls, stream);
            if (!parsedSheetData || parsedSheetData.length === 0) {
                showStatus('මෙම පන්තියට අදාළ Google Sheet ලේඛනය හමුනොවුණි.', 'error');
                return;
            }

            renderStudentResult(parsedSheetData, indexNum, grade, cls, year, term);
        } catch (err) {
            console.error(err);
            showStatus('ප්‍රතිඵල ලබාගැනීමේදී දෝෂයක් සිදුවිය: ' + err.message, 'error');
        }
    });
}

/**
 * Fetch Firestore URL or Load Cached Sheet Data (1-Week Local Cache)
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

    // Query Firestore for Sheet Link
    console.log('🔥 Querying Firestore for term-test sheet URL...');
    
    // Firestore Data Type mismatches (String vs Number) වැළැක්වීමට
    const constraints = [
        where('year', 'in', [year, parseInt(year)]),
        where('term', 'in', [term, parseInt(term)]),
        where('grade', 'in', [grade, parseInt(grade)]),
        where('class', '==', cls)
    ];

    // Grade 12/13 සඳහා Stream filter එක එකතු කිරීම
    if (parseInt(grade) >= 12 && stream) {
        constraints.push(where('stream', '==', stream));
    }

    const q = query(collection(db, 'term-test-results'), ...constraints);

    const querySnap = await getDocs(q);
    if (querySnap.empty) {
        throw new Error(`Grade ${grade}-${cls} සඳහා මාර්ගගත Sheet සබැඳියක් Firestore හි හමුනොවුණි.`);
    }

    const docData = querySnap.docs[0].data();
    const rawSheetUrl = docData.sheetUrl;

    if (!rawSheetUrl) throw new Error('Sheet URL එක හිස්ව පවතී.');

    // Fetch and Parse Google Sheet
    const sheetData = await fetchGoogleSheetCSV(rawSheetUrl);

    // Save to Cache for 1 Week
    localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: sheetData
    }));

    return sheetData;
}

/**
 * Handles both Standard Google Sheets and Google Drive Excel (.xlsx) Links
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
        
        // HTML error page අල්ලා ගැනීම
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

    $('rIndex').innerText = indexNum;
    $('rClass').innerText = `Grade ${grade} - ${cls}`;
    $('rName').innerText = studentName;
    $('a4TermTitle').innerText = `${year} - ${term} වන වාර පරීක්ෂණ වාර්තාව`;

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
    $('resultCardWrapper').scrollIntoView({ behavior: 'smooth' });
}

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
                streamSelect.required = true; // Stream is mandatory for Grade 12 & 13
            } else {
                streamBox.style.display = 'none';
                streamSelect.required = false; 
                streamSelect.value = ''; // Reset value
            }
        }
    });
}

function showStatus(msg, type = 'info') {
    const box = $('statusMessage');
    if (!box) return;
    
    box.className = `status-msg ${type}`;
    
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
    const btnSearch = $('btnSearch');

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const year = $('searchYear').value;
        const term = $('searchTerm').value;
        const grade = $('searchGrade').value;
        const cls = $('searchClass').value;
        const indexNum = $('searchIndex').value.trim();
        const stream = (parseInt(grade) >= 12) ? $('searchStream').value : '';

        if (!grade || !cls || !indexNum) {
            showStatus('Please complete all required fields.', 'error');
            return;
        }

        $('resultCardWrapper').style.display = 'none';
        showStatus('Fetching results... Please wait.', 'info');
        
        if (btnSearch) {
             btnSearch.disabled = true;
             btnSearch.style.opacity = '0.7';
        }

        try {
            // Directly fetch student record from Firestore using Index Number
            const studentData = await fetchStudentResult(year, term, grade, cls, indexNum, stream);
            
            if (!studentData) {
                showStatus(`No results found for Index Number: ${indexNum}`, 'error');
                return;
            }

            // Render results onto the UI
            renderStudentResult(studentData, indexNum, grade, cls, year, term);
            
        } catch (err) {
            console.error(err);
            showStatus('Error fetching results: ' + err.message, 'error');
        } finally {
            if (btnSearch) {
                 btnSearch.disabled = false;
                 btnSearch.style.opacity = '1';
            }
        }
    });
}

/**
 * Directly queries Firestore collection by indexNumber for fast lookup
 */
async function fetchStudentResult(year, term, grade, cls, indexNum, stream) {
    console.log(`🔥 Querying Firestore directly for Index: ${indexNum}...`);
    
    // Query documents where indexNumber matches
    const q = query(
        collection(db, 'term-test-student-results'), 
        where('indexNumber', 'in', [indexNum, parseInt(indexNum) || indexNum, indexNum.toString()])
    );

    const querySnap = await getDocs(q);
    
    if (querySnap.empty) {
        return null;
    }

    // Filter matching document for grade, class, year, and term
    let matchedDocData = null;

    for (const doc of querySnap.docs) {
        const data = doc.data();

        const matchGrade = data.grade && (data.grade.toString() === grade.toString());
        const matchClass = !data.class || (data.class.toString().trim().toLowerCase() === cls.trim().toLowerCase());
        const matchYear = !data.year || (data.year.toString() === year.toString());
        const matchTerm = !data.term || (data.term.toString() === term.toString());

        let matchStream = true;
        if (parseInt(grade) >= 12 && stream && data.stream) {
            matchStream = data.stream.toString().trim().toLowerCase() === stream.trim().toLowerCase();
        }

        if (matchGrade && matchClass && matchYear && matchTerm && matchStream) {
            matchedDocData = data;
            break;
        }
    }

    // Fallback: If strict class/year didn't match, return the first document matching grade and index
    if (!matchedDocData && querySnap.docs.length > 0) {
        for (const doc of querySnap.docs) {
            const data = doc.data();
            if (data.grade && data.grade.toString() === grade.toString()) {
                matchedDocData = data;
                break;
            }
        }
    }

    return matchedDocData || (querySnap.docs.length === 1 ? querySnap.docs[0].data() : null);
}

/**
 * Extracts subjects and marks from Firestore 'results' object and updates UI
 */
function renderStudentResult(docData, indexNum, grade, cls, year, term) {
    const resultsMap = docData.results || {};

    // Get student name (checks results.Name or top-level name)
    const studentName = resultsMap.Name || docData.name || 'N/A';
    
    let totalMarks = '-';
    let avgMarks = '-';
    let rankPos = resultsMap.Position || resultsMap.Rank || '-';

    const markList = [];

    // Keys to exclude from subject list
    const excludedKeys = ['name', 'position', 'rank', 'total', 'avg', 'average', 'class', 'grade', 'indexnumber'];

    Object.keys(resultsMap).forEach(key => {
        const lowerKey = key.trim().toLowerCase();
        
        if (excludedKeys.includes(lowerKey)) {
            if (lowerKey === 'position' || lowerKey === 'rank') {
                rankPos = resultsMap[key];
            }
            return;
        }

        if (lowerKey.includes('total') || lowerKey.includes('එකතුව')) {
            totalMarks = resultsMap[key];
        } else if (lowerKey.includes('avg') || lowerKey.includes('average') || lowerKey.includes('සාමාන්‍ය')) {
            avgMarks = resultsMap[key];
        } else {
            markList.push({
                subject: key,
                mark: resultsMap[key] || '-'
            });
        }
    });

    // Populate UI elements
    $('rIndex').innerText = indexNum;
    $('rClass').innerText = `Grade ${grade} - ${cls}`;
    $('rName').innerText = studentName;
    
    // Format Term Title in English
    const termSuffix = term === "1" ? "1st" : (term === "2" ? "2nd" : "3rd");
    $('a4TermTitle').innerText = `${year} - ${termSuffix} Term Examination Report`;

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

    showStatus('Results loaded successfully!', 'success');
    $('resultCardWrapper').style.display = 'block';
    
    // Smooth scroll to results
    setTimeout(() => {
        $('resultCardWrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

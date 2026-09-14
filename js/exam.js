/* ==========================================================
   EXAM.JS — Term Test Results with Analysis & PDF (Print)
   ========================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ---------- Firebase Config ---------- */
const firebaseConfig = {
    apiKey: "AIzaSyDgg7n1LwcrRiV2kjgSM5E3XX27twweMg8",
    authDomain: "msns-79.firebaseapp.com",
    projectId: "msns-79",
    storageBucket: "msns-79.firebasestorage.app",
    messagingSenderId: "108137376740",
    appId: "1:108137376740:web:78ed2f442c035a072f75f1",
    measurementId: "G-GTFJKTS7D"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- Globals ---------- */
const $ = (id) => document.getElementById(id);
let currentUser = null;
let currentProfile = null;
let currentResultData = null;
let subjectBarChartInstance = null;
let gradeChartInstance = null;

/* ---------- Grade Calculation ---------- */
function calculateGrade(marks) {
    const m = parseFloat(marks);
    if (isNaN(m)) return '—';
    if (m >= 75) return 'A';
    if (m >= 65) return 'B';
    if (m >= 55) return 'C';
    if (m >= 35) return 'S';
    return 'W';
}

function getGradeColor(grade) {
    const colors = {
        'A': '#059669',
        'B': '#2563eb',
        'C': '#b45309',
        'S': '#c2410c',
        'W': '#b91c1c'
    };
    return colors[grade] || '#71717a';
}

/* ---------- Status Message ---------- */
function setStatus(msg, type = 'info') {
    const el = $('statusMessage');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-msg ' + type;
}

/* ---------- Show/Hide States ---------- */
function showState(stateName) {
    const states = ['loadingState', 'pageHeader', 'searchCard', 'resultsSection'];
    states.forEach(s => {
        const el = $(s);
        if (el) el.style.display = 'none';
    });
    if (stateName === 'ready') {
        if ($('pageHeader')) $('pageHeader').style.display = 'block';
        if ($('searchCard')) $('searchCard').style.display = 'block';
    } else if ($(stateName)) {
        $(stateName).style.display = stateName === 'loadingState' ? 'block' : 'block';
    }
}

/* ---------- Helper: Get Valid Subjects Only ---------- */
function getValidSubjectEntries(resultsObj) {
    if (!resultsObj) return [];
    return Object.entries(resultsObj).filter(([subject]) => {
        const s = subject.toLowerCase().trim();
        return !s.includes('grade') && !s.includes('class') && !s.includes('stream');
    });
}

/* ---------- Auth Check ---------- */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'u.html';
        return;
    }

    currentUser = user;

    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
            currentProfile = snap.data();
        } else {
            currentProfile = {
                displayName: user.displayName || 'User',
                email: user.email || '',
                role: 'student',
                baseGrade: '',
                studentClass: '',
                indexNo: '',
                stream: ''
            };
        }
    } catch (err) {
        console.error('Profile load error:', err);
        currentProfile = { displayName: 'User', role: 'student' };
    }

    autoFillForm();
    showState('ready');
});

/* ---------- Auto-fill Form ---------- */
function autoFillForm() {
    if (!currentProfile) return;

    const idxEl = $('searchIndex');
    if (idxEl) idxEl.value = currentProfile.indexNo || '—';

    const gradeEl = $('searchGrade');
    if (gradeEl) {
        gradeEl.value = currentProfile.baseGrade 
            ? `Grade ${currentProfile.baseGrade}` 
            : '—';
    }

    const classEl = $('searchClass');
    if (classEl && currentProfile.studentClass) {
        classEl.value = currentProfile.studentClass;
    }

    const gradeNum = parseInt(currentProfile.baseGrade);
    const streamGroup = $('streamGroup');
    const streamEl = $('searchStream');
    if (streamGroup) {
        if (gradeNum === 12 || gradeNum === 13) {
            streamGroup.style.display = 'flex';
            if (streamEl && currentProfile.stream) {
                streamEl.value = currentProfile.stream;
            }
        } else {
            streamGroup.style.display = 'none';
        }
    }
}

/* ---------- Search Handler ---------- */
$('resultSearchForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const year = $('searchYear')?.value.trim();
    const term = $('searchTerm')?.value.trim();
    const index = currentProfile?.indexNo?.trim();

    if (!index) {
        setStatus('Your profile does not have an Index Number. Please update it in My Profile.', 'error');
        return;
    }

    setStatus('Searching for results...', 'info');

    try {
        const q = query(
            collection(db, 'term-test-student-results'),
            where('indexNumber', '==', index),
            where('year', '==', String(year)),
            where('term', '==', term)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
            setStatus('No results found for the selected year and term.', 'error');
            $('resultsSection').style.display = 'none';
            return;
        }

        const docData = snap.docs[0].data();
        currentResultData = docData;

        setStatus('Results loaded successfully!', 'success');

        renderAnalysis(docData);
        renderReportCard(docData);

        $('resultsSection').style.display = 'block';

        setTimeout(() => {
            $('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);

    } catch (err) {
        console.error('Search error:', err);
        setStatus('Error fetching results: ' + err.message, 'error');
    }
});

/* ---------- Render Analysis ---------- */
function renderAnalysis(data) {
    const results = data.results || {};
    const total = data.total || '—';
    const avg = data.average || '—';
    const position = data.position || '—';

    $('statTotal').textContent = total;
    $('statAvg').textContent = avg;
    $('statPosition').textContent = position !== '—' ? `#${position}` : '—';

    const tbody = $('subjectTableBody');
    tbody.innerHTML = '';

    const subjectEntries = getValidSubjectEntries(results);
    
    subjectEntries.forEach(([subject, marks], idx) => {
        const grade = calculateGrade(marks);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${subject}</td>
            <td><strong>${marks}</strong></td>
            <td><span class="grade-badge grade-${grade}">${grade}</span></td>
        `;
        tbody.appendChild(tr);
    });

    renderSubjectBarChart(subjectEntries);
    renderGradeChart(subjectEntries);
}

/* ---------- Subject Bar Chart ---------- */
function renderSubjectBarChart(subjectEntries) {
    const canvas = $('subjectBarChart');
    if (!canvas) return;

    if (subjectBarChartInstance) {
        subjectBarChartInstance.destroy();
    }

    const labels = subjectEntries.map(([s]) => s);
    const marks = subjectEntries.map(([, m]) => parseFloat(m) || 0);
    const colors = subjectEntries.map(([, m]) => {
        const grade = calculateGrade(m);
        return getGradeColor(grade);
    });

    subjectBarChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Marks',
                data: marks,
                backgroundColor: colors,
                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#ffffff',
                    bodyColor: '#f1f5f9',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => `Marks: ${ctx.parsed.y}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { color: '#71717a', font: { weight: 600 } }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#52525b',
                        font: { size: 10, weight: 600 },
                        maxRotation: 60,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

/* ---------- Grade Distribution Doughnut ---------- */
function renderGradeChart(subjectEntries) {
    const canvas = $('gradeChart');
    if (!canvas) return;

    if (gradeChartInstance) {
        gradeChartInstance.destroy();
    }

    const gradeCounts = { A: 0, B: 0, C: 0, S: 0, W: 0 };
    subjectEntries.forEach(([, m]) => {
        const g = calculateGrade(m);
        if (gradeCounts[g] !== undefined) gradeCounts[g]++;
    });

    const labels = ['A (75+)', 'B (65-74)', 'C (55-64)', 'S (35-54)', 'W (Below 35)'];
    const dataVals = [gradeCounts.A, gradeCounts.B, gradeCounts.C, gradeCounts.S, gradeCounts.W];
    const colors = ['#059669', '#2563eb', '#b45309', '#c2410c', '#b91c1c'];

    gradeChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataVals,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 14,
                        font: { size: 11, weight: 700 },
                        color: '#52525b',
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#ffffff',
                    bodyColor: '#f1f5f9',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${ctx.parsed} subject(s) (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

/* ---------- Render Report Card ---------- */
function renderReportCard(data) {
    const results = data.results || {};
    const year = data.year || '';
    const term = data.term || '';

    const termTitle = $('a4TermTitle');
    if (termTitle) {
        const termDisplay = term.replace(/\b\w/g, c => c.toUpperCase());
        termTitle.textContent = `${year} — ${termDisplay} Examination Report`;
    }

    if ($('rIndex')) $('rIndex').textContent = data.indexNumber || '—';
    if ($('rClass')) $('rClass').textContent = `Grade ${data.grade || '—'} - Class ${data.class || '—'}`;
    if ($('rName')) $('rName').textContent = data.name || '—';

    const tbody = $('rTableBody');
    tbody.innerHTML = '';

    const subjectEntries = getValidSubjectEntries(results);

    subjectEntries.forEach(([subject, marks], idx) => {
        const grade = calculateGrade(marks);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${subject}</td>
            <td>${marks}</td>
            <td class="a4-grade-${grade}">${grade}</td>
        `;
        tbody.appendChild(tr);
    });

    if ($('rTotal')) $('rTotal').textContent = data.total || '—';
    if ($('rAvg')) $('rAvg').textContent = data.average || '—';
    if ($('rRank')) $('rRank').textContent = data.position || '—';
}

/* ==========================================================
   ---------- PRINT / SAVE AS PDF (NEW) ----------
   ========================================================== */
$('btnDownloadPDF')?.addEventListener('click', () => {
    const sheet = $('a4Sheet');
    if (!sheet) return;

    const btn = $('btnDownloadPDF');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch spin"></i> Opening Print View...';

    // Remember original location so we can move it back
    const parent = sheet.parentNode;
    const nextSibling = sheet.nextSibling;

    // Move the sheet directly under <body> so we can hide everything else
    document.body.appendChild(sheet);

    // Inject temporary print stylesheet
    const printStyle = document.createElement('style');
    printStyle.id = 'printStyleTemp';
    printStyle.textContent = `
        @media print {
            @page {
                size: A4 portrait;
                margin: 10mm;
            }
            html, body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
            }
            body > *:not(#a4Sheet) {
                display: none !important;
            }
            #a4Sheet {
                display: block !important;
                position: static !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                margin: 0 auto !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                background: #ffffff !important;
                page-break-inside: avoid;
                page-break-after: avoid;
            }
            #a4Sheet * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
        }
    `;
    document.head.appendChild(printStyle);

    // Cleanup function (restores DOM + button)
    const cleanup = () => {
        const s = document.getElementById('printStyleTemp');
        if (s) s.remove();

        // Put the sheet back where it was
        if (parent) {
            if (nextSibling && nextSibling.parentNode === parent) {
                parent.insertBefore(sheet, nextSibling);
            } else {
                parent.appendChild(sheet);
            }
        }

        btn.disabled = false;
        btn.innerHTML = originalHTML;
        window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    // Safety fallback: if afterprint doesn't fire (old browsers)
    setTimeout(() => {
        if (document.getElementById('printStyleTemp')) {
            cleanup();
        }
    }, 60000);

    // Wait a tick so the browser applies the new styles, then print
    setTimeout(() => {
        window.print();
    }, 200);
});

/* ---------- Tab Switching ---------- */
document.querySelectorAll('.exam-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        document.querySelectorAll('.exam-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.exam-tab-content').forEach(c => c.classList.remove('active'));
        if (targetTab === 'analysis') {
            $('tabAnalysis')?.classList.add('active');
            if (currentResultData) {
                const subjectEntries = getValidSubjectEntries(currentResultData.results || {});
                setTimeout(() => {
                    renderSubjectBarChart(subjectEntries);
                    renderGradeChart(subjectEntries);
                }, 50);
            }
        } else if (targetTab === 'report') {
            $('tabReport')?.classList.add('active');
        }
    });
});

/* ==========================================================
   EXAM.JS — Term Test Results with Analysis & PDF
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

/* ---------- Auth Check ---------- */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Not logged in → redirect to u.html
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

    // Auto-fill form
    autoFillForm();
    showState('ready');
});

/* ---------- Auto-fill Form ---------- */
function autoFillForm() {
    if (!currentProfile) return;

    // Index (locked)
    const idxEl = $('searchIndex');
    if (idxEl) idxEl.value = currentProfile.indexNo || '—';

    // Grade (locked)
    const gradeEl = $('searchGrade');
    if (gradeEl) {
        gradeEl.value = currentProfile.baseGrade 
            ? `Grade ${currentProfile.baseGrade}` 
            : '—';
    }

    // Class (auto-select but editable)
    const classEl = $('searchClass');
    if (classEl && currentProfile.studentClass) {
        classEl.value = currentProfile.studentClass;
    }

    // Stream (only for grade 12/13)
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
        // Query: indexNumber + year + term
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

        // Take the first matching doc
        const docData = snap.docs[0].data();
        currentResultData = docData;

        setStatus('Results loaded successfully!', 'success');

        // Render everything
        renderAnalysis(docData);
        renderReportCard(docData);

        // Show results section
        $('resultsSection').style.display = 'block';

        // Scroll to results
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

    // Summary stats
    $('statTotal').textContent = total;
    $('statAvg').textContent = avg;
    $('statPosition').textContent = position !== '—' ? `#${position}` : '—';

    // Subject table
    const tbody = $('subjectTableBody');
    tbody.innerHTML = '';

    const subjectEntries = Object.entries(results);
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

    // Render charts
    renderSubjectBarChart(subjectEntries);
    renderGradeChart(subjectEntries);
}

/* ---------- Subject Bar Chart ---------- */
function renderSubjectBarChart(subjectEntries) {
    const canvas = $('subjectBarChart');
    if (!canvas) return;

    // Destroy previous chart
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

    // Count grades
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

    // Title
    const termTitle = $('a4TermTitle');
    if (termTitle) {
        const termDisplay = term.replace(/\b\w/g, c => c.toUpperCase());
        termTitle.textContent = `${year} — ${termDisplay} Examination Report`;
    }

    // Student info
    if ($('rIndex')) $('rIndex').textContent = data.indexNumber || '—';
    if ($('rClass')) $('rClass').textContent = `Grade ${data.grade || '—'} - Class ${data.class || '—'}`;
    if ($('rName')) $('rName').textContent = data.name || '—';

    // Results table
    const tbody = $('rTableBody');
    tbody.innerHTML = '';

    Object.entries(results).forEach(([subject, marks], idx) => {
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

    // Summary
    if ($('rTotal')) $('rTotal').textContent = data.total || '—';
    if ($('rAvg')) $('rAvg').textContent = data.average || '—';
    if ($('rRank')) $('rRank').textContent = data.position || '—';
}

/* ---------- PDF Download ---------- */
$('btnDownloadPDF')?.addEventListener('click', async () => {
    const sheet = $('a4Sheet');
    if (!sheet) return;

    const btn = $('btnDownloadPDF');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch spin"></i> Generating PDF...';

    try {
        const studentName = (currentResultData?.name || 'Student').replace(/[^\w]/g, '_');
        const year = currentResultData?.year || '';
        const term = (currentResultData?.term || '').replace(/\s+/g, '_');
        const filename = `MSNS_Report_${studentName}_${year}_${term}.pdf`;

        const opt = {
            margin: [8, 8, 8, 8],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().set(opt).from(sheet).save();

    } catch (err) {
        console.error('PDF generation error:', err);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
});

/* ---------- Tab Switching ---------- */
document.querySelectorAll('.exam-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Update active state on buttons
        document.querySelectorAll('.exam-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active content
        document.querySelectorAll('.exam-tab-content').forEach(c => c.classList.remove('active'));
        if (targetTab === 'analysis') {
            $('tabAnalysis')?.classList.add('active');
            // Re-render charts (they may be hidden initially)
            if (currentResultData) {
                const subjectEntries = Object.entries(currentResultData.results || {});
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

// Import Firebase ES Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let currentAdminRole = null;
let activeUserRoleTab = 'student';
let loadedUsers = [];
let loadedAdminUsers = [];   // ★ NEW

const $ = (id) => document.getElementById(id);
const IMGBB_API_KEY = "3c7f31bff91c8f5f4a9aef96751ac2db";

// ==========================================
// 1. INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initAuth();
    initNewsModule();
    initExamsModule();
    initTermTestModule();
    initDocumentsModule();
    initGeminiModule();
    initTermAnalysisModule();
    initMainTabs();
    initAdminUsersModule();   // ★ NEW
});

function showToast(msg, type = 'ok') {
    const toastBox = $('toastBox');
    if (!toastBox) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    toastBox.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function initAuth() {
    const savedRole = sessionStorage.getItem('adminRole');
    if (savedRole) {
        currentAdminRole = savedRole;
        applyRolePermissions();
        $('loginModal')?.classList.remove('active');
    } else {
        $('loginModal')?.classList.add('active');
    }
    $('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const unameInput = $('loginUsername');
        const pwdInput = $('loginPassword');
        if (!unameInput || !pwdInput) return;
        const uname = unameInput.value.trim().toLowerCase();
        const pwd = pwdInput.value.trim();
        try {
            let userData = null;
            let detectedRole = null;
            let adminSnap = await getDoc(doc(db, 'admin-users', uname));
            if (adminSnap.exists()) {
                userData = adminSnap.data();
                detectedRole = userData.role || adminSnap.id;
            } else {
                const q = query(collection(db, 'admin-users'), where('username', '==', uname));
                const querySnap = await getDocs(q);
                if (!querySnap.empty) {
                    const matchedDoc = querySnap.docs[0];
                    userData = matchedDoc.data();
                    detectedRole = userData.role || matchedDoc.id;
                }
            }
            if (userData && (userData.password === pwd || userData.pwd === pwd)) {
                currentAdminRole = (detectedRole || 'admin').toLowerCase();
                sessionStorage.setItem('adminRole', currentAdminRole);
                $('loginModal')?.classList.remove('active');
                applyRolePermissions();
                showToast('සාර්ථකව Login විය!', 'ok');
            } else {
                showToast('Username හෝ Password වැරදිය!', 'error');
            }
        } catch (err) {
            console.error('Login Error:', err);
            showToast('Login දෝෂයක්: ' + err.message, 'error');
        }
    });
    $('btnLogout')?.addEventListener('click', () => {
        sessionStorage.removeItem('adminRole');
        location.reload();
    });
}

function applyRolePermissions() {
    if ($('adminRoleBadge')) {
        $('adminRoleBadge').innerText = currentAdminRole ? currentAdminRole.toUpperCase() : 'GUEST';
    }
    const navLinks = {
        users: $('navUsers'), news: $('navNews'), exams: $('navExams'),
        termTest: $('navTermTest'), documents: $('navDocuments'), gemini: $('navGemini'),
        adminUsers: $('navAdminUsers')   // ★ NEW
    };
    Object.values(navLinks).forEach(el => { if (el) el.style.display = 'none'; });
    if (currentAdminRole === 'media-unit') {
        if (navLinks.news) navLinks.news.style.display = 'flex';
        switchSection('newsSection');
    } else if (currentAdminRole === 'ict-unit') {
        if (navLinks.exams) navLinks.exams.style.display = 'flex';
        if (navLinks.termTest) navLinks.termTest.style.display = 'flex';
        switchSection('examSection');
    } else {
        Object.values(navLinks).forEach(el => { if (el) el.style.display = 'flex'; });
        // ★ Owner ට විතරක් Admin Users section එක පෙන්නන්න
        if (navLinks.adminUsers) {
            navLinks.adminUsers.style.display = (currentAdminRole === 'owner') ? 'flex' : 'none';
        }
        switchSection('usersSection');
        loadUsersData();
    }
}

function initNavigation() {
    $('openSidebar')?.addEventListener('click', () => {
        $('sidebar')?.classList.add('active');
        $('menuOverlay')?.classList.add('active');
    });
    const closeNav = () => {
        $('sidebar')?.classList.remove('active');
        $('menuOverlay')?.classList.remove('active');
    };
    $('closeSidebar')?.addEventListener('click', closeNav);
    $('menuOverlay')?.addEventListener('click', closeNav);
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const section = link.dataset.section;
            if (section) { e.preventDefault(); switchSection(section); closeNav(); }
        });
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(lnk => lnk.classList.remove('active-link'));
    if ($(sectionId)) $(sectionId).classList.add('active');
    const activeBtn = Array.from(document.querySelectorAll('.nav-link')).find(l => l.dataset.section === sectionId);
    if (activeBtn) activeBtn.classList.add('active-link');
    // ★ Admin Users section එකට යනකොට data auto-load කරන්න
    if (sectionId === 'adminUsersSection') loadAdminUsers();
}

// ==========================================
// 2. USERS
// ==========================================
async function loadUsersData() {
    try {
        const querySnap = await getDocs(collection(db, 'users'));
        loadedUsers = [];
        querySnap.forEach(docSnap => { loadedUsers.push({ id: docSnap.id, ...docSnap.data() }); });
        renderUsersList();
    } catch (err) { console.error(err); showToast('Users ලෝඩ් කිරීමේදී දෝෂයක්', 'error'); }
}

function renderUsersList() {
    const container = $('usersContainer');
    if (!container) return;
    const searchTerm = $('userSearchInput')?.value.toLowerCase().trim() || '';
    container.innerHTML = '';
    const filtered = loadedUsers.filter(u => {
        const userRole = (u.role || 'student').toLowerCase();
        const matchesRole = userRole === activeUserRoleTab;
        const matchesSearch = (u.fullName || u.displayName || u.name || '').toLowerCase().includes(searchTerm) ||
                              (u.email || '').toLowerCase().includes(searchTerm) ||
                              (u.indexNo || u.indexNumber || u.indexNum || '').toLowerCase().includes(searchTerm);
        return matchesRole && matchesSearch;
    });
    if (filtered.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); padding:15px;">මෙම කොටසේ (${activeUserRoleTab}) පාවිච්චි කරන්නන් හමුනොවුණි.</p>`;
        return;
    }
    const fragment = document.createDocumentFragment();
    filtered.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card';
        const name = user.displayName || user.fullName || user.name || 'Unnamed User';
        const index = user.indexNo || user.indexNum || user.indexNumber || 'N/A';
        const className = user.studentClass || user.className || user.class || 'N/A';
        card.innerHTML = `
            <div class="user-card-top" style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
                <div class="user-avatar" style="width:40px; height:40px; border-radius:50%; background:#ffd966; color:#000; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                    ${(name[0] || 'U').toUpperCase()}
                </div>
                <div class="user-info">
                    <h4 style="margin:0;">${name}</h4>
                    <small style="color:gray;">${user.email || 'No email'}</small>
                </div>
            </div>
            <div class="user-details" style="font-size:14px; margin-bottom:12px; line-height:1.6;">
                <div><strong>Index Num:</strong> ${index}</div>
                <div><strong>Class:</strong> ${className}</div>
                <div><strong>Status:</strong> ${user.disabled ? '<span style="color:#ef4444; font-weight:bold;">Disabled</span>' : '<span style="color:#10b981; font-weight:bold;">Active</span>'}</div>
            </div>
            <div class="user-actions" style="display:flex; gap:10px;">
                <button class="btn ${user.disabled ? 'btn-ghost' : 'btn-danger'} btn-toggle-user" data-id="${user.id}" data-disabled="${user.disabled}">${user.disabled ? 'Enable' : 'Disable'}</button>
                <button class="btn btn-danger btn-delete-user" data-id="${user.id}"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
        `;
        fragment.appendChild(card);
    });
    container.appendChild(fragment);
    container.querySelectorAll('.btn-toggle-user').forEach(btn => {
        btn.addEventListener('click', () => toggleUserStatus(btn.dataset.id, btn.dataset.disabled === 'true'));
    });
    container.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', () => deleteUserAccount(btn.dataset.id));
    });
}

$('tabStudents')?.addEventListener('click', () => {
    activeUserRoleTab = 'student';
    $('tabStudents').classList.add('active');$('tabTeachers')?.classList.remove('active');
    renderUsersList();
});
$('tabTeachers')?.addEventListener('click', () => {
    activeUserRoleTab = 'teacher';
    $('tabTeachers').classList.add('active');$('tabStudents')?.classList.remove('active');
    renderUsersList();
});
$('userSearchInput')?.addEventListener('input', renderUsersList);

async function toggleUserStatus(userId, currentDisabled) {
    try {
        await updateDoc(doc(db, 'users', userId), { disabled: !currentDisabled });
        showToast('පරිශීලක තත්ත්වය යාවත්කාලීන විය', 'ok');
        loadUsersData();
    } catch (err) { showToast(err.message, 'error'); }
}

async function deleteUserAccount(userId) {
    if (!confirm('මෙම User සහ අදාළ ai Messages සියල්ල ඉවත් කිරීමට තහවුරු කරන්න?')) return;
    try {
        await deleteDoc(doc(db, 'users', userId));
        const aiSnap = await getDocs(query(collection(db, 'ai'), where('userId', '==', userId)));
        if (!aiSnap.empty) {
            let batch = writeBatch(db);
            let count = 0;
            aiSnap.forEach((aiDoc) => {
                batch.delete(doc(db, 'ai', aiDoc.id));
                count++;
                if (count === 400) { batch.commit(); batch = writeBatch(db); count = 0; }
            });
            if (count > 0) await batch.commit();
        }
        showToast('User සාර්ථකව Delete විය!', 'ok');
        loadUsersData();
    } catch (err) { showToast('Delete අසාර්ථක: ' + err.message, 'error'); }
}

// ==========================================
// 3. NEWS
// ==========================================
function initNewsModule() {
    if ($('newsDate') && !$('newsDate').value) {
        $('newsDate').value = new Date().toISOString().split('T')[0];
    }
    $('newsForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = $('newsId').value;
        const fileInput = $('newsImageFile');
        let imgUrl = $('newsImageUrl')?.value || '';
        try {
            if (fileInput && fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append('image', fileInput.files[0]);
                showToast('ඡායාරූපය Upload වෙමින්...', 'ok');
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                const imgData = await res.json();
                if (imgData.success) imgUrl = imgData.data.display_url || imgData.data.url;
                else throw new Error('Image Upload අසාර්ථකයි');
            }
            const newsObject = {
                title: ($('newsTitle').value || '').trim(),
                category: ($('newsCategory').value || '').trim(),
                date: $('newsDate').value || '',
                imageUrl: imgUrl,
                snippet: ($('newsSnippet').value || '').trim(),
                isFeatured: $('newsIsFeatured').value || 'no',
                showInHome: $('newsShowInHome').value || 'yes',
                readMoreLink: ($('newsReadMoreLink').value || '').trim(),
                updatedAt: new Date().toISOString()
            };
            if (id) {
                await updateDoc(doc(db, 'news', id), newsObject);
                showToast('News යාවත්කාලීන විය!', 'ok');
            } else {
                newsObject.views = 0;
                newsObject.createdAt = serverTimestamp();
                await addDoc(collection(db, 'news'), newsObject);
                showToast('News පලකෙරිණි!', 'ok');
            }
            $('newsForm').reset();
            $('newsId').value = '';
            if ($('newsImageUrl')) $('newsImageUrl').value = '';
            if ($('imagePreviewBox')) $('imagePreviewBox').innerHTML = '';
            if ($('newsDate')) $('newsDate').value = new Date().toISOString().split('T')[0];
            loadNewsList();
        } catch (err) {
            console.error('News save error:', err);
            showToast('News Save දෝෂයක්: ' + err.message, 'error');
        }
    });
    loadNewsList();
}

async function loadNewsList() {
    const container = $('newsListContainer');
    if (!container) return;
    try {
        const snap = await getDocs(collection(db, 'news'));
        container.innerHTML = '';
        if (snap.empty) {
            container.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding:20px;">පලකළ පුවත් කිසිවක් නැත.</p>';
            return;
        }
        const fragment = document.createDocumentFragment();
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const viewsCount = (data.views !== undefined && data.views !== null) ? data.views : 0;
            const card = document.createElement('div');
            card.className = 'news-card';
            card.innerHTML = `
                <div class="news-card-img-wrapper">
                    ${data.imageUrl ? `<img src="${data.imageUrl}" alt="${data.title || 'News'}" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'news-card-placeholder\\'><i class=\\'fa-solid fa-newspaper\\'></i></div>';" />` : `<div class="news-card-placeholder"><i class="fa-solid fa-newspaper"></i></div>`}
                </div>
                <div class="news-card-body">
                    <div class="news-card-meta" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px;">
                        <span><i class="fa-solid fa-calendar-days"></i> ${data.date || 'No Date'} | ${data.category || 'General'}</span>
                        <span class="news-views-badge" style="background:rgba(255,217,102,0.15); color:#ffd966; padding:2px 8px; border-radius:12px; font-size:12px;"><i class="fa-solid fa-eye"></i> ${viewsCount}</span>
                    </div>
                    <h4 title="${data.title || ''}" style="margin:8px 0;">${data.title || 'Untitled'}</h4>
                    <p class="news-snippet" style="color:var(--text-muted); font-size:13px; line-height:1.5;">${data.snippet || ''}</p>
                    <div style="margin-top:8px; font-size:12px; color:#888;">
                        ${data.isFeatured === 'yes' ? '<span style="color:#ffd966;"><i class="fa-solid fa-star"></i> Featured</span>' : ''}
                        ${data.showInHome === 'yes' ? '<span style="color:#10b981; margin-left:8px;"><i class="fa-solid fa-house"></i> Home</span>' : ''}
                    </div>
                    <div class="news-actions" style="margin-top:12px; display:flex; gap:8px;">
                        <button class="btn btn-ghost btn-edit-news" data-id="${docSnap.id}" style="padding:4px 12px; font-size:13px;"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn btn-danger btn-delete-news" data-id="${docSnap.id}" style="padding:4px 12px; font-size:13px;"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });
        container.appendChild(fragment);

        container.querySelectorAll('.btn-edit-news').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const docSnap = await getDoc(doc(db, 'news', btn.dataset.id));
                    if (docSnap.exists()) {
                        const d = docSnap.data();
                        $('newsId').value = docSnap.id;
                        $('newsTitle').value = d.title || '';
                        $('newsCategory').value = d.category || '';
                        $('newsDate').value = d.date || '';
                        $('newsSnippet').value = d.snippet || '';
                        $('newsIsFeatured').value = d.isFeatured || 'no';
                        $('newsShowInHome').value = d.showInHome || 'yes';
                        $('newsReadMoreLink').value = d.readMoreLink || '';
                        if ($('newsImageUrl')) $('newsImageUrl').value = d.imageUrl || '';
                        if ($('imagePreviewBox')) $('imagePreviewBox').innerHTML = d.imageUrl ? `<img src="${d.imageUrl}" style="max-height:80px; border-radius:4px; margin-top:5px;" />` : '';
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        showToast('News Edit mode', 'ok');
                    }
                } catch (err) { showToast('Edit දෝෂයක්: ' + err.message, 'error'); }
            });
        });

        container.querySelectorAll('.btn-delete-news').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('News එක Delete කිරීමට තහවුරු කරන්න?')) {
                    try {
                        await deleteDoc(doc(db, 'news', btn.dataset.id));
                        showToast('Delete විය', 'ok');
                        loadNewsList();
                    } catch (err) { showToast('Delete දෝෂයක්: ' + err.message, 'error'); }
                }
            });
        });
    } catch (err) {
        console.error('Error loading news list:', err);
        container.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:20px;">ලෝඩ් කිරීමේ දෝෂයක්: ${err.message}</p>`;
    }
}
// ==========================================
// 4. EXAMS (O/L, A/L National) — Google Sheet Links
// ==========================================
function initExamsModule() {
    const container = $('examButtonsContainer');
    if (!container) return;

    const links = [
        {
            label: 'Edit O/L Results',
            url: 'https://docs.google.com/spreadsheets/d/15LFm1voMhABzehIGzlrvGgmatgcNE1OKt1ydiyqWpVU/edit?usp=drivesdk',
            icon: 'fa-graduation-cap'
        },
        {
            label: 'Edit A/L Results',
            url: 'https://docs.google.com/spreadsheets/d/1n3lZO20WvCZAl58FIVAyDhz3GWTgVN3OwWPAOfQJz6g/edit?usp=drivesdk',
            icon: 'fa-user-graduate'
        }
    ];

    container.innerHTML = links.map(item => `
        <a href="${item.url}" target="_blank" class="btn btn-primary" style="display:flex; align-items:center; gap:10px; padding:12px 20px; font-weight:bold; font-size:15px; text-decoration:none; margin-bottom:12px; border-radius:8px;">
            <i class="fa-solid ${item.icon}"></i> ${item.label}
        </a>
    `).join('');
}
// ==========================================
// 5. TERM TEST MANAGE
// ==========================================
let parsedSheetStudents = [];
let currentMeta = {};

function initTermTestModule() {
    const streamBox = $('streamFieldBox');
    const ttGrade = $('ttGrade');
    const ttForm = $('termTestForm');

    ttGrade?.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (streamBox) streamBox.style.display = (val === 12 || val === 13) ? 'block' : 'none';
    });

    ttForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = $('ttSheetUrl').value.trim();
        if (!url) return;
        currentMeta = {
            year: $('ttYear').value, term: $('ttTerm').value, grade: $('ttGrade').value,
            class: $('ttClass').value,
            stream: (parseInt($('ttGrade').value) >= 12) ? $('ttStream').value : '',
            sheetUrl: url
        };
        const btn = $('btnFetchSheet');
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Reading Google Sheet...`;
        try {
            parsedSheetStudents = await fetchAndParseGoogleSheet(url);
            renderSheetPreview(parsedSheetStudents);
            showToast('Sheet සාර්ථකව Read විය!', 'ok');
        } catch (err) {
            console.error(err);
            showToast('Read අසාර්ථකයි: ' + err.message, 'error');
            if ($('ttPreviewContainer')) $('ttPreviewContainer').style.display = 'none';
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Auto Read & Preview Sheet`;
        }
    });

    $('btnUploadToFirestore')?.addEventListener('click', async () => {
        if (!parsedSheetStudents || parsedSheetStudents.length === 0) {
            showToast('Upload කිරීමට Data හමු නොවුණි!', 'error');
            return;
        }
        const uploadBtn = $('btnUploadToFirestore');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving ${parsedSheetStudents.length}...`;
        try {
            const sheetRef = await addDoc(collection(db, 'term-test-results'), {
                ...currentMeta, studentCount: parsedSheetStudents.length, createdAt: new Date().toISOString()
            });
            const BATCH_SIZE = 400;
            let batch = writeBatch(db);
            let countInBatch = 0;
            let totalSaved = 0;
            for (let i = 0; i < parsedSheetStudents.length; i++) {
                const student = parsedSheetStudents[i];
                const newStudentRef = doc(collection(db, 'term-test-student-results'));
                batch.set(newStudentRef, {
                    sheetId: sheetRef.id, year: currentMeta.year, term: currentMeta.term,
                    grade: currentMeta.grade, class: currentMeta.class, stream: currentMeta.stream,
                    indexNumber: student.indexNumber, name: student.name, total: student.total,
                    average: student.average, position: student.position, results: student.results,
                    createdAt: new Date().toISOString()
                });
                countInBatch++; totalSaved++;
                if (countInBatch === BATCH_SIZE || i === parsedSheetStudents.length - 1) {
                    await batch.commit(); batch = writeBatch(db); countInBatch = 0;
                }
                const tr = document.getElementById(`tr-student-${i}`);
                if (tr) {
                    tr.classList.add('uploaded-row');
                    const statusTd = tr.querySelector('.status-cell');
                    if (statusTd) statusTd.innerHTML = `<span class="status-pill saved"><i class="fa-solid fa-check"></i> Saved</span>`;
                }
            }
            showToast(`${totalSaved} Records Save විය!`, 'ok');
            ttForm.reset();
            loadTermTestList();
        } catch (err) {
            console.error('Batch Upload Error:', err);
            showToast('Save දෝෂයක්: ' + err.message, 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Add to Firestore`;
        }
    });
    loadTermTestList();
}

function parseFullCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i += 2; }
                else { inQuotes = false; i++; }
            } else { field += c; i++; }
        } else {
            if (c === '"') { inQuotes = true; i++; }
            else if (c === ',') { row.push(field); field = ''; i++; }
            else if (c === '\r') {
                if (text[i + 1] === '\n') i++;
                row.push(field);
                if (row.some(f => String(f).trim() !== '')) rows.push(row);
                row = []; field = ''; i++;
            }
            else if (c === '\n') {
                row.push(field);
                if (row.some(f => String(f).trim() !== '')) rows.push(row);
                row = []; field = ''; i++;
            }
            else { field += c; i++; }
        }
    }
    if (field !== '' || row.length > 0) {
        row.push(field);
        if (row.some(f => String(f).trim() !== '')) rows.push(row);
    }
    return rows.map(r => r.map(cell => 
        String(cell).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
    ));
}

async function fetchAndParseGoogleSheet(sheetUrl) {
    const matches = sheetUrl.match(/\/d\/([a-zA-Z0-9\-_]+)/i);
    if (!matches || !matches[1]) throw new Error('අවලංගු Google Sheet Link එකකි!');
    const spreadsheetId = matches[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=mark%20sheet`;
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('Sheet එක Share කර "Anyone with the link can view" ද බලන්න.');
    const csvText = await response.text();
    const rows = parseFullCSV(csvText);
    return parseRowsToStudentResults(rows);
}

function parseRowsToStudentResults(rows) {
    if (rows.length < 2) throw new Error('Sheet එකේ දත්ත නොමැත!');
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i].map(c => String(c).toLowerCase());
        const hasIndex = row.some(c => c.includes('index') || c.includes('විභාග අංකය') || c.includes('අංකය'));
        const hasName = row.some(c => c.includes('name') || c.includes('නම'));
        if (hasIndex && hasName) { headerRowIdx = i; break; }
    }
    if (headerRowIdx === -1) throw new Error('Header row සොයාගත නොහැක. "Index" සහ "Name" columns තියෙන්න ඕන.');

    const row1 = rows[headerRowIdx] || [];
    const row2 = (headerRowIdx + 1 < rows.length) ? rows[headerRowIdx + 1] : [];
    let indexColIdx = row1.findIndex(c => {
        const l = String(c).toLowerCase();
        return l.includes('index') || l.includes('විභාග අංකය') || l.includes('අංකය');
    });
    if (indexColIdx === -1) {
        indexColIdx = row2.findIndex(c => {
            const l = String(c).toLowerCase();
            return l.includes('index') || l.includes('විභාග අංකය') || l.includes('අංකය');
        });
    }
    let isRow2Header = false;
    if (indexColIdx !== -1 && row2[indexColIdx] !== undefined && String(row2[indexColIdx]).trim() === '') {
        const row2NonEmpty = row2.filter(c => String(c).trim() !== '').length;
        const row1NonEmpty = row1.filter(c => String(c).trim() !== '').length;
        if (row2NonEmpty >= row1NonEmpty * 0.5) isRow2Header = true;
    }

    const colMap = { index: -1, name: -1, total: -1, average: -1, position: -1, subjects: [] };
    const maxCols = Math.max(row1.length, isRow2Header ? row2.length : 0);

    for (let i = 0; i < maxCols; i++) {
        const val1 = row1[i] ? String(row1[i]).trim() : '';
        const val2 = (isRow2Header && row2[i]) ? String(row2[i]).trim() : '';
        let colName = val2 !== '' ? val2 : val1;
        if (val1 !== '' && val2 !== '' && val1 !== val2) {
            colName = `${val1} ${val2}`;
        }
        if (!colName) continue;
        const lower = colName.toLowerCase();

        if (lower.includes('index') || lower.includes('විභාග අංකය') || lower.includes('අංකය')) {
            colMap.index = i;
        } else if (lower.includes('name') || lower.includes('නම')) {
            colMap.name = i;
        } else if (lower.includes('total') || lower.includes('එකතුව')) {
            colMap.total = i;
        } else if (lower.includes('average') || lower.includes('avg') || lower.includes('සාමාන්‍ය')) {
            colMap.average = i;
        } else if (lower.includes('position') || lower.includes('rank') || lower.includes('place') || lower.includes('ස්ථානය')) {
            colMap.position = i;
        } else {
            const ignored = ['bucket', 'main subject', 'main subjects', 'optional', 'result', 'grade', 'class', 'stream'];
            const skip = ignored.some(k => {
                if (k === 'main subject' || k === 'main subjects') {
                    return lower === k;
                }
                return lower === k || lower.startsWith(k + ' ');
            });
            if (!skip && i !== colMap.index && i !== colMap.name && colName.length > 0) {
                colMap.subjects.push({ index: i, name: colName });
            }
        }
    }

    if (colMap.index === -1 || colMap.name === -1) throw new Error('Index/Name columns හඳුනාගත නොහැක.');

    const students = [];
    const dataStartRow = isRow2Header ? headerRowIdx + 2 : headerRowIdx + 1;

    for (let i = dataStartRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const indexNum = row[colMap.index] ? String(row[colMap.index]).trim() : '';
        const name = row[colMap.name] ? String(row[colMap.name]).trim() : '';
        if (!indexNum || indexNum === '' || indexNum.toLowerCase().includes('index') || 
            indexNum.toLowerCase().includes('total') || !/^\d+/.test(indexNum)) continue;

        const results = {};
        colMap.subjects.forEach(sub => {
            const mark = row[sub.index] ? String(row[sub.index]).trim() : '';
            if (mark !== '' && mark !== '-' && mark !== '--') {
                results[sub.name] = mark;
            }
        });
        const total = colMap.total !== -1 && row[colMap.total] ? String(row[colMap.total]).trim() : '';
        const average = colMap.average !== -1 && row[colMap.average] ? String(row[colMap.average]).trim() : '';
        const position = colMap.position !== -1 && row[colMap.position] ? String(row[colMap.position]).trim() : '';
        students.push({ indexNumber: indexNum, name, total, average, position, results });
    }
    return students;
}

function renderSheetPreview(students) {
    const container = $('ttPreviewContainer');
    const tbody = $('ttPreviewBody');
    const summary = $('ttParsedSummary');
    if (!container || !tbody) return;
    tbody.innerHTML = '';
    if (summary) summary.textContent = `Total Students Found: ${students.length}`;
    const fragment = document.createDocumentFragment();
    students.forEach((s, idx) => {
        const tr = document.createElement('tr');
        tr.id = `tr-student-${idx}`;
        let resultsHTML = '<div class="results-tag-box">';
        for (const [sub, mark] of Object.entries(s.results)) {
            const isAB = String(mark).toUpperCase() === 'AB';
            resultsHTML += `<div class="sub-tag" ${isAB ? 'style="color:#a78bfa; border-color:#a78bfa;"' : ''}>${sub}: <span>${mark}</span></div>`;
        }
        resultsHTML += '</div>';
        let statsHTML = '<div style="margin-top: 5px; font-size: 0.85rem; color: #10b981;">';
        if (s.total) statsHTML += `<strong>Total:</strong> ${s.total} &nbsp; `;
        if (s.average) statsHTML += `<strong>Avg:</strong> ${s.average} &nbsp; `;
        if (s.position) statsHTML += `<strong>Rank:</strong> ${s.position}`;
        statsHTML += '</div>';
        tr.innerHTML = `
            <td style="font-weight: 800; color: #60a5fa;">${s.indexNumber}</td>
            <td style="font-weight: 600;">${s.name || 'N/A'}</td>
            <td>${resultsHTML}${statsHTML}</td>
            <td class="status-cell" style="text-align: center;"><span class="status-pill">Pending</span></td>
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function loadTermTestList() {
    const container = $('termTestList');
    if (!container) return;
    try {
        const snap = await getDocs(collection(db, 'term-test-results'));
        container.innerHTML = '';
        if (snap.empty) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem;">Sheets කිසිවක් නොමැත.</p>`;
            return;
        }
        const fragment = document.createDocumentFragment();
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const item = document.createElement('div');
            item.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; padding:12px 16px; background:var(--surface-color); border:1px solid var(--border-color); border-radius:12px;';
            item.innerHTML = `
                <div>
                    <i class="fa-solid fa-file-excel" style="color:#10b981; margin-right:10px; font-size:1.2rem;"></i>
                    <span><strong>${d.year}</strong> | ${d.term} | Grade ${d.grade}-${d.class} ${d.stream ? `(${d.stream})` : ''} <small style="color:var(--text-muted); margin-left:8px;">(${d.studentCount || 0} Students)</small></span>
                </div>
                <div style="display:flex; gap:8px;">
                    <a href="${d.sheetUrl}" target="_blank" class="btn btn-ghost" style="padding:6px 12px; font-size:0.8rem;">Open Sheet</a>
                    <button class="btn btn-danger btn-delete-tt" data-id="${docSnap.id}" style="padding:6px 12px; font-size:0.8rem;"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            fragment.appendChild(item);
        });
        container.appendChild(fragment);
        container.querySelectorAll('.btn-delete-tt').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Delete කිරීමට තහවුරු කරන්න?')) {
                    try {
                        await deleteDoc(doc(db, 'term-test-results', btn.dataset.id));
                        showToast('Delete විය', 'ok');
                        loadTermTestList();
                    } catch (err) { showToast('Delete දෝෂයක්: ' + err.message, 'error'); }
                }
            });
        });
    } catch (err) { console.error(err); }
}

// ==========================================
// 6. DOCUMENTS
// ==========================================
function initDocumentsModule() {
    const docButtonsContainer = $('documentsButtonsContainer');
    if (!docButtonsContainer) return;
    const links = [
        { label: 'Edit Text Book', url: 'https://docs.google.com/spreadsheets/d/1WZ13wzcv_Ca7u3ohBZnLgEUrs7h7wgQBo83-A-n4Ne0/edit?usp=drivesdk', icon: 'fa-book' },
        { label: "Edit Teacher's Guide", url: 'https://docs.google.com/spreadsheets/d/1eOlkqUHWBo_PT9rc9IdwPaQtBWcBQ_pK2Z3g7XTqRXM/edit?usp=drivesdk', icon: 'fa-chalkboard-user' },
        { label: 'Edit Short Notes', url: 'https://docs.google.com/spreadsheets/d/1FuK5JY1SP33OOrACsoFxC5WyZYqbyj_Q4-K4C54TEv4/edit?usp=drivesdk', icon: 'fa-note-sticky' },
        { label: 'Edit Application', url: 'https://docs.google.com/spreadsheets/d/19zyl4ZulZc8iTbodIEosWaJlZgFLn3SVqIomV_9tP5o/edit?usp=drivesdk', icon: 'fa-file-lines' }
    ];
    docButtonsContainer.innerHTML = links.map(item => `
        <a href="${item.url}" target="_blank" class="btn btn-primary" style="display:flex; align-items:center; gap:10px; padding:12px 20px; font-weight:bold; font-size:15px; text-decoration:none; margin-bottom:12px; border-radius:8px;">
            <i class="fa-solid ${item.icon}"></i> ${item.label}
        </a>
    `).join('');
}

// ==========================================
// 7. GEMINI
// ==========================================
function initGeminiModule() {
    $('geminiKeyForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const keyVal = $('geminiKeyInput').value.trim();
        if (!keyVal) return;
        try {
            await addDoc(collection(db, 'api'), { apiKey: keyVal, createdAt: new Date().toISOString() });
            showToast('API Key Save විය!', 'ok');
            $('geminiKeyInput').value = '';
            loadGeminiKeys();
        } catch (err) { showToast(err.message, 'error'); }
    });
    loadGeminiKeys();
}

async function loadGeminiKeys() {
    const container = $('geminiKeysContainer');
    if (!container) return;
    try {
        const snap = await getDocs(collection(db, 'api'));
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const keyMasked = d.apiKey ? `${d.apiKey.substring(0, 8)}••••••••••••` : 'API Key';
            const card = document.createElement('div');
            card.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; padding:10px; border:1px solid var(--border-color); border-radius:6px;';
            card.innerHTML = `
                <div><i class="fa-solid fa-key" style="color:#ffd966; margin-right:8px;"></i><span>${keyMasked}</span></div>
                <button class="btn btn-danger btn-delete-key" data-id="${docSnap.id}" style="padding:4px 10px;"><i class="fa-solid fa-trash"></i></button>
            `;
            fragment.appendChild(card);
        });
        container.appendChild(fragment);
        container.querySelectorAll('.btn-delete-key').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Delete කිරීමට තහවුරු කරන්න?')) {
                    await deleteDoc(doc(db, 'api', btn.dataset.id));
                    showToast('Key Delete විය', 'ok');
                    loadGeminiKeys();
                }
            });
        });
    } catch (err) { console.error(err); }
}

// ==========================================
// 8. TERM TEST — ANALYSIS (SHEETS FROM UI) + PDF
// ==========================================
let olCharts = { pf: null, grade: null };
let alCharts = { pf: null, grade: null };
let olAnalysisData = null;
let alAnalysisData = null;

function calcGrade(m) {
    if (m === undefined || m === null) return 'W';
    const s = String(m).trim().toUpperCase();
    if (!s) return 'W';
    if (s === 'AB' || s === 'ABS' || s === 'ABSENT') return 'AB';
    if (s === 'A' || s === 'B' || s === 'C' || s === 'S') return s;
    if (s === 'W' || s === 'F' || s === 'FAIL') return 'W';
    const x = parseFloat(s);
    if (isNaN(x)) return 'W';
    if (x >= 75) return 'A';
    if (x >= 65) return 'B';
    if (x >= 55) return 'C';
    if (x >= 35) return 'S';
    return 'W';
}
function isPassGrade(g) { return g === 'A' || g === 'B' || g === 'C' || g === 'S'; }
function isCreditGrade(g) { return g === 'A' || g === 'B' || g === 'C'; }

function getSubjects(resultsObj) {
    if (!resultsObj) return [];
    return Object.entries(resultsObj).filter(([s]) => {
        const k = String(s).toLowerCase().trim();
        if (k === 'grade' || k === 'class' || k === 'stream' || k === 'position') return false;
        if (k === 'total' || k === 'average' || k === 'avg' || k === 'result') return false;
        if (k.startsWith('grade ') || k.startsWith('class ')) return false;
        return true;
    });
}

function normalizeSubject(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isMathsSubject(name) {
    const compact = normalizeSubject(name).replace(/[\s\.\-_\(\)&]+/g, '');
    if (!compact) return false;
    if (compact === 'maths' || compact === 'math' || compact === 'mathematics' || compact === 'mathamatics') return true;
    if (compact.includes('mathematics')) return true;
    if (compact.includes('maths')) return true;
    if (compact.startsWith('math')) return true;
    if (compact.includes('ගණිත')) return true;
    return false;
}

function isSinhalaLit(name) {
    const compact = normalizeSubject(name).replace(/[\s\.\-_\(\)&]+/g, '');
    if (!compact) return false;
    if (!compact.includes('sinhala') && !compact.includes('සිංහල')) return false;
    return compact.includes('literature') || 
           compact.includes('lit') ||
           compact.includes('සාහිත්‍ය') || 
           compact.includes('සාහිත');
}

function isTamilLit(name) {
    const compact = normalizeSubject(name).replace(/[\s\.\-_\(\)&]+/g, '');
    if (!compact) return false;
    if (!compact.includes('tamil') && !compact.includes('දෙමළ')) return false;
    return compact.includes('literature') || 
           compact.includes('lit') ||
           compact.includes('සාහිත්‍ය') || 
           compact.includes('සාහිත');
}

function isMotherTongueSubject(name) {
    const compact = normalizeSubject(name).replace(/[\s\.\-_\(\)&]+/g, '');
    if (!compact) return false;
    const hasSinhala = compact.includes('sinhala') || compact.includes('සිංහල');
    const hasTamil = compact.includes('tamil') || compact.includes('දෙමළ');
    if (!hasSinhala && !hasTamil) return false;
    if (isSinhalaLit(name) || isTamilLit(name)) return false;
    return true;
}

function isAlExcludedSubject(name) {
    const compact = normalizeSubject(name).replace(/[\s\.\-_\(\)&]+/g, '');
    if (!compact) return false;
    if (compact.includes('generalinformationtechnology')) return true;
    if (compact === 'git') return true;
    if (compact.includes('generalenglish')) return true;
    if (compact === 'english' || compact === 'englishlanguage') return true;
    if (compact.includes('englishliterature')) return true;
    return false;
}

function checkOlPass(subjects) {
    const graded = subjects.map(([name, mark]) => ({
        name, mark, grade: calcGrade(mark)
    }));

    const passes  = graded.filter(g => isPassGrade(g.grade));
    const credits = graded.filter(g => isCreditGrade(g.grade));

    const maths  = graded.find(g => isMathsSubject(g.name));
    const mother = graded.find(g => isMotherTongueSubject(g.name));

    const mathsOk  = !maths  ? true : isPassGrade(maths.grade);
    const motherOk = !mother ? true : isPassGrade(mother.grade);

    const pass = passes.length >= 6 && credits.length >= 3 && mathsOk && motherOk;
    const aCount = graded.filter(g => g.grade === 'A').length;

    let reason = '';
    if (pass) {
        reason = `Passed (${passes.length}P, ${credits.length}C)`;
    } else {
        const fails = [];
        if (passes.length < 6) fails.push(`P:${passes.length}/6`);
        if (credits.length < 3) fails.push(`C:${credits.length}/3`);
        if (maths && !mathsOk) fails.push('Maths✗');
        if (mother && !motherOk) fails.push('Mother✗');
        reason = `Failed (${fails.join(', ')})`;
    }

    return { pass, aCount, passes: passes.length, credits: credits.length, mathsOk, motherOk, reason };
}

function checkAlPass(subjects) {
    const mainSubjects = subjects.filter(([name]) => !isAlExcludedSubject(name));
    const sPasses = mainSubjects.filter(([, mark]) => isPassGrade(calcGrade(mark)));
    const aCount = mainSubjects.filter(([, mark]) => calcGrade(mark) === 'A').length;
    return {
        pass: sPasses.length >= 3,
        count: sPasses.length,
        aCount,
        reason: `Main S-passes: ${sPasses.length}/3`
    };
}

function initTermAnalysisModule() {
    document.getElementById('btnTestResult')?.addEventListener('click', async () => {
        const year = document.getElementById('testYear')?.value.trim();
        const term = document.getElementById('testTerm')?.value;
        const grade = document.getElementById('testGrade')?.value;
        const cls = document.getElementById('testClass')?.value;
        const idx = document.getElementById('testIndex')?.value.trim();
        const out = document.getElementById('testResultOutput');
        if (!out) return;
        if (!year || !term || !grade) { showToast('Please fill Year/Term/Grade', 'error'); return; }
        out.style.display = 'block';
        out.innerHTML = `<div class="test-empty-msg"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>`;
        try {
            const filters = [where('year', '==', String(year)), where('term', '==', term), where('grade', '==', String(grade))];
            if (cls) filters.push(where('class', '==', cls));
            if (idx) filters.push(where('indexNumber', '==', idx));
            const snap = await getDocs(query(collection(db, 'term-test-student-results'), ...filters));
            if (snap.empty) {
                out.innerHTML = `<div class="test-empty-msg"><i class="fa-solid fa-circle-info"></i> No records found.</div>`;
                return;
            }
            const docs = snap.docs.map(d => d.data());
            const student = idx ? docs[0] : docs[Math.floor(Math.random() * docs.length)];
            const results = student.results || {};
            const subjects = getSubjects(results);
            const gradeNum = parseInt(student.grade);
            let passStatus = 'N/A', statusText = 'Pass/Fail calculation available for O/L & A/L only';
            if (gradeNum === 10 || gradeNum === 11) {
                const r = checkOlPass(subjects);
                passStatus = r.pass ? 'PASS' : 'FAIL';
                statusText = r.reason;
            } else if (gradeNum === 12 || gradeNum === 13) {
                const r = checkAlPass(subjects);
                passStatus = r.pass ? 'PASS' : 'FAIL';
                statusText = r.reason;
            }
            const subjHTML = subjects.map(([sub, marks]) => {
                const g = calcGrade(marks);
                return `<div class="test-result-subject"><span class="sub-name">${sub}</span><span><span class="sub-marks">${marks}</span><span class="sub-grade grade-${g}">${g}</span></span></div>`;
            }).join('');
            out.innerHTML = `
                <div class="test-result-header">
                    <div>
                        <h4><i class="fa-solid fa-user-graduate"></i> ${student.name || 'Unknown'}</h4>
                        <p style="color:var(--text-muted); font-size:0.82rem; margin-top:4px;">Index: ${student.indexNumber || '—'} • Grade ${student.grade || '—'} - Class ${student.class || '—'}</p>
                    </div>
                    <span class="test-result-pill ${passStatus === 'PASS' ? 'pill-pass' : passStatus === 'FAIL' ? 'pill-fail' : ''}">${passStatus}</span>
                </div>
                <div class="test-result-grid">
                    <div class="tr-item">Year<strong>${student.year || '—'}</strong></div>
                    <div class="tr-item">Term<strong>${student.term || '—'}</strong></div>
                    <div class="tr-item">Total<strong>${student.total || '—'}</strong></div>
                    <div class="tr-item">Average<strong>${student.average || '—'}</strong></div>
                    <div class="tr-item">Position<strong>${student.position || '—'}</strong></div>
                    <div class="tr-item">Status<strong style="color:${passStatus === 'PASS' ? '#34d399' : passStatus === 'FAIL' ? '#f87171' : '#94a3b8'}">${statusText}</strong></div>
                </div>
                <div class="test-result-subjects">${subjHTML}</div>
            `;
            showToast(`Loaded for ${student.name || student.indexNumber}`, 'ok');
        } catch (err) { out.innerHTML = `<div class="test-empty-msg" style="color:#f87171;">${err.message}</div>`; }
    });

    initClassSheetRows('ol');
    initClassSheetRows('al');

    document.getElementById('btnAddOlClass')?.addEventListener('click', () => addClassSheetRow('ol', ''));
    document.getElementById('btnAddAlClass')?.addEventListener('click', () => addClassSheetRow('al', ''));
    document.getElementById('btnGenerateOl')?.addEventListener('click', generateOlAnalysis);
    document.getElementById('btnGenerateAl')?.addEventListener('click', generateAlAnalysis);
    document.getElementById('btnSaveOl')?.addEventListener('click', () => saveAnalysis('ol'));
    document.getElementById('btnSaveAl')?.addEventListener('click', () => saveAnalysis('al'));
    document.getElementById('btnPdfPreviewOl')?.addEventListener('click', () => exportPdf('ol'));
    document.getElementById('btnPdfPreviewAl')?.addEventListener('click', () => exportPdf('al'));

    document.getElementById('tabOlAnalysis')?.addEventListener('click', () => {
        document.getElementById('tabOlAnalysis').classList.add('active');
        document.getElementById('tabAlAnalysis').classList.remove('active');
        document.getElementById('olAnalysisPanel').style.display = 'block';
        document.getElementById('alAnalysisPanel').style.display = 'none';
    });
    document.getElementById('tabAlAnalysis')?.addEventListener('click', () => {
        document.getElementById('tabAlAnalysis').classList.add('active');
        document.getElementById('tabOlAnalysis').classList.remove('active');
        document.getElementById('alAnalysisPanel').style.display = 'block';
        document.getElementById('olAnalysisPanel').style.display = 'none';
    });
}

function initClassSheetRows(mode) {
    const defaultClasses = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    defaultClasses.forEach(cls => addClassSheetRow(mode, cls));
}

function addClassSheetRow(mode, className = '') {
    const container = document.getElementById(`${mode}ClassSheetsContainer`);
    if (!container) return;
    const gradeOpts = mode === 'ol'
        ? `<option value="10">Grade 10</option><option value="11" selected>Grade 11</option>`
        : `<option value="12">Grade 12</option><option value="13" selected>Grade 13</option>`;
    const row = document.createElement('div');
    row.className = `class-sheet-row ${mode}-class-row`;
    row.innerHTML = `
        <input type="text" class="custom-input class-letter-input" placeholder="Class" value="${className}" maxlength="5" />
        <select class="custom-select class-grade-select">${gradeOpts}</select>
        <input type="url" class="custom-input class-sheet-url" placeholder="Paste Google Sheet link here..." />
        <button type="button" class="btn btn-danger btn-remove-class"><i class="fa-solid fa-trash"></i></button>
    `;
    container.appendChild(row);
    row.querySelector('.btn-remove-class').addEventListener('click', () => row.remove());
}

function collectClassSheets(mode) {
    const rows = document.querySelectorAll(`#${mode}ClassSheetsContainer .${mode}-class-row`);
    const result = [];
    rows.forEach(row => {
        const cls = row.querySelector('.class-letter-input').value.trim();
        const grade = row.querySelector('.class-grade-select').value;
        const url = row.querySelector('.class-sheet-url').value.trim();
        if (cls && url) result.push({ cls, grade, url });
    });
    return result;
}

async function readAllSheets(classes, gradeDefaultMap) {
    const results = await Promise.allSettled(
        classes.map(async item => {
            const students = await fetchAndParseGoogleSheet(item.url);
            return { item, students };
        })
    );

    const allStudents = [];
    const sheetStatus = [];

    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const item = classes[i];
        const grade = item.grade || gradeDefaultMap;
        if (r.status === 'fulfilled') {
            const students = r.value.students;
            students.forEach(s => { s.class = item.cls; s.grade = grade; });
            allStudents.push(...students);
            sheetStatus.push({ cls: item.cls, grade, ok: true, count: students.length });
        } else {
            const err = r.reason?.message || String(r.reason) || 'Unknown error';
            sheetStatus.push({ cls: item.cls, grade, ok: false, error: err });
        }
    }
    return { allStudents, sheetStatus };
}

async function generateOlAnalysis() {
    const year = document.getElementById('olAnalysisYear').value.trim();
    const term = document.getElementById('olAnalysisTerm').value;
    const gradeFilter = document.getElementById('olAnalysisGrade').value;
    if (!year) { showToast('Year එක type කරන්න!', 'error'); return; }
    const classes = collectClassSheets('ol');
    if (!classes.length) { showToast('අවම වශයෙන් එක Class Sheet එකක් add කරන්න!', 'error'); return; }

    const btn = document.getElementById('btnGenerateOl');
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Reading ${classes.length} sheet(s)...`;

    const { allStudents, sheetStatus } = await readAllSheets(classes, '11');

    btn.disabled = false;
    btn.innerHTML = originalHTML;

    if (!allStudents.length) {
        showToast('Sheets වලින් කිසිම Data එකක් ලැබුණේ නෑ!', 'error');
        renderSheetStatus('ol', sheetStatus);
        return;
    }

    const filtered = gradeFilter === 'all'
        ? allStudents
        : allStudents.filter(s => String(s.grade) === gradeFilter);
    if (!filtered.length) { showToast('Matching records නෑ!', 'error'); return; }

    olAnalysisData = {
        year, term, grade: gradeFilter,
        class: classes.map(c => c.cls).join(','),
        sheetStatus,
        summary: computeAnalysis(filtered, 'ol')
    };
    renderAnalysis('ol', olAnalysisData.summary);
    renderSheetStatus('ol', sheetStatus);
    document.getElementById('olAnalysisResult').style.display = 'block';
    document.getElementById('btnSaveOl').disabled = false;
    document.getElementById('btnPdfPreviewOl').disabled = false;

    const okCount = sheetStatus.filter(s => s.ok).length;
    const failCount = sheetStatus.filter(s => !s.ok).length;
    showToast(`O/L: ${filtered.length} students from ${okCount} sheet(s)${failCount ? ` • ${failCount} failed` : ''}`, okCount ? 'ok' : 'error');
}

async function generateAlAnalysis() {
    const year = document.getElementById('alAnalysisYear').value.trim();
    const term = document.getElementById('alAnalysisTerm').value;
    const stream = document.getElementById('alAnalysisStream').value;
    const gradeFilter = document.getElementById('alAnalysisGrade').value;
    if (!year) { showToast('Year එක type කරන්න!', 'error'); return; }
    const classes = collectClassSheets('al');
    if (!classes.length) { showToast('අවම වශයෙන් එක Class Sheet එකක් add කරන්න!', 'error'); return; }

    const btn = document.getElementById('btnGenerateAl');
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Reading ${classes.length} sheet(s)...`;

    const { allStudents, sheetStatus } = await readAllSheets(classes, '13');

    btn.disabled = false;
    btn.innerHTML = originalHTML;

    if (!allStudents.length) {
        showToast('Sheets වලින් කිසිම Data එකක් ලැබුණේ නෑ!', 'error');
        renderSheetStatus('al', sheetStatus);
        return;
    }

    const filtered = gradeFilter === 'all'
        ? allStudents
        : allStudents.filter(s => String(s.grade) === gradeFilter);
    if (!filtered.length) { showToast('Matching records නෑ!', 'error'); return; }

    filtered.forEach(s => s.stream = stream);

    alAnalysisData = {
        year, term, grade: gradeFilter, stream,
        class: classes.map(c => c.cls).join(','),
        sheetStatus,
        summary: computeAnalysis(filtered, 'al')
    };
    renderAnalysis('al', alAnalysisData.summary);
    renderSheetStatus('al', sheetStatus);
    document.getElementById('alAnalysisResult').style.display = 'block';
    document.getElementById('btnSaveAl').disabled = false;
    document.getElementById('btnPdfPreviewAl').disabled = false;

    const okCount = sheetStatus.filter(s => s.ok).length;
    const failCount = sheetStatus.filter(s => !s.ok).length;
    showToast(`A/L: ${filtered.length} students from ${okCount} sheet(s)${failCount ? ` • ${failCount} failed` : ''}`, okCount ? 'ok' : 'error');
}

function renderSheetStatus(mode, sheetStatus) {
    const resultBox = document.getElementById(mode === 'ol' ? 'olAnalysisResult' : 'alAnalysisResult');
    if (!resultBox) return;

    let statusDiv = document.getElementById(`${mode}SheetStatusBox`);
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = `${mode}SheetStatusBox`;
        statusDiv.style.cssText = 'margin-bottom:18px; padding:14px; background:#0b1220; border:1px solid #334155; border-radius:10px;';
        resultBox.insertBefore(statusDiv, resultBox.firstChild);
    }

    const okCount = sheetStatus.filter(s => s.ok).length;
    const failCount = sheetStatus.filter(s => !s.ok).length;

    statusDiv.innerHTML = `
        <div style="font-weight:800; margin-bottom:10px; color:#60a5fa; font-size:0.92rem;">
            <i class="fa-solid fa-list-check"></i> Sheet Read Status — 
            <span style="color:#34d399;">${okCount} OK</span>
            ${failCount ? ` • <span style="color:#f87171;">${failCount} Failed</span>` : ''}
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${sheetStatus.map(s => `
                <div style="padding:7px 12px; border-radius:8px; font-size:0.8rem; font-weight:700; ${s.ok 
                    ? 'background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.45); color:#6ee7b7;' 
                    : 'background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.5); color:#fca5a5;'}">
                    ${s.ok ? '✓' : '✗'} Class ${s.cls} (Gr ${s.grade})${s.ok ? ` — ${s.count} students` : ` — ${s.error}`}
                </div>
            `).join('')}
        </div>
    `;
}

function computeAnalysis(students, mode) {
    const summary = {
        total: students.length, passed: 0, failed: 0,
        gradeBreakdown: {}, subjectStats: {}, students: [],
        achievers: { '9A': 0, '8A': 0, '7A': 0, '6A': 0 },
        detectedMathsSubject: null,
        detectedMotherSubject: null
    };

    const allNames = new Set();
    students.forEach(st => Object.keys(st.results || {}).forEach(k => allNames.add(k)));
    summary.detectedMathsSubject = Array.from(allNames).find(n => isMathsSubject(n)) || null;
    summary.detectedMotherSubject = Array.from(allNames).find(n => isMotherTongueSubject(n)) || null;

    students.forEach(st => {
        const g = String(st.grade || '');
        if (!summary.gradeBreakdown[g]) summary.gradeBreakdown[g] = { total: 0, passed: 0, failed: 0 };
        summary.gradeBreakdown[g].total++;

        const subjects = getSubjects(st.results || {});
        let isPass = false, detail = '', aCount = 0;

        if (mode === 'ol') {
            const r = checkOlPass(subjects);
            isPass = r.pass; detail = r.reason; aCount = r.aCount;
            if (aCount === 9) summary.achievers['9A']++;
            else if (aCount === 8) summary.achievers['8A']++;
            else if (aCount === 7) summary.achievers['7A']++;
            else if (aCount === 6) summary.achievers['6A']++;
        } else {
            const r = checkAlPass(subjects);
            isPass = r.pass; detail = r.reason; aCount = r.aCount;
        }

        if (isPass) { summary.passed++; summary.gradeBreakdown[g].passed++; }
        else { summary.failed++; summary.gradeBreakdown[g].failed++; }

        subjects.forEach(([sub, m]) => {
            const grade = calcGrade(m);
            if (!summary.subjectStats[sub]) summary.subjectStats[sub] = { A:0, B:0, C:0, S:0, W:0, AB:0 };
            if (!(grade in summary.subjectStats[sub])) summary.subjectStats[sub][grade] = 0;
            summary.subjectStats[sub][grade]++;
        });

        summary.students.push({
            index: st.indexNumber, name: st.name, grade: st.grade, class: st.class,
            total: st.total, average: st.average, position: st.position,
            pass: isPass, detail, aCount, results: st.results || {}
        });
    });

    summary.passRate = summary.total ? ((summary.passed / summary.total) * 100).toFixed(1) : '0.0';
    return summary;
}

function renderAnalysis(mode, summary) {
    const prefix = mode === 'ol' ? 'ol' : 'al';
    document.getElementById(`${prefix}StatTotal`).textContent = summary.total;
    document.getElementById(`${prefix}StatPass`).textContent = summary.passed;
    document.getElementById(`${prefix}StatFail`).textContent = summary.failed;
    document.getElementById(`${prefix}StatRate`).textContent = `${summary.passRate}%`;

    const tbody = document.getElementById(`${prefix}BreakdownBody`);
    if (tbody) {
        tbody.innerHTML = Object.keys(summary.gradeBreakdown).sort().map(g => {
            const b = summary.gradeBreakdown[g];
            const rate = b.total ? ((b.passed / b.total) * 100).toFixed(1) : '0.0';
            return `<tr><td><strong>Grade ${g}</strong></td><td>${b.total}</td><td style="color:#34d399; font-weight:800;">${b.passed}</td><td style="color:#f87171; font-weight:800;">${b.failed}</td><td><strong>${rate}%</strong></td></tr>`;
        }).join('');
    }

    if (mode === 'ol') {
        let achieversBox = document.getElementById('olAchieversBox');
        if (!achieversBox) {
            const target = document.getElementById('olBreakdownBody')?.closest('table');
            if (target) {
                achieversBox = document.createElement('div');
                achieversBox.id = 'olAchieversBox';
                achieversBox.style.marginTop = '25px';
                target.parentNode.insertBefore(achieversBox, target.nextSibling);
            }
        }
        if (achieversBox) {
            achieversBox.innerHTML = `
                <h4 style="margin-bottom:12px; color:#60a5fa;"><i class="fa-solid fa-medal"></i> Top Achievers</h4>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <div style="background:#1e293b; padding:10px 15px; border-radius:8px; border:1px solid #334155;"><strong>9A:</strong> <span style="color:#34d399">${summary.achievers['9A']}</span></div>
                    <div style="background:#1e293b; padding:10px 15px; border-radius:8px; border:1px solid #334155;"><strong>8A:</strong> <span style="color:#34d399">${summary.achievers['8A']}</span></div>
                    <div style="background:#1e293b; padding:10px 15px; border-radius:8px; border:1px solid #334155;"><strong>7A:</strong> <span style="color:#34d399">${summary.achievers['7A']}</span></div>
                    <div style="background:#1e293b; padding:10px 15px; border-radius:8px; border:1px solid #334155;"><strong>6A:</strong> <span style="color:#34d399">${summary.achievers['6A']}</span></div>
                </div>
                <div style="margin-top:15px; padding:10px 14px; background:#1e293b; border:1px solid #334155; border-radius:8px; font-size:0.82rem; color:#94a3b8;">
                    <div><strong style="color:#60a5fa;">Detected Maths:</strong> ${summary.detectedMathsSubject || '<span style="color:#fbbf24;">Not detected</span>'}</div>
                    <div style="margin-top:4px;"><strong style="color:#60a5fa;">Detected Mother Tongue:</strong> ${summary.detectedMotherSubject || '<span style="color:#fbbf24;">Not detected</span>'}</div>
                </div>
            `;
        }
    }

    const pfId = prefix === 'ol' ? 'olPassFailChart' : 'alPassFailChart';
    const gradeId = prefix === 'ol' ? 'olGradeChart' : 'alGradeChart';
    const pfCanvas = document.getElementById(pfId);
    const gradeCanvas = document.getElementById(gradeId);
    if (!pfCanvas || !gradeCanvas) return;

    const charts = mode === 'ol' ? olCharts : alCharts;
    if (charts.pf) charts.pf.destroy();
    if (charts.grade) charts.grade.destroy();

    charts.pf = new Chart(pfCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Passed', 'Failed'],
            datasets: [{
                data: [summary.passed, summary.failed],
                backgroundColor: ['#10b981', '#ef4444'],
                borderColor: '#1e293b', borderWidth: 4, hoverOffset: 10
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 14, font: { weight: 700 }, usePointStyle: true, pointStyle: 'circle' } },
                tooltip: {
                    backgroundColor: '#0f172a', padding: 12, cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });

    const gradeLabels = Object.keys(summary.gradeBreakdown).sort().map(g => `Grade ${g}`);
    const passData = Object.keys(summary.gradeBreakdown).sort().map(g => summary.gradeBreakdown[g].passed);
    const failData = Object.keys(summary.gradeBreakdown).sort().map(g => summary.gradeBreakdown[g].failed);

    charts.grade = new Chart(gradeCanvas, {
        type: 'bar',
        data: {
            labels: gradeLabels,
            datasets: [
                { label: 'Passed', data: passData, backgroundColor: '#10b981', borderRadius: 8, maxBarThickness: 50 },
                { label: 'Failed', data: failData, backgroundColor: '#ef4444', borderRadius: 8, maxBarThickness: 50 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: '#94a3b8', font: { weight: 700 }, usePointStyle: true, pointStyle: 'circle' } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { weight: 700 } } },
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#94a3b8', font: { weight: 700 } } }
            }
        }
    });
}

async function saveAnalysis(mode) {
    const data = mode === 'ol' ? olAnalysisData : alAnalysisData;
    if (!data) return;
    const docId = `${mode}-${data.year}`;
    const payload = {
        type: mode, year: data.year, term: data.term,
        gradeFilter: data.grade, classFilter: data.class || 'all',
        stream: data.stream || '',
        totalStudents: data.summary.total,
        passed: data.summary.passed, failed: data.summary.failed,
        passRate: parseFloat(data.summary.passRate),
        gradeBreakdown: data.summary.gradeBreakdown,
        subjectStats: data.summary.subjectStats,
        achievers: data.summary.achievers || {},
        students: data.summary.students,
        sheetStatus: data.sheetStatus || [],
        detectedMaths: data.summary.detectedMathsSubject || null,
        detectedMotherTongue: data.summary.detectedMotherSubject || null,
        generatedAt: serverTimestamp(),
        generatedBy: currentAdminRole || null
    };
    try {
        await setDoc(doc(db, 'term-test-analysis', docId), payload, { merge: true });
        showToast(`${mode.toUpperCase()} analysis saved to "${docId}"!`, 'ok');
    } catch (e) {
        console.error(e);
        showToast('Save failed: ' + e.message, 'error');
    }
}

async function exportPdf(mode) {
    const data = mode === 'ol' ? olAnalysisData : alAnalysisData;
    if (!data) { showToast('Generate data first!', 'error'); return; }

    const students = data.summary.students || [];
    const modeLabel = mode === 'ol' ? 'O/L (Grade 10 & 11)' : 'A/L (Grade 12 & 13)';

    const subjectSet = new Set();
    students.forEach(st => {
        Object.keys(st.results || {}).forEach(sub => {
            const k = String(sub).toLowerCase().trim();
            if (k === 'grade' || k === 'class' || k === 'stream' || k === 'position') return;
            if (k === 'total' || k === 'average' || k === 'result') return;
            subjectSet.add(sub);
        });
    });
    const subjectCols = Array.from(subjectSet).sort();

    const sorted = [...students].sort((a, b) => {
        if (b.aCount !== a.aCount) return b.aCount - a.aCount;
        if (a.pass !== b.pass) return a.pass ? -1 : 1;
        return String(a.name || '').localeCompare(String(b.name || ''));
    });

    const achievers = { A9: [], A8: [], A7: [], A6: [] };
    students.forEach(st => {
        if (st.aCount === 9) achievers.A9.push(st);
        else if (st.aCount === 8) achievers.A8.push(st);
        else if (st.aCount === 7) achievers.A7.push(st);
        else if (st.aCount === 6) achievers.A6.push(st);
    });

    function achieverLine(grade, label) {
        const arr = achievers[grade];
        if (!arr.length) return '';
        const names = arr.map(s => `${s.name || s.index || 'N/A'} (${s.index || '—'})`).join(', ');
        return `<div class="ach-line"><strong>${label} (${arr.length}):</strong> ${names}</div>`;
    }

    const achieverHTML = mode === 'ol'
        ? (achieverLine('A9', '9A') + achieverLine('A8', '8A') + achieverLine('A7', '7A') + achieverLine('A6', '6A')) || '<div class="ach-line" style="color:#666;">No 6A+ achievers.</div>'
        : '';

    const subjectHeaders = subjectCols.map(s => `<th>${s}</th>`).join('');

    const rowsHTML = sorted.map((st, idx) => {
        const grades = subjectCols.map(sub => {
            const mark = (st.results || {})[sub];
            if (mark === undefined || mark === '') return '<td class="empty">-</td>';
            const g = calcGrade(mark);
            return `<td class="g-${g}">${g}</td>`;
        }).join('');
        const rowCls = st.pass ? 'row-pass' : 'row-fail';
        return `<tr class="${rowCls}">
            <td>${idx + 1}</td>
            <td>${st.index || '-'}</td>
            <td class="name">${st.name || '-'}</td>
            <td>${st.grade || '-'}</td>
            <td>${st.class || '-'}</td>
            ${grades}
            <td class="a-count">${st.aCount}A</td>
            <td class="status ${st.pass ? 'pass' : 'fail'}">${st.pass ? 'PASS' : 'FAIL'}</td>
        </tr>`;
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${mode.toUpperCase()} Term Test Analysis - ${data.year} ${data.term}</title>
            <style>
                @page { size: A4 portrait; margin: 8mm 6mm; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html, body {
                    width: 210mm; background: #fff; color: #111;
                    font-family: 'Segoe UI', 'Noto Sans Sinhala', Tahoma, sans-serif;
                    font-size: 8pt; line-height: 1.3;
                }
                body { padding: 0 2mm; }
                .report-header { text-align: center; border-bottom: 2px solid #b91c1c; padding-bottom: 6px; margin-bottom: 8px; }
                .report-header img { height: 40px; width: auto; margin-bottom: 2px; }
                .report-header h1 { font-size: 12pt; color: #b91c1c; margin: 1px 0; text-transform: uppercase; letter-spacing: 0.3px; }
                .report-header h2 { font-size: 9pt; color: #444; margin: 1px 0 4px; font-weight: 700; }
                .report-header .meta { font-size: 8pt; color: #333; font-weight: 600; }
                .report-header .meta span { background: #fef3c7; color: #92400e; padding: 2px 7px; border-radius: 10px; border: 1px solid #f59e0b; margin: 0 3px; display: inline-block; }
                .ach-section { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 5px; padding: 5px 8px; margin-bottom: 8px; }
                .ach-title { font-size: 9pt; color: #b45309; font-weight: 800; margin-bottom: 3px; text-transform: uppercase; }
                .ach-line { font-size: 8pt; color: #333; margin-bottom: 2px; line-height: 1.4; }
                .ach-line strong { color: #b91c1c; }
                .stats-row { display: flex; justify-content: space-between; gap: 5px; margin-bottom: 8px; }
                .stat-box { flex: 1; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 2px; background: #f8fafc; }
                .stat-box .num { font-size: 11pt; font-weight: 800; color: #0f172a; }
                .stat-box .lbl { font-size: 6.5pt; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.3px; }
                .stat-box.pass { border-color: #10b981; }
                .stat-box.pass .num { color: #059669; }
                .stat-box.fail { border-color: #ef4444; }
                .stat-box.fail .num { color: #dc2626; }
                table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7pt; }
                th, td { border: 1px solid #94a3b8; padding: 2px 2px; text-align: center; vertical-align: middle; word-wrap: break-word; overflow-wrap: break-word; }
                th { background: #fef3c7; color: #78350f; font-weight: 800; text-transform: uppercase; font-size: 6pt; letter-spacing: 0.2px; }
                td.name { text-align: left; font-weight: 700; font-size: 7pt; }
                td.a-count { font-weight: 800; color: #b91c1c; }
                td.status { font-weight: 800; font-size: 7pt; }
                td.status.pass { color: #059669; background: #ecfdf5; }
                td.status.fail { color: #dc2626; background: #fef2f2; }
                td.g-A { color: #059669; font-weight: 800; }
                td.g-B { color: #2563eb; font-weight: 800; }
                td.g-C { color: #b45309; font-weight: 800; }
                td.g-S { color: #c2410c; font-weight: 700; }
                td.g-W { color: #b91c1c; font-weight: 800; }
                td.g-AB { color: #7c3aed; font-weight: 800; background: #f3e8ff; }
                td.empty { color: #cbd5e1; }
                tr.row-fail { background: #fff5f5; }
                @media print {
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    .report-header, .ach-section, .stats-row { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <img src="school bage.png" alt="Badge" onerror="this.style.display='none';">
                <h1>A/Maithripala Senanayake Central College</h1>
                <h2>MSNS - Medawachchiya</h2>
                <div class="meta">
                    <span>${modeLabel}</span>
                    <span>Year: ${data.year}</span>
                    <span>Term: ${data.term}</span>
                    <span>Class: ${data.class === 'all' ? 'All' : data.class}</span>
                    ${data.stream ? `<span>${data.stream}</span>` : ''}
                </div>
            </div>
            ${mode === 'ol' ? `
                <div class="ach-section">
                    <div class="ach-title">★ Top Achievers</div>
                    ${achieverHTML}
                </div>
            ` : ''}
            <div class="stats-row">
                <div class="stat-box"><div class="num">${data.summary.total}</div><div class="lbl">Total</div></div>
                <div class="stat-box pass"><div class="num">${data.summary.passed}</div><div class="lbl">Passed</div></div>
                <div class="stat-box fail"><div class="num">${data.summary.failed}</div><div class="lbl">Failed</div></div>
                <div class="stat-box"><div class="num">${data.summary.passRate}%</div><div class="lbl">Pass Rate</div></div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width:4%;">#</th>
                        <th style="width:8%;">Index</th>
                        <th style="width:16%;">Name</th>
                        <th style="width:5%;">Gr</th>
                        <th style="width:5%;">Cls</th>
                        ${subjectHeaders}
                        <th style="width:5%;">A's</th>
                        <th style="width:7%;">Result</th>
                    </tr>
                </thead>
                <tbody>${rowsHTML}</tbody>
            </table>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
        try { printWindow.focus(); printWindow.print(); } catch (e) { console.error(e); }
    }, 900);
    showToast('Print Preview විවෘත වේ...', 'ok');
}

// ==========================================
// 9. MAIN TAB LOGIC
// ==========================================
function initMainTabs() {
    const tabManageResults = document.getElementById('tabManageResults');
    const tabAnalysisMain = document.getElementById('tabAnalysisMain');
    const manageResultsWrapper = document.getElementById('manageResultsWrapper');
    const analysisMainWrapper = document.getElementById('analysisMainWrapper');
    if (tabManageResults && tabAnalysisMain) {
        tabManageResults.addEventListener('click', () => {
            tabManageResults.classList.add('active');
            tabAnalysisMain.classList.remove('active');
            manageResultsWrapper.style.display = 'block';
            analysisMainWrapper.style.display = 'none';
        });
        tabAnalysisMain.addEventListener('click', () => {
            tabAnalysisMain.classList.add('active');
            tabManageResults.classList.remove('active');
            analysisMainWrapper.style.display = 'block';
            manageResultsWrapper.style.display = 'none';
        });
    }
}

// ==========================================
// 10. ADMIN USERS (OWNER ONLY) — ★ NEW
// ==========================================
function initAdminUsersModule() {
    $('btnAddAdminUser')?.addEventListener('click', addAdminUser);
    // Owner නම් data load කරන්න (already loaded වුනොත් skip)
    if (currentAdminRole === 'owner') loadAdminUsers();
}

async function loadAdminUsers() {
    const container = $('adminUsersContainer');
    if (!container) return;
    try {
        const snap = await getDocs(collection(db, 'admin-users'));
        loadedAdminUsers = [];
        snap.forEach(d => loadedAdminUsers.push({ id: d.id, ...d.data() }));
        // Owner මුලින්ම පෙන්නන්න
        loadedAdminUsers.sort((a, b) => (a.id === 'owner' ? -1 : b.id === 'owner' ? 1 : a.id.localeCompare(b.id)));
        renderAdminUsersList();
    } catch (err) {
        console.error(err);
        showToast('Admin users load error: ' + err.message, 'error');
    }
}

function renderAdminUsersList() {
    const container = $('adminUsersContainer');
    if (!container) return;
    if (!loadedAdminUsers.length) {
        container.innerHTML = `<p style="color:var(--text-muted); padding:15px;">Admin users කිසිවක් හමු නොවුණි.</p>`;
        return;
    }
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    loadedAdminUsers.forEach((u) => {
        const isOwner = u.id === 'owner';
        const card = document.createElement('div');
        card.className = 'form-card';
        card.style.marginBottom = '16px';
        card.style.borderLeft = isOwner ? '4px solid #c99a2e' : '4px solid #3b82f6';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, #3b82f6, #8b5cf6); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.05rem; color:#fff;">
                        ${(u.username || u.id || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 style="margin:0; color:#fff; font-size:1rem;">${u.username || u.id}</h4>
                        <small style="color:var(--text-muted); font-size:0.75rem;">Doc ID: <code style="background:rgba(0,0,0,0.3); padding:1px 5px; border-radius:4px;">${u.id}</code></small>
                    </div>
                </div>
                <span class="admin-badge" style="font-size:0.68rem; ${isOwner ? 'background:rgba(201,154,46,0.2); border-color:rgba(201,154,46,0.5); color:#c99a2e;' : ''}">
                    ${isOwner ? '★ OWNER' : u.id.toUpperCase()}
                </span>
            </div>
            <div class="field-2col">
                <div class="field" style="margin-bottom:10px;">
                    <label>Username</label>
                    <input type="text" class="custom-input admin-username-input" data-id="${u.id}" value="${u.username || ''}" />
                </div>
                <div class="field" style="margin-bottom:10px;">
                    <label>Password</label>
                    <input type="text" class="custom-input admin-password-input" data-id="${u.id}" value="${u.password || ''}" />
                </div>
            </div>
            <div style="display:flex; gap:10px; margin-top:6px; flex-wrap:wrap;">
                <button class="btn btn-primary btn-save-admin-user" data-id="${u.id}">
                    <i class="fa-solid fa-floppy-disk"></i> Save Changes
                </button>
                ${!isOwner ? `<button class="btn btn-danger btn-delete-admin-user" data-id="${u.id}">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>` : ''}
            </div>
        `;
        fragment.appendChild(card);
    });
    container.appendChild(fragment);

    container.querySelectorAll('.btn-save-admin-user').forEach(btn => {
        btn.addEventListener('click', () => saveAdminUser(btn.dataset.id));
    });
    container.querySelectorAll('.btn-delete-admin-user').forEach(btn => {
        btn.addEventListener('click', () => deleteAdminUser(btn.dataset.id));
    });
}

async function saveAdminUser(docId) {
    const usernameInput = document.querySelector(`.admin-username-input[data-id="${docId}"]`);
    const passwordInput = document.querySelector(`.admin-password-input[data-id="${docId}"]`);
    if (!usernameInput || !passwordInput) return;
    const newUsername = usernameInput.value.trim();
    const newPassword = passwordInput.value.trim();
    if (!newUsername || !newPassword) {
        showToast('Username සහ Password හිස් විය නොහැක!', 'error');
        return;
    }
    // Owner account එකේ username එක 'owner' විදියටම තියෙන්න ඕන (login එකට)
    if (docId === 'owner' && newUsername.toLowerCase() !== 'owner') {
        if (!confirm('Owner username එක වෙනස් කිරීමෙන් පසු ඔබට login වෙන්න අලුත් username එක භාවිතා කරන්න වේ. කරගෙන යන්නද?')) {
            return;
        }
    }
    try {
        await updateDoc(doc(db, 'admin-users', docId), {
            username: newUsername,
            password: newPassword
        });
        showToast(`"${docId}" සාර්ථකව Update විය!`, 'ok');
        loadAdminUsers();
    } catch (err) {
        showToast('Update error: ' + err.message, 'error');
    }
}

async function deleteAdminUser(docId) {
    if (docId === 'owner') {
        showToast('Owner account එක ඉවත් කල නොහැක!', 'error');
        return;
    }
    if (!confirm(`"${docId}" admin user එක ඉවත් කිරීමට තහවුරු කරන්න?`)) return;
    try {
        await deleteDoc(doc(db, 'admin-users', docId));
        showToast('සාර්ථකව Delete විය!', 'ok');
        loadAdminUsers();
    } catch (err) {
        showToast('Delete error: ' + err.message, 'error');
    }
}

async function addAdminUser() {
    const idInput = $('newAdminDocId');
    const unameInput = $('newAdminUsername');
    const pwdInput = $('newAdminPassword');
    if (!idInput || !unameInput || !pwdInput) return;
    const docId = idInput.value.trim().toLowerCase().replace(/\s+/g, '-');
    const uname = unameInput.value.trim();
    const pwd = pwdInput.value.trim();
    if (!docId || !uname || !pwd) {
        showToast('සියලුම fields පුරවන්න!', 'error');
        return;
    }
    try {
        const existing = await getDoc(doc(db, 'admin-users', docId));
        if (existing.exists()) {
            showToast('මෙම Document ID එක දැනටමත් පවතී!', 'error');
            return;
        }
        await setDoc(doc(db, 'admin-users', docId), {
            username: uname,
            password: pwd
        });
        showToast('අලුත් Admin User එකතු විය!', 'ok');
        idInput.value = ''; unameInput.value = ''; pwdInput.value = '';
        loadAdminUsers();
    } catch (err) {
        showToast('Add error: ' + err.message, 'error');
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('a-sw.js').catch(() => {});
}

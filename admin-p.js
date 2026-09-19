// Import Firebase ES Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp, writeBatch 
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

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global States
let currentAdminRole = null;
let activeUserRoleTab = 'student';
let loadedUsers = [];

// DOM Helper
const $ = (id) => document.getElementById(id);

// ImgBB API Key
const IMGBB_API_KEY = "3c7f31bff91c8f5f4a9aef96751ac2db";

// ==========================================
// 1. INITIALIZATION & AUTHENTICATION LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initAuth();
    initNewsModule();
    initExamsModule();
    initTermTestModule();
    initDocumentsModule();
    initGeminiModule();
    initTermAnalysisModule();   // NEW
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

            // 1. Check direct doc ID match
            let adminDocRef = doc(db, 'admin-users', uname);
            let adminSnap = await getDoc(adminDocRef);

            if (adminSnap.exists()) {
                userData = adminSnap.data();
                detectedRole = userData.role || adminSnap.id;
            } else {
                // 2. Query by 'username' field
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
        users: $('navUsers'),
        news: $('navNews'),
        exams: $('navExams'),
        termTest: $('navTermTest'),
        documents: $('navDocuments'),
        gemini: $('navGemini')
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
            if (section) {
                e.preventDefault();
                switchSection(section);
                closeNav();
            }
        });
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(lnk => lnk.classList.remove('active-link'));

    if ($(sectionId)) $(sectionId).classList.add('active');
    const activeBtn = Array.from(document.querySelectorAll('.nav-link')).find(l => l.dataset.section === sectionId);
    if (activeBtn) activeBtn.classList.add('active-link');
}

// ==========================================
// 2. USERS MANAGEMENT MODULE
// ==========================================
async function loadUsersData() {
    try {
        const querySnap = await getDocs(collection(db, 'users'));
        loadedUsers = [];
        querySnap.forEach(docSnap => {
            loadedUsers.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderUsersList();
    } catch (err) {
        console.error(err);
        showToast('Users ලෝඩ් කිරීමේදී දෝෂයක් සිදුවිය', 'error');
    }
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
                              (u.indexNumber || u.indexNum || '').toLowerCase().includes(searchTerm);
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
        const name = user.fullName || user.displayName || user.name || 'Unnamed User';
        const index = user.indexNum || user.indexNumber || 'N/A';
        const className = user.className || user.class || 'N/A';

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
                <button class="btn ${user.disabled ? 'btn-ghost' : 'btn-danger'} btn-toggle-user" data-id="${user.id}" data-disabled="${user.disabled}">
                    ${user.disabled ? 'Enable' : 'Disable'}
                </button>
                <button class="btn btn-danger btn-delete-user" data-id="${user.id}">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
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
    $('tabStudents').classList.add('active');
    $('tabTeachers')?.classList.remove('active');
    renderUsersList();
});

$('tabTeachers')?.addEventListener('click', () => {
    activeUserRoleTab = 'teacher';
    $('tabTeachers').classList.add('active');
    $('tabStudents')?.classList.remove('active');
    renderUsersList();
});

$('userSearchInput')?.addEventListener('input', renderUsersList);

async function toggleUserStatus(userId, currentDisabled) {
    try {
        await updateDoc(doc(db, 'users', userId), { disabled: !currentDisabled });
        showToast('පරිශීලක තත්ත්වය යාවත්කාලීන විය', 'ok');
        loadUsersData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteUserAccount(userId) {
    if (!confirm('මෙම User සහ මෙයාට අදාළ ai Collection එකේ ඇති සියලුම Messages මුළුමනින්ම ඉවත් කිරීමට තහවුරු කරන්න?')) return;
    try {
        await deleteDoc(doc(db, 'users', userId));
        const aiQuery = query(collection(db, 'ai'), where('userId', '==', userId));
        const aiSnap = await getDocs(aiQuery);
        
        if (!aiSnap.empty) {
            let batch = writeBatch(db);
            let count = 0;
            aiSnap.forEach((aiDoc) => {
                batch.delete(doc(db, 'ai', aiDoc.id));
                count++;
                if (count === 400) {
                    batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                }
            });
            if (count > 0) await batch.commit();
        }

        showToast('User සහ අදාළ දත්ත සාර්ථකව Delete විය!', 'ok');
        loadUsersData();
    } catch (err) {
        showToast('Delete කිරීම අසාර්ථකයි: ' + err.message, 'error');
    }
}

// ==========================================
// 3. NEWS UPDATE MODULE
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

                showToast('ඡායාරූපය Upload වෙමින් පවතී...', 'ok');
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                const imgData = await res.json();
                
                if (imgData.success) {
                    imgUrl = imgData.data.display_url || imgData.data.url;
                } else {
                    throw new Error('Image Upload අසාර්ථකයි');
                }
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
                showToast('News එක යාවත්කාලීන විය!', 'ok');
            } else {
                newsObject.views = 0;
                newsObject.createdAt = serverTimestamp();
                await addDoc(collection(db, 'news'), newsObject);
                showToast('News එක සාර්ථකව පලකෙරිණි!', 'ok');
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
                    ${data.imageUrl 
                        ? `<img src="${data.imageUrl}" alt="${data.title || 'News'}" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'news-card-placeholder\\'><i class=\\'fa-solid fa-newspaper\\'></i></div>';" />` 
                        : `<div class="news-card-placeholder"><i class="fa-solid fa-newspaper"></i></div>`}
                </div>
                <div class="news-card-body">
                    <div class="news-card-meta" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px;">
                        <span><i class="fa-solid fa-calendar-days"></i> ${data.date || 'No Date'} | ${data.category || 'General'}</span>
                        <span class="news-views-badge" title="Total Views" style="background:rgba(255,217,102,0.15); color:#ffd966; padding:2px 8px; border-radius:12px; font-size:12px;">
                            <i class="fa-solid fa-eye"></i> ${viewsCount}
                        </span>
                    </div>
                    <h4 title="${data.title || ''}" style="margin:8px 0;">${data.title || 'Untitled'}</h4>
                    <p class="news-snippet" style="color:var(--text-muted); font-size:13px; line-height:1.5;">${data.snippet || ''}</p>
                    <div style="margin-top:8px; font-size:12px; color:#888;">
                        ${data.isFeatured === 'yes' ? '<span style="color:#ffd966;"><i class="fa-solid fa-star"></i> Featured</span>' : ''}
                        ${data.showInHome === 'yes' ? '<span style="color:#10b981; margin-left:8px;"><i class="fa-solid fa-house"></i> Home</span>' : ''}
                    </div>
                    <div class="news-actions" style="margin-top:12px; display:flex; gap:8px;">
                        <button class="btn btn-ghost btn-edit-news" data-id="${docSnap.id}" style="padding:4px 12px; font-size:13px;">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-delete-news" data-id="${docSnap.id}" style="padding:4px 12px; font-size:13px;">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
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
                        if ($('imagePreviewBox')) {
                            $('imagePreviewBox').innerHTML = d.imageUrl ? `<img src="${d.imageUrl}" style="max-height:80px; border-radius:4px; margin-top:5px;" />` : '';
                        }
                        
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        showToast('News එක Edit mode එකට ගෙනාවා', 'ok');
                    }
                } catch (err) {
                    showToast('Edit කිරීමේදී දෝෂයක්: ' + err.message, 'error');
                }
            });
        });

        container.querySelectorAll('.btn-delete-news').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('මෙම News එක සම්පූර්ණයෙන්ම Delete කිරීමට තහවුරු කරන්න?')) {
                    try {
                        await deleteDoc(doc(db, 'news', btn.dataset.id));
                        showToast('News එක Delete විය', 'ok');
                        loadNewsList();
                    } catch (err) {
                        showToast('Delete කිරීමේදී දෝෂයක් සිදුවිය: ' + err.message, 'error');
                    }
                }
            });
        });
    } catch (err) {
        console.error('Error loading news list:', err);
        container.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:20px;">News ලැයිස්තුව ලෝඩ් කිරීමේදී දෝෂයක්: ${err.message}</p>`;
    }
}

// ==========================================
// 4. EXAM RESULTS MODULE (O/L & A/L)
// ==========================================
function initExamsModule() {
    const calcOl = () => {
        const total = parseFloat($('olTotal')?.value) || 0;
        const pass = parseFloat($('olPass')?.value) || 0;
        const rate = total > 0 ? ((pass / total) * 100).toFixed(2) : 0;
        if ($('olPassRate')) $('olPassRate').innerText = `${rate}%`;
    };

    $('olTotal')?.addEventListener('input', calcOl);
    $('olPass')?.addEventListener('input', calcOl);

    $('tabOlExam')?.addEventListener('click', () => {
        if (confirm('Do you want to clear old results and enter new results?')) {
            $('olFormWrapper').style.display = 'block';
            $('alFormWrapper').style.display = 'none';
            $('tabOlExam').classList.add('active');
            $('tabAlExam').classList.remove('active');
        }
    });

    $('tabAlExam')?.addEventListener('click', () => {
        if (confirm('Do you want to clear old results and enter new results?')) {
            $('olFormWrapper').style.display = 'none';
            $('alFormWrapper').style.display = 'block';
            $('tabAlExam').classList.add('active');
            $('tabOlExam').classList.remove('active');
            renderAlStreamsForm();
        }
    });

    $('btnAddOlAchiever')?.addEventListener('click', () => addOlAchieverRow());

    $('btnSaveOl')?.addEventListener('click', async () => {
        const achievers = [];
        document.querySelectorAll('.ol-achiever-row').forEach(row => {
            achievers.push({
                name: row.querySelector('.achiever-name')?.value || '',
                indexNum: row.querySelector('.achiever-index')?.value || '',
                resultsText: row.querySelector('.achiever-text')?.value || ''
            });
        });

        const olData = {
            year: $('olYear')?.value || '',
            driveLink: $('olDriveLink')?.value || '',
            totalStudents: $('olTotal')?.value || 0,
            passCount: $('olPass')?.value || 0,
            failCount: $('olFail')?.value || 0,
            passRate: $('olPassRate')?.innerText || '0%',
            achievers: achievers,
            updatedAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, 'exam', 'ol-exam'), olData);
            showToast('O/L Results Firestore එකට Save විය!', 'ok');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    $('btnSaveAl')?.addEventListener('click', async () => {
        const streamsData = {};
        const streams = [
            'A/L Technology', 'A/L Biological Science', 
            'A/L Physical Science (Maths)', 'A/L Arts', 'A/L Commerce'
        ];

        streams.forEach(st => {
            const stSlug = st.toLowerCase().replace(/[^a-z0-9]/g, '');
            const achievers = [];
            document.querySelectorAll(`.al-achiever-row-${stSlug}`).forEach(row => {
                achievers.push({
                    name: row.querySelector('.achiever-name')?.value || '',
                    indexNum: row.querySelector('.achiever-index')?.value || '',
                    resultsText: row.querySelector('.achiever-text')?.value || ''
                });
            });

            streamsData[stSlug] = {
                streamName: st,
                total: $(`alTotal_${stSlug}`)?.value || 0,
                pass: $(`alPass_${stSlug}`)?.value || 0,
                fail: $(`alFail_${stSlug}`)?.value || 0,
                achievers: achievers
            };
        });

        const alData = {
            year: $('alYear')?.value || '',
            driveLink: $('alDriveLink')?.value || '',
            streams: streamsData,
            updatedAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, 'exam', 'al-exam'), alData);
            showToast('A/L Results Firestore එකට Save විය!', 'ok');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

function addOlAchieverRow(data = {}) {
    const container = $('olAchieversContainer');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'field-3col ol-achiever-row';
    row.style.marginBottom = '10px';
    row.innerHTML = `
        <input type="text" class="custom-input achiever-name" placeholder="Name" value="${data.name || ''}" />
        <input type="text" class="custom-input achiever-index" placeholder="Index Num" value="${data.indexNum || ''}" />
        <input type="text" class="custom-input achiever-text" placeholder="Result (e.g. 9A or 8A 1B)" value="${data.resultsText || ''}" />
    `;
    container.appendChild(row);
}

function renderAlStreamsForm() {
    const container = $('alStreamsContainer');
    if (!container) return;
    container.innerHTML = '';
    const streams = [
        'A/L Technology', 'A/L Biological Science', 
        'A/L Physical Science (Maths)', 'A/L Arts', 'A/L Commerce'
    ];

    streams.forEach(st => {
        const stSlug = st.toLowerCase().replace(/[^a-z0-9]/g, '');
        const box = document.createElement('div');
        box.style.marginTop = '20px';
        box.style.borderTop = '1px solid var(--border-color)';
        box.style.paddingTop = '15px';

        box.innerHTML = `
            <h4 style="color:#ffd966; margin-bottom:10px;">${st}</h4>
            <div class="field-3col" style="display:flex; gap:10px; margin-bottom:10px;">
                <input type="number" id="alTotal_${stSlug}" class="custom-input" placeholder="Total Sat" />
                <input type="number" id="alPass_${stSlug}" class="custom-input" placeholder="Pass Count" />
                <input type="number" id="alFail_${stSlug}" class="custom-input" placeholder="Fail Count" />
            </div>
            <div id="alAchieversContainer_${stSlug}"></div>
            <button type="button" class="btn btn-ghost btn-add-al-student" data-slug="${stSlug}" style="margin-top:8px;">
                <i class="fa-solid fa-plus"></i> Add Student Result
            </button>
        `;
        container.appendChild(box);

        box.querySelector('.btn-add-al-student').addEventListener('click', () => {
            const stContainer = $(`alAchieversContainer_${stSlug}`);
            const row = document.createElement('div');
            row.className = `field-3col al-achiever-row-${stSlug}`;
            row.style.display = 'flex';
            row.style.gap = '10px';
            row.style.marginBottom = '8px';
            row.innerHTML = `
                <input type="text" class="custom-input achiever-name" placeholder="Name" />
                <input type="text" class="custom-input achiever-index" placeholder="Index Num" />
                <input type="text" class="custom-input achiever-text" placeholder="Result (3A, 2A 1B)" />
            `;
            stContainer.appendChild(row);
        });
    });
}

// ==========================================
// 5. ADVANCED TERM TEST RESULT MODULE
// ==========================================
let parsedSheetStudents = [];
let currentMeta = {};

function initTermTestModule() {
    const streamBox = $('streamFieldBox');
    const ttGrade = $('ttGrade');
    const ttForm = $('termTestForm');

    ttGrade?.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (streamBox) {
            streamBox.style.display = (val === 12 || val === 13) ? 'block' : 'none';
        }
    });

    ttForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = $('ttSheetUrl').value.trim();
        if (!url) return;

        currentMeta = {
            year: $('ttYear').value,
            term: $('ttTerm').value,
            grade: $('ttGrade').value,
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
            showToast('Google Sheet එක සාර්ථකව Read විය!', 'ok');
        } catch (err) {
            console.error(err);
            showToast('Sheet එක Read කිරීම අසාර්ථකයි: ' + err.message, 'error');
            if ($('ttPreviewContainer')) $('ttPreviewContainer').style.display = 'none';
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Sheet එක Read කර Preview බලන්න`;
        }
    });

    $('btnUploadToFirestore')?.addEventListener('click', async () => {
        if (!parsedSheetStudents || parsedSheetStudents.length === 0) {
            showToast('Upload කිරීමට Data හමු නොවුණි!', 'error');
            return;
        }

        const uploadBtn = $('btnUploadToFirestore');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving ${parsedSheetStudents.length} Records...`;

        try {
            const sheetRef = await addDoc(collection(db, 'term-test-results'), {
                ...currentMeta,
                studentCount: parsedSheetStudents.length,
                createdAt: new Date().toISOString()
            });

            const BATCH_SIZE = 400;
            let batch = writeBatch(db);
            let countInBatch = 0;
            let totalSaved = 0;

            for (let i = 0; i < parsedSheetStudents.length; i++) {
                const student = parsedSheetStudents[i];
                const newStudentRef = doc(collection(db, 'term-test-student-results'));

                batch.set(newStudentRef, {
                    sheetId: sheetRef.id,
                    year: currentMeta.year,
                    term: currentMeta.term,
                    grade: currentMeta.grade,
                    class: currentMeta.class,
                    stream: currentMeta.stream,
                    indexNumber: student.indexNumber,
                    name: student.name,
                    total: student.total,       
                    average: student.average,   
                    position: student.position, 
                    results: student.results,   
                    createdAt: new Date().toISOString()
                });

                countInBatch++;
                totalSaved++;

                if (countInBatch === BATCH_SIZE || i === parsedSheetStudents.length - 1) {
                    await batch.commit();
                    batch = writeBatch(db);
                    countInBatch = 0;
                }

                const tr = document.getElementById(`tr-student-${i}`);
                if (tr) {
                    tr.classList.add('uploaded-row');
                    const statusTd = tr.querySelector('.status-cell');
                    if (statusTd) {
                        statusTd.innerHTML = `<span class="status-pill saved"><i class="fa-solid fa-check"></i> Saved</span>`;
                    }
                }
            }

            showToast(`සියලුම (${totalSaved}) Results සාර්ථකව Firestore එකට Save විය!`, 'ok');
            ttForm.reset();
            loadTermTestList();

        } catch (err) {
            console.error('Batch Upload Error:', err);
            showToast('Save කිරීමේදී දෝෂයක් විය: ' + err.message, 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Add to Firestore`;
        }
    });

    loadTermTestList();
}

async function fetchAndParseGoogleSheet(sheetUrl) {
    const matches = sheetUrl.match(/\/d\/([a-zA-Z0-9\-_]+)/i);
    if (!matches || !matches[1]) {
        throw new Error('අවලංගු Google Sheet Link එකකි!');
    }
    const spreadsheetId = matches[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=mark%20sheet`;

    const response = await fetch(csvUrl);
    if (!response.ok) {
        throw new Error('Google Sheet එක Share කර "Anyone with the link can view" ලබා දී ඇත්දැයි බලන්න.');
    }

    const csvText = await response.text();
    return parseCSVToStudentResults(csvText);
}

function parseCSVToStudentResults(csvText) {
    const lines = csvText.split(/\r\n|\n/).map(l => parseCSVLine(l)).filter(row => row.some(cell => cell.trim() !== ''));

    if (lines.length < 2) {
        throw new Error('Sheet එකේ දත්ත නොමැත!');
    }

    let headerRowIdx = -1;

    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const row = lines[i].map(c => c.toLowerCase().trim());
        const hasIndex = row.some(c => c.includes('index') || c.includes('විභාග අංකය') || c.includes('අංකය'));
        const hasName = row.some(c => c.includes('name') || c.includes('නම') || c.includes('student name'));

        if (hasIndex && hasName) {
            headerRowIdx = i;
            break;
        }
    }

    if (headerRowIdx === -1) {
        throw new Error('Index No හෝ Name තීරු (Columns) සොයා ගැනීමට නොහැකි විය. Sheet එක නිවැරදි දැයි බලන්න.');
    }

    const row1 = lines[headerRowIdx];
    const row2 = (headerRowIdx + 1 < lines.length) ? lines[headerRowIdx + 1] : [];

    let indexColIdx = row1.findIndex(c => c.toLowerCase().includes('index') || c.toLowerCase().includes('විභාග අංකය') || c.toLowerCase().includes('අංකය'));
    if (indexColIdx === -1) indexColIdx = row2.findIndex(c => c.toLowerCase().includes('index') || c.toLowerCase().includes('විභාග අංකය') || c.toLowerCase().includes('අංකය'));

    let isRow2Header = false;
    if (indexColIdx !== -1 && row2[indexColIdx] && row2[indexColIdx].trim() === '') {
        isRow2Header = true; 
    }

    let colMap = { index: -1, name: -1, total: -1, average: -1, position: -1, subjects: [] };
    const maxCols = Math.max(row1.length, isRow2Header ? row2.length : 0);

    for (let i = 0; i < maxCols; i++) {
        let val1 = row1[i] ? row1[i].trim() : '';
        let val2 = (isRow2Header && row2[i]) ? row2[i].trim() : '';
        
        let colName = val1;
        if (val2 !== '') { colName = val2; } 

        let lowerCol = colName.toLowerCase();
        if (!colName) continue;

        if (lowerCol.includes('index') || lowerCol.includes('විභාග අංකය') || lowerCol.includes('අංකය')) {
            colMap.index = i;
        } else if (lowerCol.includes('name') || lowerCol.includes('නම') || lowerCol.includes('student name')) {
            colMap.name = i;
        } else if (lowerCol.includes('total') || lowerCol.includes('එකතුව')) {
            colMap.total = i;
        } else if (lowerCol.includes('average') || lowerCol.includes('avg') || lowerCol.includes('සාමාන්‍යය')) {
            colMap.average = i;
        } else if (lowerCol.includes('position') || lowerCol.includes('rank') || lowerCol.includes('place') || lowerCol.includes('ස්ථානය')) {
            colMap.position = i;
        } else {
            const ignoredKeywords = ['bucket', 'main subject', 'optional'];
            const isIgnored = ignoredKeywords.some(key => lowerCol.includes(key));
            
            if (!isIgnored && i !== colMap.index && i !== colMap.name) {
                colMap.subjects.push({ index: i, name: colName });
            }
        }
    }

    const students = [];
    let dataStartRow = isRow2Header ? headerRowIdx + 2 : headerRowIdx + 1;

    for (let i = dataStartRow; i < lines.length; i++) {
        const row = lines[i];
        if (!row || row.length === 0) continue;

        const indexNum = colMap.index !== -1 && row[colMap.index] ? row[colMap.index].trim() : '';
        const name = colMap.name !== -1 && row[colMap.name] ? row[colMap.name].trim() : '';

        if (!indexNum || indexNum === '' || indexNum.toLowerCase().includes('index')) {
            continue; 
        }

        const results = {};
        colMap.subjects.forEach(sub => {
            const mark = row[sub.index] ? row[sub.index].trim() : '';
            
            if (mark !== '' && mark !== '-') {
                results[sub.name] = mark; 
            }
        });

        const total = colMap.total !== -1 && row[colMap.total] ? row[colMap.total].trim() : '';
        const average = colMap.average !== -1 && row[colMap.average] ? row[colMap.average].trim() : '';
        const position = colMap.position !== -1 && row[colMap.position] ? row[colMap.position].trim() : '';

        students.push({
            indexNumber: indexNum,
            name: name,
            total: total,
            average: average,
            position: position,
            results: results
        });
    }

    return students;
}

function parseCSVLine(text) {
    let p = '', c = '', r = [];
    let q = false;
    for (let i = 0; i < text.length; i++) {
        c = text[i];
        if (c === '"') {
            if (q && text[i + 1] === '"') { p += '"'; i++; } else { q = !q; }
        } else if (c === ',' && !q) {
            r.push(p); p = '';
        } else {
            p += c;
        }
    }
    r.push(p);
    return r;
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
            const isAB = mark.toLowerCase() === 'ab';
            resultsHTML += `<div class="sub-tag" ${isAB ? 'style="color:red; border-color:red;"' : ''}>${sub}: <span>${mark}</span></div>`;
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
            <td>
                ${resultsHTML}
                ${statsHTML}
            </td>
            <td class="status-cell" style="text-align: center;">
                <span class="status-pill">Pending</span>
            </td>
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
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem;">එකතු කළ Sheets කිසිවක් නොමැත.</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const item = document.createElement('div');
            item.className = 'contact-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.marginBottom = '10px';
            item.style.padding = '12px 16px';
            item.style.background = 'var(--surface-color)';
            item.style.border = '1px solid var(--border-color)';
            item.style.borderRadius = '12px';

            item.innerHTML = `
                <div>
                    <i class="fa-solid fa-file-excel" style="color:#10b981; margin-right:10px; font-size: 1.2rem;"></i>
                    <span><strong>${d.year}</strong> | ${d.term} | Grade ${d.grade}-${d.class} ${d.stream ? `(${d.stream})` : ''} <small style="color:var(--text-muted); margin-left:8px;">(${d.studentCount || 0} Students)</small></span>
                </div>
                <div style="display:flex; gap:8px;">
                    <a href="${d.sheetUrl}" target="_blank" class="btn btn-ghost" style="padding:6px 12px; font-size:0.8rem;">Open Sheet</a>
                    <button class="btn btn-danger btn-delete-tt" data-id="${docSnap.id}" style="padding:6px 12px; font-size:0.8rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            fragment.appendChild(item);
        });

        container.appendChild(fragment);

        container.querySelectorAll('.btn-delete-tt').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('මෙම Sheet Link එක සහ අදාළ Results Records Delete කිරීමට තහවුරු කරන්න?')) {
                    try {
                        await deleteDoc(doc(db, 'term-test-results', btn.dataset.id));
                        showToast('Delete විය', 'ok');
                        loadTermTestList();
                    } catch (err) {
                        showToast('Delete දෝෂයක්: ' + err.message, 'error');
                    }
                }
            });
        });

    } catch (err) {
        console.error(err);
    }
}

// ==========================================
// 6. DOCUMENTS MODULE
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
// 7. GEMINI API MODULE
// ==========================================
function initGeminiModule() {
    $('geminiKeyForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const keyVal = $('geminiKeyInput').value.trim();
        if (!keyVal) return;

        try {
            await addDoc(collection(db, 'api'), {
                apiKey: keyVal,
                createdAt: new Date().toISOString()
            });
            showToast('Gemini API Key එක සාර්ථකව Save විය!', 'ok');
            $('geminiKeyInput').value = '';
            loadGeminiKeys();
        } catch (err) {
            showToast(err.message, 'error');
        }
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
            card.className = 'contact-item';
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'space-between';
            card.style.marginBottom = '10px';
            card.style.padding = '10px';
            card.style.border = '1px solid var(--border-color)';
            card.style.borderRadius = '6px';

            card.innerHTML = `
                <div>
                    <i class="fa-solid fa-key" style="color:#ffd966; margin-right:8px;"></i>
                    <span>${keyMasked}</span>
                </div>
                <button class="btn btn-danger btn-delete-key" data-id="${docSnap.id}" style="padding:4px 10px;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            fragment.appendChild(card);
        });

        container.appendChild(fragment);

        container.querySelectorAll('.btn-delete-key').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('මෙම API Key එක Delete කිරීමට තහවුරු කරන්න?')) {
                    await deleteDoc(doc(db, 'api', btn.dataset.id));
                    showToast('Key එක Delete විය', 'ok');
                    loadGeminiKeys();
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
}

// ==========================================
// 8. TERM TEST — TEST PREVIEW + ANALYSIS (O/L & A/L) + PDF
// ==========================================
let olCharts = { pf: null, grade: null };
let alCharts = { pf: null, grade: null };
let olAnalysisData = null;
let alAnalysisData = null;

/* ---------- Grade helper ---------- */
function calcGrade(m) {
    const x = parseFloat(m);
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
        const k = s.toLowerCase().trim();
        return !k.includes('grade') && !k.includes('class') && !k.includes('stream') && !k.includes('position');
    });
}

function initTermAnalysisModule() {
    /* ---------- Test Preview ---------- */
    const btnTest = document.getElementById('btnTestResult');
    btnTest?.addEventListener('click', async () => {
        const year   = document.getElementById('testYear')?.value.trim();
        const term   = document.getElementById('testTerm')?.value;
        const grade  = document.getElementById('testGrade')?.value;
        const cls    = document.getElementById('testClass')?.value;
        const idx    = document.getElementById('testIndex')?.value.trim();

        const out = document.getElementById('testResultOutput');
        if (!out) return;

        if (!year || !term || !grade) { showToast('Please fill Year/Term/Grade', 'error'); return; }

        out.style.display = 'block';
        out.innerHTML = `<div class="test-empty-msg"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>`;

        try {
            const filters = [
                where('year', '==', String(year)),
                where('term', '==', term),
                where('grade', '==', String(grade))
            ];
            if (cls) filters.push(where('class', '==', cls));
            if (idx) filters.push(where('indexNumber', '==', idx));

            const q = query(collection(db, 'term-test-student-results'), ...filters);
            const snap = await getDocs(q);

            if (snap.empty) {
                out.innerHTML = `<div class="test-empty-msg"><i class="fa-solid fa-circle-info"></i> No records found for this filter.</div>`;
                return;
            }

            const docs = snap.docs.map(d => d.data());
            const student = idx ? docs[0] : docs[Math.floor(Math.random() * docs.length)];

            const results = student.results || {};
            const subjects = getSubjects(results);

            const gradeNum = parseInt(student.grade);
            let passStatus = 'FAIL';
            let statusText = '';

            if (gradeNum === 10 || gradeNum === 11) {
                const passes = subjects.filter(([, m]) => isPassGrade(calcGrade(m))).length;
                const credits = subjects.filter(([, m]) => isCreditGrade(calcGrade(m)));
                
                // Check for Sinhala and Maths passing logic
                const sinhalaSub = subjects.find(([s]) => s.toLowerCase().includes('sinhala') || s.includes('සිංහල'));
                const sinhalaGrade = sinhalaSub ? calcGrade(sinhalaSub[1]) : 'W';
                const hasSinhalaCredit = isCreditGrade(sinhalaGrade);

                const mathsSub = subjects.find(([s]) => s.toLowerCase().includes('math') || s.includes('ගණිතය'));
                const mathsGrade = mathsSub ? calcGrade(mathsSub[1]) : 'W';
                const hasMathsPass = isPassGrade(mathsGrade);

                const aCount = subjects.filter(([, m]) => calcGrade(m) === 'A').length;
                let aText = aCount >= 6 ? ` (${aCount}A)` : '';

                if (passes >= 6 && credits.length >= 3 && hasSinhalaCredit && hasMathsPass) {
                    passStatus = 'PASS';
                    statusText = `Passed${aText} (Sinhala: ${sinhalaGrade}, Maths: ${mathsGrade})`;
                } else {
                    statusText = `Failed (P:${passes}, C:${credits.length}, Sin:${sinhalaGrade}, Math:${mathsGrade})`;
                }
            } else if (gradeNum === 12 || gradeNum === 13) {
                const sPasses = subjects.filter(([, m]) => isPassGrade(calcGrade(m))).length;
                if (sPasses >= 3) {
                    passStatus = 'PASS';
                    statusText = `Passed with ${sPasses} S-passes`;
                } else {
                    statusText = `Failed (Passes: ${sPasses}/3)`;
                }
            } else {
                statusText = 'Pass/Fail calculation available for O/L & A/L only';
                passStatus = 'N/A';
            }

            const subjHTML = subjects.map(([sub, marks]) => {
                const g = calcGrade(marks);
                return `<div class="test-result-subject">
                    <span class="sub-name">${sub}</span>
                    <span>
                        <span class="sub-marks">${marks}</span>
                        <span class="sub-grade grade-${g}">${g}</span>
                    </span>
                </div>`;
            }).join('');

            out.innerHTML = `
                <div class="test-result-header">
                    <div>
                        <h4><i class="fa-solid fa-user-graduate"></i> ${student.name || 'Unknown'}</h4>
                        <p style="color:var(--text-muted); font-size:0.82rem; margin-top:4px;">
                            Index: ${student.indexNumber || '—'} • Grade ${student.grade || '—'} - Class ${student.class || '—'} • ${student.stream || ''}
                        </p>
                    </div>
                    <span class="test-result-pill ${passStatus === 'PASS' ? 'pill-pass' : passStatus === 'FAIL' ? 'pill-fail' : ''}">
                        ${passStatus}
                    </span>
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

            showToast(`Result loaded for ${student.name || student.indexNumber}`, 'ok');
        } catch (err) {
            console.error(err);
            out.innerHTML = `<div class="test-empty-msg" style="color:#f87171;"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</div>`;
        }
    });

    /* ---------- Generate buttons ---------- */
    document.getElementById('btnGenerateOl')?.addEventListener('click', async () => {
        const year = document.getElementById('olAnalysisYear').value;
        const term = document.getElementById('olAnalysisTerm').value;
        const grade = document.getElementById('olAnalysisGrade').value;

        showToast('Generating O/L analysis...', 'ok');
        try {
            const students = await fetchStudents('ol', year, term, grade);
            if (!students.length) { showToast('No O/L records found', 'error'); return; }
            olAnalysisData = { year, term, grade, summary: computeAnalysis(students, 'ol') };
            renderAnalysis('ol', olAnalysisData.summary);
            document.getElementById('olAnalysisResult').style.display = 'block';
            document.getElementById('btnSaveOl').disabled = false;
            document.getElementById('btnPdfOl').disabled = false;
            showToast('O/L analysis generated!', 'ok');
        } catch (e) { console.error(e); showToast(e.message, 'error'); }
    });

    document.getElementById('btnGenerateAl')?.addEventListener('click', async () => {
        const year = document.getElementById('alAnalysisYear').value;
        const term = document.getElementById('alAnalysisTerm').value;
        const grade = document.getElementById('alAnalysisGrade').value;

        showToast('Generating A/L analysis...', 'ok');
        try {
            const students = await fetchStudents('al', year, term, grade);
            if (!students.length) { showToast('No A/L records found', 'error'); return; }
            alAnalysisData = { year, term, grade, summary: computeAnalysis(students, 'al') };
            renderAnalysis('al', alAnalysisData.summary);
            document.getElementById('alAnalysisResult').style.display = 'block';
            document.getElementById('btnSaveAl').disabled = false;
            document.getElementById('btnPdfAl').disabled = false;
            showToast('A/L analysis generated!', 'ok');
        } catch (e) { console.error(e); showToast(e.message, 'error'); }
    });

    /* ---------- Save buttons ---------- */
    document.getElementById('btnSaveOl')?.addEventListener('click', () => saveAnalysis('ol'));
    document.getElementById('btnSaveAl')?.addEventListener('click', () => saveAnalysis('al'));

    /* ---------- PDF Print Preview buttons ---------- */
    document.getElementById('btnPdfOl')?.addEventListener('click', () => exportPdf('ol'));
    document.getElementById('btnPdfAl')?.addEventListener('click', () => exportPdf('al'));

    /* ---------- Tab switching ---------- */
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

    /* ---------- Init years ---------- */
    loadAnalysisYears().catch(console.error);
}

/* Load available years */
async function loadAnalysisYears() {
    const snapshot = await getDocs(collection(db, 'term-test-student-results'));
    const yearSet = new Set();
    snapshot.forEach(d => { const y = d.data().year; if (y) yearSet.add(String(y)); });
    const years = Array.from(yearSet).sort((a, b) => b - a);
    if (!years.length) years.push(String(new Date().getFullYear()));

    ['olAnalysisYear', 'alAnalysisYear'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    });
}

/* Compute analysis */
function computeAnalysis(students, mode) {
    const summary = {
        total: students.length,
        passed: 0,
        failed: 0,
        gradeBreakdown: {},
        subjectStats: {},
        students: [],
        achievers: { '9A': 0, '8A': 0, '7A': 0, '6A': 0 } // A Counts
    };

    students.forEach(st => {
        const g = String(st.grade || '');
        if (!summary.gradeBreakdown[g]) summary.gradeBreakdown[g] = { total: 0, passed: 0, failed: 0 };
        summary.gradeBreakdown[g].total++;

        const subjects = getSubjects(st.results || {});
        let isPass = false;
        let detail = '';
        
        const aCount = subjects.filter(([, m]) => calcGrade(m) === 'A').length;

        if (mode === 'ol') {
            const passes = subjects.filter(([, m]) => isPassGrade(calcGrade(m))).length;
            const credits = subjects.filter(([, m]) => isCreditGrade(calcGrade(m)));

            const sinhalaSub = subjects.find(([s]) => s.toLowerCase().includes('sinhala') || s.includes('සිංහල'));
            const hasSinhalaCredit = sinhalaSub ? isCreditGrade(calcGrade(sinhalaSub[1])) : false;

            const mathsSub = subjects.find(([s]) => s.toLowerCase().includes('math') || s.includes('ගණිතය'));
            const hasMathsPass = mathsSub ? isPassGrade(calcGrade(mathsSub[1])) : false;

            // Updated Pass Logic: 6 Passes, 3 Credits, Sinhala >= C, Maths >= S
            isPass = (passes >= 6 && credits.length >= 3 && hasSinhalaCredit && hasMathsPass);
            detail = `P:${passes}, C:${credits.length}, Sin:${hasSinhalaCredit?'C+':'<C'}, Math:${hasMathsPass?'S+':'Fail'}`;

            if (aCount === 9) summary.achievers['9A']++;
            else if (aCount === 8) summary.achievers['8A']++;
            else if (aCount === 7) summary.achievers['7A']++;
            else if (aCount === 6) summary.achievers['6A']++;

        } else {
            const sPasses = subjects.filter(([, m]) => isPassGrade(calcGrade(m))).length;
            isPass = sPasses >= 3;
            detail = `S passes: ${sPasses}/3`;
        }

        if (isPass) { summary.passed++; summary.gradeBreakdown[g].passed++; }
        else { summary.failed++; summary.gradeBreakdown[g].failed++; }

        subjects.forEach(([sub, m]) => {
            const grade = calcGrade(m);
            if (!summary.subjectStats[sub]) summary.subjectStats[sub] = { A:0, B:0, C:0, S:0, W:0 };
            summary.subjectStats[sub][grade]++;
        });

        summary.students.push({
            index: st.indexNumber, name: st.name, grade: st.grade, class: st.class,
            total: st.total, average: st.average, position: st.position,
            pass: isPass, detail, aCount
        });
    });

    summary.passRate = summary.total ? ((summary.passed / summary.total) * 100).toFixed(1) : '0.0';
    return summary;
}

/* Fetch students */
async function fetchStudents(mode, year, term, gradeFilter) {
    const grades = mode === 'ol' ? ['10', '11'] : ['12', '13'];
    const wanted = gradeFilter === 'all' ? grades : [String(gradeFilter)];
    const q = query(
        collection(db, 'term-test-student-results'),
        where('year', '==', String(year)),
        where('term', '==', term)
    );
    const snap = await getDocs(q);
    const out = [];
    snap.forEach(d => {
        const data = d.data();
        if (wanted.includes(String(data.grade))) out.push(data);
    });
    return out;
}

/* Render analysis UI */
function renderAnalysis(mode, summary) {
    const prefix = mode === 'ol' ? 'ol' : 'al';

    document.getElementById(`${prefix}StatTotal`).textContent = summary.total;
    document.getElementById(`${prefix}StatPass`).textContent  = summary.passed;
    document.getElementById(`${prefix}StatFail`).textContent  = summary.failed;
    document.getElementById(`${prefix}StatRate`).textContent  = `${summary.passRate}%`;

    const tbody = document.getElementById(`${prefix}BreakdownBody`);
    if (tbody) {
        tbody.innerHTML = Object.keys(summary.gradeBreakdown).sort().map(g => {
            const b = summary.gradeBreakdown[g];
            const rate = b.total ? ((b.passed / b.total) * 100).toFixed(1) : '0.0';
            return `<tr>
                <td><strong>Grade ${g}</strong></td>
                <td>${b.total}</td>
                <td style="color:#34d399; font-weight:800;">${b.passed}</td>
                <td style="color:#f87171; font-weight:800;">${b.failed}</td>
                <td><strong>${rate}%</strong></td>
            </tr>`;
        }).join('');
    }

    // Add Achievers section dynamically if it's O/L
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
                borderColor: '#1e293b',
                borderWidth: 4,
                hoverOffset: 10
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
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { weight: 700 }, usePointStyle: true, pointStyle: 'circle' } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { weight: 700 } } },
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#94a3b8', font: { weight: 700 } } }
            }
        }
    });
}

/* Save to Firestore */
async function saveAnalysis(mode) {
    const data = mode === 'ol' ? olAnalysisData : alAnalysisData;
    if (!data) return;

    const docId = mode === 'ol' ? 'ol_latest' : 'al_latest';
    const payload = {
        type: mode,
        year: data.year,
        term: data.term,
        gradeFilter: data.grade,
        totalStudents: data.summary.total,
        passed: data.summary.passed,
        failed: data.summary.failed,
        passRate: parseFloat(data.summary.passRate),
        gradeBreakdown: data.summary.gradeBreakdown,
        subjectStats: data.summary.subjectStats,
        achievers: data.summary.achievers || {},
        generatedAt: serverTimestamp(),
        generatedBy: currentAdminRole || null
    };

    try {
        await setDoc(doc(db, 'term-test-analysis', docId), payload, { merge: true });
        showToast(`${mode.toUpperCase()} analysis saved!`, 'ok');
    } catch (e) {
        console.error(e);
        showToast('Save failed: ' + e.message, 'error');
    }
}

/* Native Print Preview (Replacing html2pdf) */
async function exportPdf(mode) {
    const data = mode === 'ol' ? olAnalysisData : alAnalysisData;
    if (!data) return;

    const resultBox = document.getElementById(mode === 'ol' ? 'olAnalysisResult' : 'alAnalysisResult');
    if (!resultBox) return;

    // Clone the node to avoid mutating the live DOM
    const clone = resultBox.cloneNode(true);
    
    // Replace charts/canvases with image elements in the cloned node so they render in print
    const originalCanvases = resultBox.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');
    
    originalCanvases.forEach((canvas, index) => {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        if(clonedCanvases[index] && clonedCanvases[index].parentNode) {
            clonedCanvases[index].parentNode.replaceChild(img, clonedCanvases[index]);
        }
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${mode.toUpperCase()} Term Test Analysis Print</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    padding: 30px; 
                    color: #000; 
                    background: #fff; 
                    line-height: 1.5;
                }
                .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                h2, h3, h4 { margin: 5px 0; }
                p { margin: 5px 0; }
                
                /* Layout styling */
                .exam-table-card table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
                .exam-table-card th, .exam-table-card td { border: 1px solid #000; padding: 10px; text-align: center; }
                .exam-table-card th { background-color: #f2f2f2 !important; }
                
                /* Cards */
                .summary-stat-card { 
                    display: inline-block; width: 22%; margin: 1%; padding: 15px; 
                    border: 1px solid #000; text-align: center; box-sizing: border-box; 
                    border-radius: 8px;
                }
                .stat-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                .stat-label { font-size: 14px; text-transform: uppercase; color: #333; }
                
                /* Charts layout */
                .exam-charts-grid { display: flex; justify-content: space-between; margin-top: 30px; flex-wrap: wrap; }
                .exam-chart-card { width: 48%; border: 1px solid #000; padding: 15px; border-radius: 8px; box-sizing: border-box; margin-bottom: 20px; text-align: center;}
                .chart-container { margin-top: 15px; }
                
                /* Top Achievers Box (O/L) */
                #olAchieversBox { margin-top: 25px; border: 1px solid #000; padding: 15px; border-radius: 8px; }
                #olAchieversBox h4 { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
                #olAchieversBox div { display: flex; gap: 15px; }
                #olAchieversBox div > div { padding: 5px 10px; border: 1px solid #666; border-radius: 5px; }

                /* Hide Interactive UI Elements */
                button, .btn { display: none !important; }
                
                @media print {
                    .exam-charts-grid { display: block; }
                    .exam-chart-card { width: 100%; page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h2>A/Maithripala Senanayake Central College</h2>
                <h3>${mode === 'ol' ? 'O/L (Grade 10 & 11)' : 'A/L (Grade 12 & 13)'} Term Test Analysis</h3>
                <p><strong>Year:</strong> ${data.year} &nbsp;|&nbsp; <strong>Term:</strong> ${data.term} &nbsp;|&nbsp; <strong>Grade Filter:</strong> ${data.grade === 'all' ? 'All' : 'Grade ' + data.grade}</p>
            </div>
            ${clone.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    
    // Slight delay to ensure images (converted canvases) load before printing
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, 800);
    
    showToast('Print Preview විවෘත වේ...', 'ok');
}

/* Service worker registration */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('a-sw.js').catch(() => {});
}
// Term Test Section Main Tabs Logic
const tabManageResults = document.getElementById('tabManageResults');
const tabAnalysisMain = document.getElementById('tabAnalysisMain');
const manageResultsWrapper = document.getElementById('manageResultsWrapper');
const analysisMainWrapper = document.getElementById('analysisMainWrapper');

if(tabManageResults && tabAnalysisMain) {
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

// PDF Preview Modal Logic (Example for opening/closing)
const pdfPreviewModalOverlay = document.getElementById('pdfPreviewModalOverlay');
const closePdfModal = document.getElementById('closePdfModal');
const btnCancelPdf = document.getElementById('btnCancelPdf');

// ඔබගේ කලින් තිබුණු btnPdfOl සහ btnPdfAl දැන් Preview විදියට වෙනස් කර ඇත (btnPdfPreviewOl / btnPdfPreviewAl)
// ඒවා ක්ලික් කළ විට Modal එක Open වීමට පහත කේතය භාවිතා කරන්න (ඔබේ අවශ්‍යතාවය අනුව වෙනස් කරගන්න)
function openPdfPreview(contentToPreview) {
    const pdfContentArea = document.getElementById('pdfContentArea');
    // අවශ්‍ය නම් මෙතනට Chart වල පින්තූර සහ Data Table එක Clone කරලා දාන්න
    pdfContentArea.innerHTML = "<h4>Analysis Data Preview</h4><p>Your charts and tables will appear here before downloading.</p>"; 
    pdfPreviewModalOverlay.classList.add('active');
}

if(closePdfModal) closePdfModal.addEventListener('click', () => pdfPreviewModalOverlay.classList.remove('active'));
if(btnCancelPdf) btnCancelPdf.addEventListener('click', () => pdfPreviewModalOverlay.classList.remove('active'));

// O/L View PDF Button Action
const btnPdfPreviewOl = document.getElementById('btnPdfPreviewOl');
if(btnPdfPreviewOl) {
    btnPdfPreviewOl.addEventListener('click', () => {
        openPdfPreview(); // මෙතනට O/L Data යවන්න
    });
}

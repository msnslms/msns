// Import Firebase ES Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp 
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
        const uname = $('loginUsername').value.trim();
        const pwd = $('loginPassword').value.trim();

        try {
            let adminDocRef = doc(db, 'admin-users', uname);
            let adminSnap = await getDoc(adminDocRef);

            let userData = null;
            let detectedRole = null;

            if (adminSnap.exists()) {
                userData = adminSnap.data();
                detectedRole = adminSnap.id;
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
                currentAdminRole = detectedRole.toLowerCase();
                sessionStorage.setItem('adminRole', currentAdminRole);
                $('loginModal')?.classList.remove('active');
                applyRolePermissions();
                showToast('සාර්ථකව Login විය!', 'ok');
            } else {
                showToast('Username හෝ Password වැරදිය!', 'error');
            }
        } catch (err) {
            console.error(err);
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
    
    const searchTerm = $('userSearchInput')?.value.toLowerCase() || '';
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

    filtered.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card';
        const name = user.fullName || user.displayName || user.name || 'Unnamed User';
        const index = user.indexNum || user.indexNumber || 'N/A';
        const className = user.className || user.class || 'N/A';

        card.innerHTML = `
            <div class="user-card-top" style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
                <div class="user-avatar" style="width:40px; height:40px; border-radius:50%; background:#ffd966; color:#000; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                    ${name[0].toUpperCase()}
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
        container.appendChild(card);
    });

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
        const deletePromises = [];
        aiSnap.forEach((aiDoc) => {
            deletePromises.push(deleteDoc(doc(db, 'ai', aiDoc.id)));
        });
        await Promise.all(deletePromises);

        showToast('User සහ අදාළ දත්ත සාර්ථකව Delete විය!', 'ok');
        loadUsersData();
    } catch (err) {
        showToast('Delete කිරීම අසාර්ථකයි: ' + err.message, 'error');
    }
}

// ==========================================
// 3. NEWS UPDATE MODULE (Fixed 100%)
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
            // Upload to ImgBB if file is selected
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

            // Base news object (common for both add & update)
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
                // EDIT existing news - preserve createdAt & views
                await updateDoc(doc(db, 'news', id), newsObject);
                showToast('News එක යාවත්කාලීන විය!', 'ok');
            } else {
                // ADD new news - initialize views & createdAt
                newsObject.views = 0;
                newsObject.createdAt = serverTimestamp(); // 🔥 Firestore Timestamp for proper sorting
                await addDoc(collection(db, 'news'), newsObject);
                showToast('News එක සාර්ථකව පලකෙරිණි!', 'ok');
            }

            $('newsForm').reset();
            $('newsId').value = '';
            if ($('newsImageUrl')) $('newsImageUrl').value = '';
            if ($('imagePreviewBox')) $('imagePreviewBox').innerHTML = '';
            
            // Reset date to today
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
        console.log('📰 Loading news list from Firestore...');
        const snap = await getDocs(collection(db, 'news'));
        container.innerHTML = '';

        console.log('📄 News docs count:', snap.size);

        if (snap.empty) {
            container.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding:20px;">පලකළ පුවත් කිසිවක් නැත.</p>';
            return;
        }

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
            container.appendChild(card);
        });

        // Edit Button Event Listener
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

        // Delete Button Event Listener
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
        console.error('❌ Error loading news list:', err);
        container.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:20px;">News ලැයිස්තුව ලෝඩ් කිරීමේදී දෝෂයක්: ${err.message}</p>`;
        showToast('News ලැයිස්තුව ලෝඩ් කිරීමේදී දෝෂයක් සිදුවිය', 'error');
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
// 5. TERM TEST RESULT MODULE
// ==========================================
function initTermTestModule() {
    $('ttGrade')?.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if ($('streamFieldBox')) {
            $('streamFieldBox').style.display = (val === 12 || val === 13) ? 'block' : 'none';
        }
    });

    $('termTestForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const docData = {
            year: $('ttYear').value,
            term: $('ttTerm').value,
            grade: $('ttGrade').value,
            class: $('ttClass').value,
            stream: (parseInt($('ttGrade').value) >= 12) ? $('ttStream').value : '',
            sheetUrl: $('ttSheetUrl').value.trim(),
            createdAt: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, 'term-test-results'), docData);
            showToast('Term Test Sheet එක සාර්ථකව එකතු විය!', 'ok');
            $('termTestForm').reset();
            loadTermTestList();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    loadTermTestList();
}

async function loadTermTestList() {
    const container = $('termTestList');
    if (!container) return;
    try {
        const snap = await getDocs(collection(db, 'term-test-results'));
        container.innerHTML = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const item = document.createElement('div');
            item.className = 'contact-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.marginBottom = '10px';
            item.style.padding = '10px';
            item.style.border = '1px solid var(--border-color)';
            item.style.borderRadius = '6px';

            item.innerHTML = `
                <div>
                    <i class="fa-solid fa-file-excel" style="color:#10b981; margin-right:8px;"></i>
                    <span><strong>${d.year}</strong> | ${d.term} | Grade ${d.grade}-${d.class} ${d.stream ? `(${d.stream})` : ''}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <a href="${d.sheetUrl}" target="_blank" class="btn btn-ghost" style="padding:4px 10px;">Open</a>
                    <button class="btn btn-danger btn-delete-tt" data-id="${docSnap.id}" style="padding:4px 10px;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });

        container.querySelectorAll('.btn-delete-tt').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('මෙම Sheet Link එක Delete කිරීමට තහවුරු කරන්න?')) {
                    await deleteDoc(doc(db, 'term-test-results', btn.dataset.id));
                    showToast('Delete විය', 'ok');
                    loadTermTestList();
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
}

// ==========================================
// 6. PAST PAPERS & DOCUMENTS MODULE
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
            container.appendChild(card);
        });

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

/* Admin app service worker */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('a-sw.js');
}


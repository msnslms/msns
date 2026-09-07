    // Firebase v10 Modular Imports
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
    import { 
        getAuth, 
        onAuthStateChanged, 
        signOut, 
        deleteUser 
    } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
    import { 
        getFirestore, 
        doc, 
        getDoc, 
        setDoc, 
        updateDoc, 
        deleteDoc,
        query,
        collection,
        where,
        getDocs
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

    // Initialize Firebase Services
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let currentUser = null;
    let currentProfile = null;

    // Helper Selector
    const $ = (id) => document.getElementById(id);

    // Toast Notification
    function showToast(msg, type = '') {
        const t = $('toast');
        if (!t) return;
        t.textContent = msg;
        t.className = 'toast show ' + type;
        setTimeout(() => t.classList.remove('show'), 3200);
    }

    // Modal Close Functions (Global)
    window.closeEditModal = () => $('editModal')?.classList.remove('open');
    window.closeDeleteModal = () => $('deleteModal')?.classList.remove('open');

    // Sidebar Navigation
    const openSidebar = () => {
        $('sidebar')?.classList.add('active');
        $('menuOverlay')?.classList.add('active');
    };
    const closeSidebar = () => {
        $('sidebar')?.classList.remove('active');
        $('menuOverlay')?.classList.remove('active');
    };

    // Attach Sidebar Events
    document.addEventListener('DOMContentLoaded', () => {
        $('menuToggle')?.addEventListener('click', openSidebar);
        $('openMenu')?.addEventListener('click', openSidebar);
        $('closeMenu')?.addEventListener('click', closeSidebar);
        $('menuOverlay')?.addEventListener('click', closeSidebar);
    });

    // Barcode Visual Generator
    (function generateBarcode() {
        const container = $('barcodeBars');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 28; i++) {
            const bar = document.createElement('span');
            bar.style.height = (8 + Math.floor(Math.random() * 14)) + 'px';
            bar.style.opacity = Math.random() > 0.4 ? '0.8' : '0.4';
            container.appendChild(bar);
        }
    })();

    // Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;

        if (!user) {
            setViewState({ loading: false, signedOut: true, signedIn: false });
            return;
        }

        // Default Profile Object
        currentProfile = {
            displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
            email: user.email || '',
            photoURL: user.photoURL || '',
            role: "student",
            indexNo: "",
            indexLocked: false,
            baseGrade: "",
            studentClass: "",
            stream: "",
            subject: "",
            baseYear: new Date().getFullYear(),
            lastPromotionYear: new Date().getFullYear()
        };

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const snapshot = await getDoc(userDocRef);

            if (!snapshot.exists()) {
                await setDoc(userDocRef, currentProfile);
            } else {
                currentProfile = { ...currentProfile, ...snapshot.data() };
            }

            await checkAutoPromotion(userDocRef);
        } catch (err) {
            console.error("Firestore Error:", err);
            showToast("Firestore access error: " + err.message, "error");
        } finally {
            renderUI();
            setViewState({ loading: false, signedOut: false, signedIn: true });
        }
    });

    // View State Switcher
    function setViewState({ loading, signedOut, signedIn }) {
        if ($('loadingState')) $('loadingState').style.display = loading ? 'block' : 'none';
        if ($('signedOutState')) $('signedOutState').style.display = signedOut ? 'block' : 'none';
        if ($('signedInState')) $('signedInState').style.display = signedIn ? 'block' : 'none';
    }

    // Auto Grade Promotion Logic
    async function checkAutoPromotion(userDocRef) {
        if (!currentProfile || (currentProfile.role || '').toLowerCase() !== 'student' || !currentProfile.baseGrade) return;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0 = January, 7 = August

        let gradeNum = parseInt(currentProfile.baseGrade);
        if (isNaN(gradeNum)) return;

        let shouldPromote = false;

        // Normal Grades (6 to 11): Promoted in January
        if (gradeNum >= 6 && gradeNum <= 11) {
            if (currentMonth === 0 && currentProfile.lastPromotionYear !== currentYear) {
                shouldPromote = true;
            }
        } 
        // A/L Grades (12 to 13): Promoted in August
        else if (gradeNum === 12 || gradeNum === 13) {
            if (currentMonth === 7 && currentProfile.lastPromotionYear !== currentYear && gradeNum < 13) {
                shouldPromote = true;
            }
        }

        if (shouldPromote) {
            gradeNum += 1;
            currentProfile.baseGrade = String(gradeNum);
            currentProfile.lastPromotionYear = currentYear;
            
            await updateDoc(userDocRef, {
                baseGrade: currentProfile.baseGrade,
                lastPromotionYear: currentYear
            });

            if ($('promoBanner')) $('promoBanner').style.display = 'flex';
            if ($('promoBannerText')) $('promoBannerText').textContent = `Welcome back! You've been automatically promoted to Grade ${gradeNum}!`;
        }
    }

    // Render UI Based on Profile Data
    function renderUI() {
        if (!currentProfile) return;
        const role = (currentProfile.role || 'student').toLowerCase();
        const isTeacher = role === 'teacher';
        
        if ($('roleBadge')) {
            $('roleBadge').textContent = role.replace('_', ' ').toUpperCase();
            $('roleBadge').className = `role-badge ${role}`;
        }
        
        if ($('idName')) $('idName').textContent = currentProfile.displayName || 'User';
        if ($('idEmail')) $('idEmail').textContent = currentProfile.email || '—';
        
        if ($('idAvatar')) {
            const avatarUrl = currentProfile.photoURL || (currentUser ? currentUser.photoURL : '');
            if (avatarUrl) {
                $('idAvatar').innerHTML = `<img src="${avatarUrl}" alt="User Avatar">`;
            } else {
                $('idAvatar').textContent = (currentProfile.displayName || 'U').charAt(0).toUpperCase();
            }
        }

        if (isTeacher) {
            if ($('studentDetailsGrid')) $('studentDetailsGrid').style.display = 'none';
            if ($('teacherDetailsGrid')) $('teacherDetailsGrid').style.display = 'grid';
            if ($('idSubject')) $('idSubject').textContent = currentProfile.subject || 'Not Set';
            if ($('barcodeRow')) $('barcodeRow').style.display = 'none';
            if ($('studentActions')) $('studentActions').style.display = 'none';
            if ($('teacherActions')) $('teacherActions').style.display = 'block';
        } else {
            if ($('studentDetailsGrid')) $('studentDetailsGrid').style.display = 'grid';
            if ($('teacherDetailsGrid')) $('teacherDetailsGrid').style.display = 'none';
            if ($('barcodeRow')) $('barcodeRow').style.display = 'flex';
            if ($('studentActions')) $('studentActions').style.display = 'block';
            if ($('teacherActions')) $('teacherActions').style.display = 'none';

            if ($('idGrade')) $('idGrade').textContent = currentProfile.baseGrade ? `Grade ${currentProfile.baseGrade}` : 'Not Set';
            if ($('idClass')) $('idClass').textContent = currentProfile.studentClass || 'Not Set';
            if ($('idIndexNum')) $('idIndexNum').textContent = currentProfile.indexNo ? `INDEX: ${currentProfile.indexNo}` : 'INDEX: — — — —';

            const grade = parseInt(currentProfile.baseGrade);
            if (grade === 12 || grade === 13) {
                if ($('streamRow')) $('streamRow').style.display = 'block';
                if ($('idStream')) $('idStream').textContent = currentProfile.stream ? `A/L ${currentProfile.stream}` : 'Not Set';
            } else {
                if ($('streamRow')) $('streamRow').style.display = 'none';
            }
        }
    }

    // Role Selection Listener in Edit Modal
    $('inputRole')?.addEventListener('change', (e) => {
        const isTeacher = e.target.value === 'teacher';
        if ($('studentFormFields')) $('studentFormFields').style.display = isTeacher ? 'none' : 'block';
        if ($('teacherFormFields')) $('teacherFormFields').style.display = isTeacher ? 'block' : 'none';
    });

    // Stream Field Toggle in Edit Form
    $('inputGrade')?.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if ($('streamFieldWrap')) $('streamFieldWrap').style.display = (val === 12 || val === 13) ? 'block' : 'none';
    });

    // Logout
    $('btnLogout')?.addEventListener('click', () => {
        signOut(auth).then(() => showToast('Logged out successfully', 'ok'));
    });

    // Open Edit Modal with 1-Time Index Lock Check
    $('btnOpenEdit')?.addEventListener('click', () => {
        if (!currentProfile) return;
        if ($('inputName')) $('inputName').value = currentProfile.displayName || '';

        const role = (currentProfile.role || 'student').toLowerCase();
        if ($('inputRole')) $('inputRole').value = role;

        if (role === 'teacher') {
            if ($('studentFormFields')) $('studentFormFields').style.display = 'none';
            if ($('teacherFormFields')) $('teacherFormFields').style.display = 'block';
            if ($('inputSubject')) $('inputSubject').value = currentProfile.subject || '';
        } else {
            if ($('studentFormFields')) $('studentFormFields').style.display = 'block';
            if ($('teacherFormFields')) $('teacherFormFields').style.display = 'none';
            
            const idxInput = $('inputIndex');
            const lockNotice = $('indexLockNotice');

            // Lock field permanently if Index Number already exists
            if (currentProfile.indexNo) {
                if (idxInput) {
                    idxInput.value = currentProfile.indexNo;
                    idxInput.disabled = true;
                }
                if (lockNotice) lockNotice.style.display = 'block';
            } else {
                if (idxInput) {
                    idxInput.value = '';
                    idxInput.disabled = false;
                }
                if (lockNotice) lockNotice.style.display = 'none';
            }

            if ($('inputGrade')) $('inputGrade').value = currentProfile.baseGrade || '';
            if ($('inputClass')) $('inputClass').value = currentProfile.studentClass || '';
            if ($('inputStream')) $('inputStream').value = currentProfile.stream || '';

            const grade = parseInt(currentProfile.baseGrade);
            if ($('streamFieldWrap')) $('streamFieldWrap').style.display = (grade === 12 || grade === 13) ? 'block' : 'none';
        }

        $('editModal')?.classList.add('open');
    });

    // Save Profile & Verify Unique Index Number
    $('btnSaveProfile')?.addEventListener('click', async () => {
        const name = $('inputName')?.value.trim();
        const role = $('inputRole')?.value || 'student';

        if (!name) { showToast('නම ඇතුළත් කිරීම අනිවාර්ය වේ!', 'error'); return; }

        const updates = { 
            displayName: name,
            role: role 
        };

        if (role === 'teacher') {
            updates.subject = $('inputSubject')?.value.trim() || '';
        } else {
            const newIndex = $('inputIndex')?.value.trim() || '';

            // Unique Index Check in Firestore (Only if setting for the first time)
            if (!currentProfile.indexNo && newIndex) {
                try {
                    const q = query(collection(db, "users"), where("indexNo", "==", newIndex));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        showToast('මෙම Index Number එක වෙනත් අයෙකු භාවිත කර ඇත!', 'error');
                        return;
                    }
                    updates.indexNo = newIndex;
                    updates.indexLocked = true;
                } catch (err) {
                    console.error("Index check error:", err);
                    showToast('Index අංකය පරීක්ෂා කිරීමේදී දෝෂයක් ඇති විය', 'error');
                    return;
                }
            }

            updates.baseGrade = $('inputGrade')?.value || '';
            updates.studentClass = $('inputClass')?.value || '';
            const gradeNum = parseInt(updates.baseGrade);
            updates.stream = (gradeNum === 12 || gradeNum === 13) ? ($('inputStream')?.value || '') : '';
        }

        try {
            await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
            Object.assign(currentProfile, updates);
            renderUI();
            window.closeEditModal();
            showToast('Profile updated successfully!', 'ok');
        } catch (err) {
            console.error("Update Profile Error:", err);
            showToast('Failed to update profile: ' + err.message, 'error');
        }
    });

    // Delete Account Modal Trigger
    $('btnDeleteAccount')?.addEventListener('click', () => {
        if ($('deleteConfirmInput')) $('deleteConfirmInput').value = '';
        if ($('btnConfirmDelete')) $('btnConfirmDelete').disabled = true;
        $('deleteModal')?.classList.add('open');
    });

    // Enable Delete Button on 'DELETE' input
    $('deleteConfirmInput')?.addEventListener('input', (e) => {
        if ($('btnConfirmDelete')) $('btnConfirmDelete').disabled = e.target.value.trim().toUpperCase() !== 'DELETE';
    });

    // Fixed Confirm and Delete Account logic
    $('btnConfirmDelete')?.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            showToast('User session not found. Please log in again.', 'error');
            return;
        }

        const uid = user.uid;

        try {
            // 1. Delete Firestore User Document First
            await deleteDoc(doc(db, 'users', uid));

            // 2. Delete Authentication User Directly
            await deleteUser(user);

            window.closeDeleteModal();
            showToast('Account deleted successfully', 'ok');
            setViewState({ loading: false, signedOut: true, signedIn: false });
        } catch (err) {
            console.error("Delete Account Error:", err);
            if (err.code === 'auth/requires-recent-login') {
                showToast('ආරක්ෂිත පියවරක් ලෙස, Account එක Delete කිරීමට පෙර නැවත Logout වී Login වන්න.', 'error');
            } else {
                showToast('Account එක Delete කිරීම අසාර්ථක විය: ' + err.message, 'error');
            }
        }
    });

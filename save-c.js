/**
 * save-c.js - MSNS Portal Local Caching & Instant Loading Engine
 * Caches User Profile, Authentication State, Chat History, and Messages locally.
 * Instantly restores UI on page refresh without waiting for Firestore network calls.
 */

(function () {
    const STORAGE_KEYS = {
        PROFILE: 'msns_cached_profile',
        CHAT_HISTORY: 'msns_cached_chat_history',
        CHAT_MESSAGES: 'msns_cached_chat_messages'
    };

    // ------------------------------------------------------------------------
    // 1. INSTANT RESTORE (පිටුව Load වෙන ක්ෂණයෙන්ම Local Storage වලින් Data දැමීම)
    // ------------------------------------------------------------------------
    function restoreCachedData() {
        // === Profile & User Info Restore (msns.ai.html & u.html) ===
        const cachedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
        if (cachedProfile) {
            try {
                const data = JSON.parse(cachedProfile);

                // Header / Dropdown UI (msns.ai.html)
                setText('userName', data.displayName);
                setText('userEmail', data.email);
                setText('userAvatar', data.firstLetter || (data.displayName ? data.displayName.charAt(0).toUpperCase() : 'U'));
                setText('dpUserName', data.displayName);
                setText('dpUserEmail', data.email);

                // Profile Page UI (u.html)
                setText('idName', data.displayName);
                setText('idEmail', data.email);
                
                if (data.avatarHtml) {
                    setHTML('idAvatar', data.avatarHtml);
                } else if (data.displayName) {
                    setText('idAvatar', data.displayName.charAt(0).toUpperCase());
                }

                if (data.role) {
                    const roleBadge = document.getElementById('roleBadge');
                    if (roleBadge) {
                        roleBadge.textContent = data.role.replace('_', ' ').toUpperCase();
                        roleBadge.className = `role-badge ${data.role.toLowerCase()}`;
                    }
                }

                setText('idGrade', data.baseGrade ? `Grade ${data.baseGrade}` : 'Not Set');
                setText('idClass', data.studentClass || 'Not Set');
                setText('idSubject', data.subject || 'Not Set');
                setText('idIndexNum', data.indexNo ? `INDEX: ${data.indexNo}` : 'INDEX: — — — —');
                setText('idStream', data.stream ? `A/L ${data.stream}` : 'Not Set');

                const grade = parseInt(data.baseGrade);
                showHide('streamRow', (grade === 12 || grade === 13));

                const isTeacher = (data.role || '').toLowerCase() === 'teacher';
                showHide('studentDetailsGrid', !isTeacher);
                showHide('teacherDetailsGrid', isTeacher);
                showHide('barcodeRow', !isTeacher);
                showHide('studentActions', !isTeacher);
                showHide('teacherActions', isTeacher);

                // u.html හි Loading Screen එක ක්ෂණිකව අයින් කර Profile එක පෙන්වයි
                showHide('loadingState', false);
                showHide('signedOutState', false);
                showHide('signedInState', true);

            } catch (e) {
                console.error("Cache restore error:", e);
            }
        }

        // === Chat History Restore (msns.ai.html) ===
        const cachedHistory = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
        if (cachedHistory) {
            setHTML('chatHistoryList', cachedHistory);
        }

        // === Messages Restore (msns.ai.html) ===
        const cachedMessages = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
        if (cachedMessages && cachedMessages.trim() !== '') {
            setHTML('chatMessages', cachedMessages);
            showHide('heroGreeting', false);
        }
    }

    // Helper functions
    function setText(id, text) {
        if (!text) return;
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function setHTML(id, html) {
        if (!html) return;
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    function showHide(id, show) {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? (id.includes('Grid') ? 'grid' : 'block') : 'none';
    }

    // DOM එක සූදානම් වූ වහාම දත්ත Restore කරයි
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', restoreCachedData);
    } else {
        restoreCachedData();
    }

    // ------------------------------------------------------------------------
    // 2. AUTO-SAVE & OBSERVE (Firestore එකෙන් UI එක වෙනස් වෙනවිට Local Storage එක Update කිරීම)
    // ------------------------------------------------------------------------
    function initCacheObservers() {
        // u.html Profile වෙනස්වීම් හඳුනාගැනීම
        const targetProfileName = document.getElementById('idName');
        if (targetProfileName) {
            const profileObserver = new MutationObserver(() => saveProfileFromDOM());
            profileObserver.observe(targetProfileName, { childList: true, characterData: true, subtree: true });
        }

        // msns.ai.html Chat History වෙනස්වීම් හඳුනාගැනීම
        const chatHistoryList = document.getElementById('chatHistoryList');
        if (chatHistoryList) {
            const historyObserver = new MutationObserver(() => {
                if (chatHistoryList.innerHTML.trim().length > 0) {
                    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, chatHistoryList.innerHTML);
                }
            });
            historyObserver.observe(chatHistoryList, { childList: true, subtree: true });
        }

        // msns.ai.html Messages වෙනස්වීම් හඳුනාගැනීම
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            const messagesObserver = new MutationObserver(() => {
                if (chatMessages.innerHTML.trim().length > 0) {
                    localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, chatMessages.innerHTML);
                }
            });
            messagesObserver.observe(chatMessages, { childList: true, subtree: true, characterData: true });
        }

        // msns.ai.html User Header වෙනස්වීම් හඳුනාගැනීම
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            const userObserver = new MutationObserver(() => saveHeaderUserFromDOM());
            userObserver.observe(userNameEl, { childList: true, characterData: true, subtree: true });
        }

        // Logout වෙනවිට Cache එක Clear කිරීම
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#logoutBtn, #btnLogout');
            if (btn) {
                localStorage.removeItem(STORAGE_KEYS.PROFILE);
                localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
                localStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES);
            }
        });
    }

    function saveProfileFromDOM() {
        const data = {
            displayName: document.getElementById('idName')?.textContent || '',
            email: document.getElementById('idEmail')?.textContent || '',
            role: document.getElementById('roleBadge')?.textContent || '',
            baseGrade: (document.getElementById('idGrade')?.textContent || '').replace('Grade ', ''),
            studentClass: document.getElementById('idClass')?.textContent || '',
            stream: (document.getElementById('idStream')?.textContent || '').replace('A/L ', ''),
            subject: document.getElementById('idSubject')?.textContent || '',
            indexNo: (document.getElementById('idIndexNum')?.textContent || '').replace('INDEX: ', '').replace(/—/g, '').trim(),
            avatarHtml: document.getElementById('idAvatar')?.innerHTML || ''
        };
        if (data.displayName && data.displayName !== '—') {
            localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(data));
        }
    }

    function saveHeaderUserFromDOM() {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE) || '{}');
        existing.displayName = document.getElementById('userName')?.textContent || existing.displayName;
        existing.email = document.getElementById('userEmail')?.textContent || existing.email;
        existing.firstLetter = document.getElementById('userAvatar')?.textContent || '';
        if (existing.displayName && existing.displayName !== 'Loading...') {
            localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(existing));
        }
    }

    window.addEventListener('load', initCacheObservers);
})();


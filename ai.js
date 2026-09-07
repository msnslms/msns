    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
    import { 
        getAuth, 
        onAuthStateChanged, 
        signOut 
    } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
    import { 
        getFirestore, 
        collection, 
        doc, 
        getDoc, 
        getDocs, 
        setDoc, 
        updateDoc, 
        deleteDoc, 
        addDoc, 
        serverTimestamp, 
        query, 
        orderBy, 
        limit, 
        onSnapshot 
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
    const analytics = getAnalytics(app);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let currentUser = null;
    let currentChatId = null;
    let isAiDisabled = false; // AI Status Tracker Flag

    // ------------------------------
    // 1. Authentication Guard
    // ------------------------------
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "u.html";
        } else {
            currentUser = user;
            updateUserProfileUI(user);
            listenToChatHistory(user.uid);
        }
    });

    function updateUserProfileUI(user) {
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : "User");
        const email = user.email || "";
        const firstLetter = displayName.charAt(0).toUpperCase();

        document.getElementById('userName').innerText = displayName;
        document.getElementById('userEmail').innerText = email;
        document.getElementById('userAvatar').innerText = firstLetter;
        document.getElementById('dpUserName').innerText = displayName;
        document.getElementById('dpUserEmail').innerText = email;
    }

    // ------------------------------
    // 2. User Dropdown Toggle
    // ------------------------------
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userDropdown = document.getElementById('userDropdown');

    userProfileBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (userDropdown && userProfileBtn && !userDropdown.contains(e.target) && !userProfileBtn.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "u.html";
        });
    });

    // ------------------------------
    // 3. Firestore Chat History Logic (Max 10 Chats)
    // ------------------------------
    const MAX_CHAT_COUNT = 10;

    function listenToChatHistory(uid) {
        const historyListDiv = document.getElementById('chatHistoryList');
        if (!historyListDiv) return;

        const chatsRef = collection(db, 'ai', uid, 'chats');
        const q = query(chatsRef, orderBy('createdAt', 'desc'), limit(MAX_CHAT_COUNT));

        onSnapshot(q, (snapshot) => {
            historyListDiv.innerHTML = "";

            if (snapshot.empty) {
                historyListDiv.innerHTML = `<div style="font-size:11.5px; color:rgba(255,255,255,0.4); text-align:center; padding:10px;">No recent chats found</div>`;
                return;
            }

            snapshot.forEach((docSnap) => {
                const chatId = docSnap.id;
                const chatData = docSnap.data();
                const itemDiv = document.createElement('div');
                itemDiv.className = `history-item ${chatId === currentChatId ? 'active-chat' : ''}`;

                itemDiv.innerHTML = `
                    <span class="history-item-title" title="${chatData.title || 'Chat'}">${chatData.title || 'Chat'}</span>
                    <div class="history-actions">
                        <button class="history-action-btn edit-btn" title="Rename"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="history-action-btn delete-btn delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;

                itemDiv.addEventListener('click', (e) => {
                    if (!e.target.closest('.history-action-btn')) {
                        loadChatSession(chatId);
                        userDropdown?.classList.remove('active');
                    }
                });

                // Rename chat
                itemDiv.querySelector('.edit-btn')?.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const newTitle = prompt("Rename Topic:", chatData.title);
                    if (newTitle && newTitle.trim() !== "") {
                        try {
                            await updateDoc(doc(db, 'ai', uid, 'chats', chatId), { title: newTitle.trim() });
                        } catch (err) {
                            console.error("Error renaming chat:", err);
                        }
                    }
                });

                // Delete chat
                itemDiv.querySelector('.delete-btn')?.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this chat?")) {
                        try {
                            await deleteDoc(doc(db, 'ai', uid, 'chats', chatId));
                            if (currentChatId === chatId) startNewChat();
                        } catch (err) {
                            console.error("Error deleting chat:", err);
                        }
                    }
                });

                historyListDiv.appendChild(itemDiv);
            });
        }, (error) => {
            console.error("Firestore Chat History Error:", error);
        });
    }

    function startNewChat() {
        currentChatId = null;
        const msgContainer = document.getElementById('chatMessages');
        if (msgContainer) msgContainer.innerHTML = "";
        const hero = document.getElementById('heroGreeting');
        if (hero) hero.style.display = 'flex';
    }

    document.getElementById('newChatBtn')?.addEventListener('click', () => {
        startNewChat();
        userDropdown?.classList.remove('active');
    });

    async function loadChatSession(chatId) {
        currentChatId = chatId;
        const msgContainer = document.getElementById('chatMessages');
        if (msgContainer) msgContainer.innerHTML = "";
        hideHeroGreeting();

        try {
            const messagesRef = collection(db, 'ai', currentUser.uid, 'chats', chatId, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'asc'));
            const snapshot = await getDocs(q);

            snapshot.forEach((docSnap) => {
                const msg = docSnap.data();
                const isUser = msg.sender === 'user';
                appendMessage(msg.text, isUser ? 'chat-msg user' : 'chat-msg bot', true);
            });
        } catch (err) {
            console.error("Error loading chat messages:", err);
        }
    }

    // ------------------------------
    // 4. Save Message to Firestore
    // ------------------------------
    async function saveMessageToDatabase(userText, botResponse) {
        if (!currentUser) return;
        const uid = currentUser.uid;

        try {
            if (!currentChatId) {
                await enforceChatLimitBeforeCreate(uid);

                const newChatRef = doc(collection(db, 'ai', uid, 'chats'));
                currentChatId = newChatRef.id;

                const shortTitle = userText.length > 30 ? userText.substring(0, 30) + "..." : userText;

                await setDoc(newChatRef, {
                    title: shortTitle,
                    createdAt: serverTimestamp()
                });
            }

            const messagesRef = collection(db, 'ai', uid, 'chats', currentChatId, 'messages');
            await addDoc(messagesRef, {
                sender: 'user',
                text: userText,
                timestamp: serverTimestamp()
            });
            await addDoc(messagesRef, {
                sender: 'bot',
                text: botResponse,
                timestamp: serverTimestamp()
            });
        } catch (err) {
            console.error("Firestore Save Message Error:", err);
        }
    }

    async function enforceChatLimitBeforeCreate(uid) {
        try {
            const chatsRef = collection(db, 'ai', uid, 'chats');
            const q = query(chatsRef, orderBy('createdAt', 'asc'));
            const snapshot = await getDocs(q);

            if (snapshot.size >= MAX_CHAT_COUNT) {
                const oldestDoc = snapshot.docs[0];
                await deleteDoc(oldestDoc.ref);
            }
        } catch (err) {
            console.error("Error enforcing chat limit:", err);
        }
    }

    // ------------------------------
    // 5. Gemini AI & Knowledge Base
    // ------------------------------
    const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1Y9xYMoedyzyr1fzC68Cz9emyRFr3WWkpFi4ZG8eCiaw/export?format=csv";
    let GEMINI_API_KEYS = [];
    let isFetchingKeys = false;

    const TXT_FILE_URLS = [
        "Grade_6_Mathematics.txt",
        "6_Sreniya_Ithihasaya_Sampurna_Sahanata.txt",
        "Grade_6_Health_and_Physical_Education_Short_Note.txt",
        "Grade_6_Buddhism_Notes.txt",
        "Grade_6_Science_Complete_Notes_Sinhala.txt",
        "Purawasi_Adhyapanaya_Grade_6_Full_Note.txt",
        "Geography_Grade_6_Full_Notes.txt",
        "Grade_6_Sinhala_Full_Notes.txt",
        "Grade_6_ICT_Short_Note.txt",
        "Grade_7_History_Complete_Notes.txt",
        "Grade_7_Health_Notes.txt",
        "Grade_7_Buddhism_Full_Notes.txt",
        "Grade_7_Geography_Full_Notes.txt",
        "Civic_Education_Grade_7_Full_Notes.txt",
    ];
    let EXTRA_TXT_KNOWLEDGE = "";

    async function loadTxtFilesKnowledge() {
        try {
            const fetchPromises = TXT_FILE_URLS.map(async (url) => {
                try {
                    const res = await fetch(url);
                    if (!res.ok) return "";
                    return await res.text();
                } catch (e) {
                    return "";
                }
            });
            const allContents = await Promise.all(fetchPromises);
            const validContents = allContents.filter(text => text && text.trim().length > 0);
            
            if (validContents.length > 0) {
                EXTRA_TXT_KNOWLEDGE = "\n\n=== අමතර .TXT පාඩම් සටහන් සහ තොරතුරු ===\n" + validContents.join("\n\n--- ඊළඟ ගොනුව ---\n\n");
            }
        } catch (err) {
            console.error("TXT Files Load Error:", err);
        }
    }

    loadTxtFilesKnowledge();

    async function fetchApiKeysFromSheet() {
        if (GEMINI_API_KEYS.length > 0) return GEMINI_API_KEYS;
        if (isFetchingKeys) {
            while (isFetchingKeys) {
                await new Promise(r => setTimeout(r, 100));
            }
            return GEMINI_API_KEYS;
        }

        isFetchingKeys = true;
        try {
            const response = await fetch(GOOGLE_SHEET_CSV_URL);
            if (!response.ok) throw new Error("API Keys Load කරගැනීමට නොහැකි විය.");
            const csvData = await response.text();
            
            const lines = csvData.split('\n');
            const extractedKeys = lines
                .map(line => line.split(',')[0].trim().replace(/^["']|["']$/g, ''))
                .filter(key => key.length > 10 && !key.toLowerCase().includes('key'));

            if (extractedKeys.length > 0) {
                GEMINI_API_KEYS = extractedKeys;
            }
        } catch (err) {
            console.error("API Keys Sheet Error:", err);
        } finally {
            isFetchingKeys = false;
        }
        return GEMINI_API_KEYS;
    }

    fetchApiKeysFromSheet();

    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

    const SYSTEM_INSTRUCTION = `
You are MSNS AI, the official digital smart assistant of A/Maithripala Senanayake Central College (Medawachchiya).

Your Instructions & Context:
1. School Name: A/Maithripala Senanayake Central College (අ/මෛත්‍රීපාල සේනානායක මධ්‍ය විද්‍යාලය - මැදවච්චිය).
2. School Category: Leading 1-AB Central College in Medawachchiya, Anuradhapura District, කොට්ඨාසය-කැබිතිගොල්ලෑව.
3. Phone: 025 224 5700
4. Email: maithripalasenanayakammv@gmail.com
5. Available A/L Streams: Arts (කලා), Commerce (වාණිජ), Maths/Physical Science (ගණිත), Bio Science (ජීව විද්‍යාව), and Technology Stream (Engineering Tech & Bio Systems Tech).
6. Navigation Links on Website:
   - Home:'msns-lms.github.io/msns/index.html'
   - Past Papers & Applications: Direct users to <a href='msns-lms.github.io/msns/Past.html'>Past Papers පිටුවට (Past.html)</a>.
   - History: 'msns-lms.github.io/msns/history.html'
   - News: 'msns-lms.github.io/msns/news.html'
   - Developer Page: 'ab.html' (Developed by K.D.G.S.M. Deniyegedara)
7. Core Capabilities:
   - Answer ANY school-related question using the above details.
   - Answer ANY general academic, general knowledge, science, IT, or everyday question using your broad knowledge as Gemini Flash.
8. Tone & Language:
   - Respond in friendly, respectful Sinhala (or English if the user asks in English).
   - Use bold (<b>) for key points or headings.
9. Website developer: A/L 2028 Tech student K.D.G Sandaru Malisha Deniyegedara (WhatsApp: 0712049343).
10. Exam Results Links:
   - O/L Results: msns-lms.github.io/msns/ol.html
   - A/L Results: msns-lms.github.io/msns/al.html
11. Images:
   - School Crest / Badge (පාසල් ලාංඡනය): "school bage.png" (පාසල් ලාංඡනය ගැන ඇසුවොත් <img src="school bage.png" class="chat-media-img" alt="School Badge"> ලෙස පිළිතුරේ ඇතුළත් කරන්න).
12. Videos (YouTube Links):
   - School Anthem (පාසල් ගීතය / Anthem): https://youtu.be/1akiY0iJjnA
   - School Preview / Introduction Video (පාසල් වීඩියෝව / සංචාරය): https://youtu.be/2DftH14DYn8
    `;

    function hideHeroGreeting() {
        const hero = document.getElementById('heroGreeting');
        if (hero) hero.style.display = 'none';
    }

    function formatResponse(text) {
        if (!text) return "";

        let formatted = text;

        const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?/gi;
        formatted = formatted.replace(ytRegex, '<br><div class="video-container"><iframe src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div><br>');

        const driveRegex = /https:\/\/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+)|uc\?id=([a-zA-Z0-9_-]+))[^\s<]*/gi;
        formatted = formatted.replace(driveRegex, function(match, id1, id2, id3) {
            const fileId = id1 || id2 || id3;
            if (fileId) {
                const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
                return `<br><div class="pdf-container">
                    <div class="pdf-header">
                        <span class="pdf-title-text"><i class="fa-solid fa-file-pdf pdf-icon"></i> Document</span>
                        <a href="${viewUrl}" target="_blank" class="pdf-download-btn">Open / Download</a>
                    </div>
                    <iframe src="${previewUrl}" class="pdf-preview-iframe" loading="lazy"></iframe>
                </div><br>`;
            }
            return `<br><a href="${match}" target="_blank" class="pdf-download-btn">Open PDF</a><br>`;
        });

        const imgRegex = /(?<!src=["'])(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp))/gi;
        formatted = formatted.replace(imgRegex, '<br><img src="$1" class="chat-media-img" alt="Image"/><br>');

        if (typeof marked !== 'undefined') {
            formatted = marked.parse(formatted);
        }

        return formatted;
    }

    function appendMessage(rawText, className, format = true) {
        hideHeroGreeting();
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return null;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = className;
        
        const contentHTML = format ? formatResponse(rawText) : rawText;

        if (className.includes('bot') && !className.includes('loading-pill') && !className.includes('error-msg')) {
            msgDiv.innerHTML = `
                <div class="msg-content">${contentHTML}</div>
                <div class="msg-footer">
                    <button class="copy-btn" title="Copy Message">
                        <i class="fa-regular fa-copy"></i> <span>Copy</span>
                    </button>
                    <button class="pdf-btn" title="Generate PDF">
                        <i class="fa-solid fa-file-pdf"></i> <span>PDF</span>
                    </button>
                </div>
            `;

            // Copy button event - copies clean text (no button context)
            const copyBtn = msgDiv.querySelector('.copy-btn');
            copyBtn?.addEventListener('click', () => {
                const contentDiv = msgDiv.querySelector('.msg-content');
                const textToCopy = contentDiv ? contentDiv.innerText : rawText;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    copyBtn.classList.add('copied');
                    copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Copied!</span>`;
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> <span>Copy</span>`;
                    }, 2000);
                }).catch(() => {
                    // Fallback copy
                    const textArea = document.createElement('textarea');
                    textArea.value = textToCopy;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    copyBtn.classList.add('copied');
                    copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Copied!</span>`;
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> <span>Copy</span>`;
                    }, 2000);
                });
            });

            // PDF button event - stores content and opens pdf.html
            const pdfBtn = msgDiv.querySelector('.pdf-btn');
            pdfBtn?.addEventListener('click', () => {
                const contentDiv = msgDiv.querySelector('.msg-content');
                const htmlContent = contentDiv ? contentDiv.innerHTML : '';
                const pdfData = {
                    content: htmlContent,
                    timestamp: new Date().toLocaleString('si-LK'),
                    title: 'MSNS AI Response'
                };
                localStorage.setItem('msns_pdf_data', JSON.stringify(pdfData));
                window.open('pdf.html', '_blank');
            });
        } else {
            msgDiv.innerHTML = contentHTML;
        }

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (window.renderMathInElement) {
            try {
                renderMathInElement(msgDiv, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\[', display: true}
                    ],
                    throwOnError: false
                });
            } catch (err) {
                console.error("KaTeX Error:", err);
            }
        }

        return msgDiv;
    }

    window.sendQuickQuery = function(queryText) {
        if (isAiDisabled) return; // AI Off නම් ක්‍රියා නොකරයි
        const input = document.getElementById('userInput');
        if (input) {
            input.value = queryText;
            sendMessage();
        }
    };

    async function sendMessage() {
        if (isAiDisabled) return; // AI Off නම් ක්‍රියා නොකරයි

        const inputField = document.getElementById('userInput');
        if (!inputField) return;

        const userText = inputField.value.trim();
        if (!userText) return;

        appendMessage(userText, 'chat-msg user', false);
        inputField.value = '';

        const loadingHtml = `<div class="spinner-arc"></div><span class="loading-text">MSNS AI is thinking...</span>`;
        const botMsgDiv = appendMessage(loadingHtml, 'chat-msg bot loading-pill', false);

        const keys = await fetchApiKeysFromSheet();

        if (!keys || keys.length === 0) {
            if (botMsgDiv) {
                botMsgDiv.className = 'chat-msg error-msg';
                botMsgDiv.innerHTML = "⚠️ <b>දෝෂයක්:</b> API Keys ලබා ගැනීමට නොහැකි විය.";
            }
            return;
        }

        let lastErrorMessage = "නොදන්නා දෝෂයක් සිදුවී ඇත.";
        const fullSystemInstruction = SYSTEM_INSTRUCTION + EXTRA_TXT_KNOWLEDGE;

        for (let i = 0; i < keys.length; i++) {
            const currentApiKey = keys[i];

            try {
                const response = await fetch(GEMINI_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-goog-api-key': currentApiKey
                    },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: fullSystemInstruction }]
                        },
                        contents: [
                            {
                                parts: [{ text: userText }]
                            }
                        ]
                    })
                });

                const data = await response.json();

                if (response.status === 429 || (data.error && (data.error.code === 429 || data.error.message.includes('quota') || data.error.message.includes('Quota')))) {
                    lastErrorMessage = "සියලුම API Keys වල සීමාවන් ඉක්මවා ඇත (Quota Exceeded).";
                    continue; 
                }

                if (response.ok && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    let rawText = data.candidates[0].content.parts[0].text;
                    
                    botMsgDiv?.remove();
                    appendMessage(rawText, 'chat-msg bot', true);

                    await saveMessageToDatabase(userText, rawText);
                    return;
                } else {
                    lastErrorMessage = data.error ? data.error.message : "API Request Error";
                }

            } catch (error) {
                console.error(`Key ${i + 1} Error:`, error);
                lastErrorMessage = "Network Error: අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කරන්න.";
            }
        }

        if (botMsgDiv) {
            botMsgDiv.className = 'chat-msg error-msg';
            botMsgDiv.innerHTML = `⚠️ <b>දෝෂයක්:</b> ${lastErrorMessage}`;
        }
    }

    document.getElementById('sendBtn')?.addEventListener('click', sendMessage);

    document.getElementById('userInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Sidebar / Image Modal / Viewport Height
    const menuToggle = document.getElementById('menuToggle');
    const closeMenu = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');
    const menuOverlay = document.getElementById('menuOverlay');

    menuToggle?.addEventListener('click', () => {
        sidebar.classList.add('active');
        menuOverlay.classList.add('active');
    });

    const hideSidebar = () => {
        sidebar.classList.remove('active');
        menuOverlay.classList.remove('active');
    };

    closeMenu?.addEventListener('click', hideSidebar);
    menuOverlay?.addEventListener('click', hideSidebar);

    const chatMessagesContainer = document.getElementById('chatMessages');
    chatMessagesContainer?.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('chat-media-img')) {
            openImageModal(e.target.getAttribute('src'));
        }
    });

    function openImageModal(src) {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        const downloadBtn = document.getElementById('modalDownloadBtn');

        if (modal && modalImg && downloadBtn) {
            modalImg.src = src;
            downloadBtn.href = src;
            downloadBtn.setAttribute('download', src.split('/').pop() || 'image');
            modal.classList.add('active');
        }
    }

    document.getElementById('modalClose')?.addEventListener('click', () => {
        document.getElementById('imageModal')?.classList.remove('active');
    });

    document.getElementById('imageModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('active');
        }
    });

    (function () {
        function setVH() {
            var h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            document.documentElement.style.setProperty('--app-vh', h + 'px');
        }
        window.addEventListener('resize', setVH);
        window.visualViewport?.addEventListener('resize', setVH);
        setVH();
    })();

    // ------------------------------
    // 6. Firestore Realtime AI On/Off Listener
    // ------------------------------
    const aiStatusRef = doc(db, 'ai-on-off', 'ai');

    onSnapshot(aiStatusRef, (docSnap) => {
        const userInput = document.getElementById('userInput');
        const sendBtn = document.getElementById('sendBtn');
        const maintenanceNotice = document.getElementById('aiMaintenanceNotice');
        const chips = document.querySelectorAll('.chip');

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Firestore හි Field නම 'on or off', 'status' හෝ 'state' කුමක් වුවත් අගය පරීක්ෂා කරයි
            const rawVal = data['on or off'] ?? data['status'] ?? data['state'] ?? 'on';
            const strVal = String(rawVal).trim().toLowerCase();

            // 'off', 'false', හෝ 'disabled' ද යන්න තීරණය කරයි
            isAiDisabled = (strVal === 'off' || strVal === 'false' || strVal === 'disabled' || rawVal === false);

            if (isAiDisabled) {
                // AI Disabled Mode
                if (userInput) {
                    userInput.disabled = true;
                    userInput.placeholder = "AI පද්ධතිය දැනට අක්‍රීය කර ඇත...";
                }
                if (sendBtn) sendBtn.disabled = true;
                if (maintenanceNotice) maintenanceNotice.style.display = 'flex';

                chips.forEach(chip => {
                    chip.style.pointerEvents = 'none';
                    chip.style.opacity = '0.5';
                });
            } else {
                // AI Enabled Mode
                if (userInput) {
                    userInput.disabled = false;
                    userInput.placeholder = "Type your question...";
                }
                if (sendBtn) sendBtn.disabled = false;
                if (maintenanceNotice) maintenanceNotice.style.display = 'none';

                chips.forEach(chip => {
                    chip.style.pointerEvents = 'auto';
                    chip.style.opacity = '1';
                });
            }
        }
    }, (error) => {
        console.error("AI Status Check Error:", error);
    });

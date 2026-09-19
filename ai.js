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
let isAiDisabled = false;
let isSending = false;

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
        const q = query(chatsRef, orderBy('createdAt', 'asc'), limit(MAX_CHAT_COUNT));
        const snapshot = await getDocs(q);

        if (snapshot.size >= MAX_CHAT_COUNT) {
            const oldestDoc = snapshot.docs[0];
            await deleteDoc(oldestDoc.ref);
        }
    } catch (err) {
        console.error("Error enforcing chat limit:", err);
    }
}

// ================================================================
// 5. Gemini AI + JSON Knowledge Base + Google Search Grounding
// ================================================================

const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1Y9xYMoedyzyr1fzC68Cz9emyRFr3WWkpFi4ZG8eCiaw/export?format=csv";
let GEMINI_API_KEYS = [];
let isFetchingKeys = false;

const blockedKeys = new Map();
const KEY_BLOCK_DURATION = 60000;

// 🔥 JSON Files — json/ folder එකේ
const JSON_FILE_URLS = [
    "json/grade 6 buddhism.json",
    "json/grade 6 geography.json",
    "json/grade 6 civic.json",
    "json/grade 6 science.json",
    // අලුත් JSON files මෙතනට එකතු කරන්න:
    // "json/grade 6 maths.json",
    // "json/grade 7 buddhism.json",
    // "json/grade 7 geography.json",
    // "json/grade 7 civic.json",
    // "json/grade 7 history.json",
    // "json/grade 7 health.json",
    // "json/grade 6 ict.json",
    // "json/grade 7 ict.json",
    // "json/grade 6 history.json",
    // "json/grade 6 health.json",
    // "json/grade 6 sinhala.json",
];

// 🧠 පොදු JSON knowledge base එක (හැම file එකේ notes එකට)
let JSON_KNOWLEDGE_DB = [];

async function loadJsonFilesKnowledge() {
    try {
        const fetchPromises = JSON_FILE_URLS.map(async (url) => {
            try {
                const res = await fetch(encodeURI(url));
                if (!res.ok) {
                    console.warn(`⚠️ JSON not found: ${url}`);
                    return null;
                }
                return await res.json();
            } catch (e) {
                console.error(`Error loading ${url}:`, e);
                return null;
            }
        });

        const allData = await Promise.all(fetchPromises);

        allData.forEach((data, idx) => {
            if (Array.isArray(data)) {
                JSON_KNOWLEDGE_DB.push(...data);
                console.log(`✅ Loaded ${data.length} notes from ${JSON_FILE_URLS[idx]}`);
            }
        });

        console.log(`📚 TOTAL: ${JSON_KNOWLEDGE_DB.length} notes loaded`);
    } catch (err) {
        console.error("JSON Files Load Error:", err);
    }
}

await loadJsonFilesKnowledge();

// ============================================================
// 🔍 Smart JSON Search
// ============================================================
function getRelevantKnowledge(userQuestion) {
    if (!JSON_KNOWLEDGE_DB.length) return null;

    const question = String(userQuestion).toLowerCase().trim();
    const questionWords = question.split(/\s+/).filter(w => w.length > 1);

    // Each note එකට score එකක් හදනවා
    const scored = JSON_KNOWLEDGE_DB.map(note => {
        let score = 0;

        // 1. Keywords match — ඉතාම වැදගත්
        if (Array.isArray(note.keywords)) {
            note.keywords.forEach(kw => {
                const kwLower = String(kw).toLowerCase().trim();
                if (kwLower.length < 2) return;

                if (question.includes(kwLower)) {
                    score += 25;
                } else if (questionWords.some(qw =>
                    qw.includes(kwLower) || kwLower.includes(qw)
                )) {
                    score += 5;
                }
            });
        }

        // 2. Unit name match
        if (note.unit_name && question.includes(String(note.unit_name).toLowerCase())) {
            score += 15;
        }

        // 3. Section match
        if (note.section && question.includes(String(note.section).toLowerCase())) {
            score += 10;
        }

        // 4. Content word match
        if (note.content) {
            const contentLower = String(note.content).toLowerCase();
            questionWords.forEach(qw => {
                if (qw.length > 2 && contentLower.includes(qw)) {
                    score += 1;
                }
            });
        }

        return { note, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Minimum threshold — 5+ score
    const filtered = scored.filter(s => s.score >= 5);

    if (filtered.length === 0) return null;

    // Top matches — total 15000 chars limit
    const maxChars = 15000;
    const maxPerNote = 3500;
    let context = "";
    let totalChars = 0;
    const matchedNotes = [];

    for (const { note, score } of filtered) {
        if (totalChars >= maxChars) break;

        const header = `📚 [${note.subject || ''}] ${note.unit_name || ''}${note.section ? ' - ' + note.section : ''}\n`;
        let content = String(note.content || '');

        if (content.length > maxPerNote) {
            content = content.substring(0, maxPerNote) + "...";
        }

        const entry = header + content + "\n\n";

        if (totalChars + entry.length > maxChars) {
            const remaining = maxChars - totalChars;
            if (remaining > 500) {
                context += entry.substring(0, remaining) + "\n\n";
                totalChars += remaining;
                matchedNotes.push(note);
            }
            break;
        }

        context += entry;
        totalChars += entry.length;
        matchedNotes.push(note);
    }

    if (matchedNotes.length === 0) return null;

    console.log(`🎯 JSON Match: ${matchedNotes.length} notes (${totalChars} chars)`);
    return { context, notes: matchedNotes };
}

// ============================================================
// 💾 Response Cache
// ============================================================
const responseCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000;

function getCachedResponse(query) {
    const key = String(query).toLowerCase().trim();
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.time < CACHE_DURATION) {
        console.log("✅ Cache HIT");
        return cached.response;
    }
    return null;
}

function cacheResponse(query, response) {
    const key = String(query).toLowerCase().trim();
    responseCache.set(key, { response, time: Date.now() });
    if (responseCache.size > 100) {
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
    }
}

// ============================================================
// 🔑 API Keys Sheet
// ============================================================
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

        const lines = csvData.split(/\r?\n/).filter(line => line.trim());
        const extractedKeys = lines
            .map(line => line.split(',')[0].trim().replace(/^["']|["']$/g, ''))
            .filter(key => key.length > 10 && !key.toLowerCase().includes('key'));

        if (extractedKeys.length > 0) {
            GEMINI_API_KEYS = extractedKeys;
            console.log(`✅ Loaded ${extractedKeys.length} API keys`);
        }
    } catch (err) {
        console.error("API Keys Sheet Error:", err);
    } finally {
        isFetchingKeys = false;
    }
    return GEMINI_API_KEYS;
}

fetchApiKeysFromSheet();

// ============================================================
// 🚀 STREAMING API — letter by letter
// ============================================================
const GEMINI_STREAM_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse";

async function streamGeminiRequest(apiKey, requestBody, onChunk) {
    const response = await fetch(`${GEMINI_STREAM_URL}&key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errText = await response.text();
        let errData;
        try { errData = JSON.parse(errText); } catch { errData = { error: { message: errText } }; }
        const err = new Error(errData.error?.message || 'Request failed');
        err.status = response.status;
        err.data = errData;
        throw err;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.substring(5).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
                const data = JSON.parse(jsonStr);
                const parts = data.candidates?.[0]?.content?.parts;
                if (parts) {
                    for (const part of parts) {
                        if (part.text) {
                            fullText += part.text;
                            onChunk(fullText);
                        }
                    }
                }
            } catch (e) {
                // Ignore incomplete chunks
            }
        }
    }

    return fullText;
}

// ============================================================
// SYSTEM INSTRUCTION
// ============================================================
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
   - When පාඩම් සටහන් (lesson notes) context is provided below, USE IT as the PRIMARY source for answers about school subjects.
8. Tone & Language:
   - Respond in friendly, respectful Sinhala (or English if the user asks in English).
   - Use bold (<b>) for key points or headings.
   - When answering lesson questions from provided notes, give a structured, clear, complete answer.
9. Website developer: A/L 2028 Tech student K.D.G Sandaru Malisha Deniyegedara (WhatsApp: 0712049343).
10. Exam Results Links:
    - O/L Results: msns-lms.github.io/msns/ol.html
    - A/L Results: msns-lms.github.io/msns/al.html
11. Images:
    - School Crest / Badge (පාසල් ලාංඡනය): "school badge.png"
12. Videos (YouTube Links):
    - School Anthem: https://youtu.be/1akiY0iJjnA
    - School Preview: https://youtu.be/2DftH14DYn8
`;

// ============================================================
// UI helpers
// ============================================================
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
        try {
            formatted = marked.parse(formatted);
        } catch (e) {
            console.error("Marked parse error:", e);
        }
    }

    return formatted;
}

function renderKatex(el) {
    if (window.renderMathInElement) {
        try {
            renderMathInElement(el, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        } catch (err) {
            // KaTeX error ignore
        }
    }
}

function attachBotActions(msgDiv, rawText) {
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
        attachBotActions(msgDiv, rawText);
    } else {
        msgDiv.innerHTML = contentHTML;
    }

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    renderKatex(msgDiv);

    return msgDiv;
}

// ============================================================
// 🎬 STREAMING MESSAGE HELPERS
// ============================================================
function createStreamingMessage() {
    hideHeroGreeting();
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return null;

    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg bot';
    msgDiv.innerHTML = `<div class="msg-content"><span class="typing-cursor">▍</span></div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgDiv;
}

function updateStreamingMessage(msgDiv, text) {
    if (!msgDiv) return;
    const contentDiv = msgDiv.querySelector('.msg-content');
    if (!contentDiv) return;

    // 🔥 Real-time streaming with cursor
    contentDiv.innerHTML = formatResponse(text) + '<span class="typing-cursor">▍</span>';

    renderKatex(msgDiv);

    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function finalizeStreamingMessage(msgDiv, finalText) {
    if (!msgDiv) return;

    msgDiv.innerHTML = `
        <div class="msg-content">${formatResponse(finalText)}</div>
        <div class="msg-footer">
            <button class="copy-btn" title="Copy Message">
                <i class="fa-regular fa-copy"></i> <span>Copy</span>
            </button>
            <button class="pdf-btn" title="Generate PDF">
                <i class="fa-solid fa-file-pdf"></i> <span>PDF</span>
            </button>
        </div>
    `;
    attachBotActions(msgDiv, finalText);
    renderKatex(msgDiv);

    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ============================================================
// Quick queries
// ============================================================
window.sendQuickQuery = function(queryText) {
    if (isAiDisabled) return;
    const input = document.getElementById('userInput');
    if (input) {
        input.value = queryText;
        sendMessage();
    }
};

// ============================================================
// 🔥 MAIN sendMessage with Streaming + JSON + Google Search
// ============================================================
async function sendMessage() {
    if (isAiDisabled) return;
    if (isSending) {
        console.log("⏳ Already sending...");
        return;
    }

    const inputField = document.getElementById('userInput');
    if (!inputField) return;

    const userText = inputField.value.trim();
    if (!userText) return;

    isSending = true;
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.disabled = true;

    let botMsgDiv = null;

    try {
        appendMessage(userText, 'chat-msg user', false);
        inputField.value = '';

        // 1️⃣ Cache check
        const cachedResponse = getCachedResponse(userText);
        if (cachedResponse) {
            appendMessage(cachedResponse, 'chat-msg bot', true);
            await saveMessageToDatabase(userText, cachedResponse);
            return;
        }

        // 2️⃣ JSON search
        const knowledgeMatch = getRelevantKnowledge(userText);

        let fullSystemInstruction = SYSTEM_INSTRUCTION;
        let useGrounding = false;

        if (knowledgeMatch) {
            fullSystemInstruction += "\n\n=== අදාළ පාඩම් සටහන් ===\n" + knowledgeMatch.context;
            console.log(`📚 Using JSON notes (${knowledgeMatch.notes.length} notes)`);
        } else {
            useGrounding = true;
            console.log("🌐 No JSON match → enabling Google Search grounding");
        }

        // 3️⃣ Create streaming message UI
        botMsgDiv = createStreamingMessage();
        if (!botMsgDiv) throw new Error("Cannot create message UI");

        // 4️⃣ Load API keys
        const keys = await fetchApiKeysFromSheet();

        if (!keys || keys.length === 0) {
            botMsgDiv.className = 'chat-msg error-msg';
            botMsgDiv.innerHTML = "⚠️ <b>දෝෂයක්:</b> API Keys ලබා ගැනීමට නොහැකි විය.";
            return;
        }

        // 5️⃣ Build request body
        const requestBody = {
            system_instruction: {
                parts: [{ text: fullSystemInstruction }]
            },
            contents: [
                { parts: [{ text: userText }] }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048
            }
        };

        if (useGrounding) {
            requestBody.tools = [{ google_search: {} }];
        }

        let lastErrorMessage = "නොදන්නා දෝෂයක් සිදුවී ඇත.";
        let fullResponseText = "";
        let streamingSucceeded = false;

        // 6️⃣ Try each API key
        for (let i = 0; i < keys.length; i++) {
            const currentApiKey = keys[i];

            // Skip blocked keys
            if (blockedKeys.has(currentApiKey)) {
                const unblockTime = blockedKeys.get(currentApiKey);
                if (Date.now() < unblockTime) {
                    console.log(`⏭️ Skipping blocked key ${i + 1}`);
                    continue;
                } else {
                    blockedKeys.delete(currentApiKey);
                }
            }

            try {
                // 🔥 Try with current request body
                fullResponseText = await streamGeminiRequest(
                    currentApiKey,
                    requestBody,
                    (partialText) => {
                        // Update UI on every chunk — letter by letter ✨
                        updateStreamingMessage(botMsgDiv, partialText);
                    }
                );

                streamingSucceeded = true;
                break; // Success!

            } catch (error) {
                console.error(`Key ${i + 1} Error:`, error);

                // 429 → block this key & try next
                if (error.status === 429) {
                    blockedKeys.set(currentApiKey, Date.now() + KEY_BLOCK_DURATION);
                    console.log(`🚫 Key ${i + 1} blocked for 60s`);
                    lastErrorMessage = "සියලුම API Keys වල සීමාවන් ඉක්මවා ඇත (Quota Exceeded).";
                    continue;
                }

                // 🔥 If grounding failed (400/403) → retry without grounding
                if (useGrounding && (error.status === 400 || error.status === 403)) {
                    console.warn("⚠️ Grounding failed → retrying without Google Search");
                    useGrounding = false;
                    delete requestBody.tools;

                    try {
                        fullResponseText = await streamGeminiRequest(
                            currentApiKey,
                            requestBody,
                            (partialText) => {
                                updateStreamingMessage(botMsgDiv, partialText);
                            }
                        );
                        streamingSucceeded = true;
                        break;
                    } catch (retryError) {
                        console.error(`Retry without grounding failed:`, retryError);
                        lastErrorMessage = retryError.message || "API Error";
                        continue;
                    }
                }

                lastErrorMessage = error.message || "API Error";
            }
        }

        // 7️⃣ Handle results
        if (streamingSucceeded && fullResponseText) {
            finalizeStreamingMessage(botMsgDiv, fullResponseText);
            cacheResponse(userText, fullResponseText);
            await saveMessageToDatabase(userText, fullResponseText);
        } else {
            botMsgDiv.className = 'chat-msg error-msg';
            botMsgDiv.innerHTML = `⚠️ <b>දෝෂයක්:</b> ${lastErrorMessage}`;
        }

    } catch (err) {
        console.error("sendMessage Error:", err);
        if (botMsgDiv) {
            botMsgDiv.className = 'chat-msg error-msg';
            botMsgDiv.innerHTML = `⚠️ <b>දෝෂයක්:</b> ${err.message || "Unknown error"}`;
        }
    } finally {
        isSending = false;
        if (sendBtn) sendBtn.disabled = false;
    }
}

document.getElementById('sendBtn')?.addEventListener('click', sendMessage);

document.getElementById('userInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ============================================================
// Sidebar / Image Modal / Viewport Height
// ============================================================
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

// ============================================================
// Firestore Realtime AI On/Off Listener
// ============================================================
const aiStatusRef = doc(db, 'ai-on-off', 'ai');

onSnapshot(aiStatusRef, (docSnap) => {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const maintenanceNotice = document.getElementById('aiMaintenanceNotice');
    const chips = document.querySelectorAll('.chip');

    if (docSnap.exists()) {
        const data = docSnap.data();

        const rawVal = data['on or off'] ?? data['status'] ?? data['state'] ?? 'on';
        const strVal = String(rawVal).trim().toLowerCase();

        isAiDisabled = (strVal === 'off' || strVal === 'false' || strVal === 'disabled' || rawVal === false);

        if (isAiDisabled) {
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

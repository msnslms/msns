/* =========================================================
   MSNS - FIRESTORE NEWS FETCH MODULE (news-full.js)
   (Fixed CSS Classes + 1.5 Hour Smart Cache + Auto New News Detect + Link Fix)
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, getDocs, doc, updateDoc, increment,
    query, orderBy, limit 
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

// Cache Configurations
const CACHE_KEY = "msns_news_cache_data";
const CACHE_TIME_KEY = "msns_news_cache_time";
const CACHE_DURATION = 1.5 * 60 * 60 * 1000; // 1.5 Hours in Milliseconds

console.log("🔥 Firebase Successfully Initialized in Frontend!");

/* ---------------------------------------------------------
   SMART CACHE FETCH SYSTEM
   --------------------------------------------------------- */
async function getNewsWithCache() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const now = Date.now();

    if (cachedData && cachedTime && (now - parseInt(cachedTime, 10) < CACHE_DURATION)) {
        try {
            let parsedCache = JSON.parse(cachedData);
            
            // Check for newly added news (Costs only 1 Read)
            const latestNewsQuery = query(collection(db, 'news'), orderBy('date', 'desc'), limit(1));
            const latestNewsSnap = await getDocs(latestNewsQuery);
            
            if (!latestNewsSnap.empty) {
                const latestDoc = latestNewsSnap.docs[0];
                const existsInCache = parsedCache.some(item => item.id === latestDoc.id);
                
                if (existsInCache) {
                    console.log("⚡ Loaded News from Local Cache");
                    return parsedCache; // No new news, use cache
                } else {
                    console.log("🆕 New News Detected! Fetching fresh data...");
                }
            }
        } catch (e) {
            console.warn("Cache parse error, re-fetching from Firestore");
        }
    }

    // Fetch fresh news if cache is expired or new news is detected
    console.log("🔥 Fetching Fresh News from Firestore...");
    const snap = await getDocs(collection(db, 'news'));
    
    let allNews = [];
    snap.forEach(docSnap => {
        allNews.push({ id: docSnap.id, ...docSnap.data() });
    });

    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(allNews));
        localStorage.setItem(CACHE_TIME_KEY, now.toString());
    } catch (err) {
        console.error("LocalStorage Save Error:", err);
    }

    return allNews;
}

// Module එකක් ඇතුලේ onclick වැඩ කරන්න නම් window එකට assign කරන්න ඕනේ
window.recordNewsView = async function(newsId) {
    if (!newsId) return;
    try {
        await updateDoc(doc(db, 'news', newsId), {
            views: increment(1)
        });
    } catch (err) {
        console.error('View Update Error:', err);
    }
};

function formatImageUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return 'https://via.placeholder.com/600x400/101622/ffffff?text=No+Image';
    }
    return url.trim();
}

/* ---------------------------------------------------------
   LINK FORMATTING (මේකෙන් තමයි ol.html සහ http:// දෙකම හඳුනගන්නේ)
   --------------------------------------------------------- */
function getLinkTarget(link) {
    if (!link) return '_self';
    const trimmed = link.trim();
    // http:// හෝ https:// තියෙනවනම් අලුත් tab එකක open වේවි. නැත්තම් ol.html වගේනම් ඒ tab එකේම open වේවි.
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return '_blank';
    }
    return '_self'; 
}

/* ---------------------------------------------------------
   HOME PAGE - Load News Slider
   --------------------------------------------------------- */
async function loadHomeNews() {
    const track = document.getElementById('homeNewsTrack');
    if (!track) return;

    try {
        // Use the Cache Function instead of fetching directly
        const allNews = await getNewsWithCache();
        
        if (!allNews || allNews.length === 0) {
            track.innerHTML = '<p style="text-align:center;width:100%;color:#888;padding:20px;">පලකළ පුවත් කිසිවක් නැත.</p>';
            return;
        }

        const homeNews = allNews.filter(item => String(item.showInHome || 'no').toLowerCase() === 'yes');

        if (homeNews.length === 0) {
            track.innerHTML = '<p style="text-align:center;width:100%;color:#888;padding:20px;">Home පිටුවේ පෙන්වීමට පුවත් නොමැත.</p>';
            return;
        }

        homeNews.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        let html = '';
        homeNews.forEach(data => {
            const linkTarget = getLinkTarget(data.readMoreLink); // මෙතනින් link එක check කරනවා
            html += `
                <div class="news-card" data-news-id="${data.id}">
                    <div class="news-img-wrap">
                        <img src="${formatImageUrl(data.imageUrl)}" alt="${data.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400/101622/ffffff?text=No+Image'">
                        <span class="news-badge">${data.category || 'NEWS'}</span>
                    </div>
                    <div class="news-content">
                        <span class="news-date"><i class="fa fa-calendar-alt"></i> ${data.date || ''}</span>
                        <h3 class="news-title">${data.title || 'Untitled'}</h3>
                        <p class="news-excerpt">${data.snippet || ''}</p>
                        ${data.readMoreLink ? `<a href="${data.readMoreLink}" target="${linkTarget}" class="news-read-more" onclick="window.recordNewsView('${data.id}'); event.stopPropagation();">Read More →</a>` : ''}
                    </div>
                </div>
            `;
        });

        track.innerHTML = html;

        track.querySelectorAll('.news-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName !== 'A') {
                    window.recordNewsView(card.getAttribute('data-news-id'));
                }
            });
        });

    } catch (err) {
        console.error("Home News Error:", err);
        track.innerHTML = `<p style="text-align:center;width:100%;color:#e74c3c;padding:20px;">දෝෂයක්: ${err.message}</p>`;
    }
}

/* ---------------------------------------------------------
   NEWS PAGE - Featured + Grid
   --------------------------------------------------------- */
async function loadNewsPage() {
    const featuredContainer = document.getElementById('featuredNewsContainer');
    const gridContainer = document.getElementById('newsGridContainer');

    if (!featuredContainer && !gridContainer) return;

    try {
        // Use the Cache Function instead of fetching directly
        let newsList = await getNewsWithCache();

        if (!newsList || newsList.length === 0) {
            if (featuredContainer) featuredContainer.innerHTML = '';
            if (gridContainer) gridContainer.innerHTML = '<p style="text-align:center;width:100%;color:#888;padding:20px;">පලකළ පුවත් කිසිවක් නැත.</p>';
            return;
        }

        // Clone the array so we don't modify the cached data array directly
        newsList = [...newsList]; 
        newsList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        let featuredItem = null;
        const featuredIndex = newsList.findIndex(item => String(item.isFeatured || 'no').toLowerCase() === 'yes');

        if (featuredIndex !== -1) {
            featuredItem = newsList.splice(featuredIndex, 1)[0];
        } else if (newsList.length > 0) {
            featuredItem = newsList.shift();
        }

        if (featuredItem && featuredContainer) {
            const linkTarget = getLinkTarget(featuredItem.readMoreLink); // මෙතනින් link එක check කරනවා
            featuredContainer.innerHTML = `
                <div class="main-news-card" data-news-id="${featuredItem.id}" style="cursor: pointer;">
                    <div class="main-news-image" style="background-image:url('${formatImageUrl(featuredItem.imageUrl)}');"></div>
                    <div class="main-news-content">
                        <div class="badge-date-row">
                            <span class="category-badge">${featuredItem.category || 'NEWS'}</span>
                            <span class="date"><i class="fa fa-calendar"></i> ${featuredItem.date || ''}</span>
                        </div>
                        <h2>${featuredItem.title || 'Untitled'}</h2>
                        <p>${featuredItem.snippet || ''}</p>
                        ${featuredItem.readMoreLink ? `<a href="${featuredItem.readMoreLink}" target="${linkTarget}" class="news-read-more" onclick="window.recordNewsView('${featuredItem.id}'); event.stopPropagation();">Read More →</a>` : ''}
                    </div>
                </div>
            `;

            featuredContainer.querySelector('.main-news-card').addEventListener('click', () => {
                window.recordNewsView(featuredItem.id);
            });
        }

        if (gridContainer) {
            if (newsList.length === 0) {
                gridContainer.innerHTML = '<p style="text-align:center;width:100%;color:#888;padding:20px;">තවත් පුවත් නොමැත.</p>';
            } else {
                let gridHTML = '';
                newsList.forEach(data => {
                    const linkTarget = getLinkTarget(data.readMoreLink); // මෙතනින් link එක check කරනවා
                    gridHTML += `
                        <div class="news-grid-item" data-news-id="${data.id}" style="cursor: pointer;">
                            <div class="news-grid-image">
                                <img src="${formatImageUrl(data.imageUrl)}" alt="${data.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400/101622/ffffff?text=No+Image'">
                            </div>
                            <div class="news-grid-body">
                                <div class="badge-date-row">
                                    <span class="category-badge">${data.category || 'NEWS'}</span>
                                    <span class="date"><i class="fa fa-calendar-alt"></i> ${data.date || ''}</span>
                                </div>
                                <h4>${data.title || 'Untitled'}</h4>
                                <p>${data.snippet || ''}</p>
                                ${data.readMoreLink ? `<a href="${data.readMoreLink}" target="${linkTarget}" class="news-read-more" onclick="window.recordNewsView('${data.id}'); event.stopPropagation();">Read More →</a>` : ''}
                            </div>
                        </div>
                    `;
                });
                gridContainer.innerHTML = gridHTML;

                gridContainer.querySelectorAll('.news-grid-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        if (e.target.tagName !== 'A') {
                            window.recordNewsView(item.getAttribute('data-news-id'));
                        }
                    });
                });
            }
        }

    } catch (err) {
        const errMsg = `<p style="text-align:center;width:100%;color:#e74c3c;padding:20px;">පුවත් ලබාගැනීමේ දෝෂයක්: ${err.message}</p>`;
        if (featuredContainer) featuredContainer.innerHTML = errMsg;
        if (gridContainer) gridContainer.innerHTML = errMsg;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadHomeNews();
    loadNewsPage();
});

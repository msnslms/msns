/* ==========================================================
   📸 MSNS GALLERY & ALBUMS SCRIPT (WITH GOOGLE SHEETS)
   ========================================================== */

// 🔴  Google Sheet ID//
const SHEET_ID = '1mN5jfN4P3FFevv2Aq0ygWmTzrF7-dVWfdy-8cDFa7ro';

// Google Sheet CSV Export URLs
const ALL_PHOTOS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=mini-image-library`;
const ALBUMS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=album`;

// State Variables
let allPhotosData = [];
let albumsData = {}; // Format: { "Album Name": [ {url, title, desc}, ... ] }
let currentModalPhotos = []; // Modal එකට යන දැනට බලන Photo Array එක
let currentImageIndex = 0;

// DOM Elements
const tabAll = document.getElementById('tabAll');
const tabAlbums = document.getElementById('tabAlbums');
const galleryGrid = document.getElementById('galleryGrid');
const albumListGrid = document.getElementById('albumListGrid');
const albumViewContainer = document.getElementById('albumViewContainer');
const albumPhotosGrid = document.getElementById('albumPhotosGrid');
const btnBackToAlbums = document.getElementById('btnBackToAlbums');
const currentAlbumTitle = document.getElementById('currentAlbumTitle');

// Modal Elements
const modal = document.getElementById('galleryModal');
const modalImg = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalCounter = document.getElementById('modalCounter');
const modalClose = document.getElementById('modalClose');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');

/* ==========================================
   1. UTILITIES (Google Drive Links & CSV Parser)
   ========================================== */

// Google Drive link එක direct image link එකක් බවට පත් කිරීම
function fixImageUrl(url) {
    if (!url) return '';
    const driveRegex = /drive\.google\.com\/file\/d\/([^\/]+)/;
    const match = url.match(driveRegex);
    if (match && match[1]) {
        return `https://drive.google.com/uc?id=${match[1]}`;
    }
    return url;
}

// Simple CSV Parser
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
            currentCell += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell.replace(/^"|"$/g, '').trim());
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentCell.replace(/^"|"$/g, '').trim());
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentRow.length > 0 || currentCell) {
        currentRow.push(currentCell.replace(/^"|"$/g, '').trim());
        rows.push(currentRow);
    }
    return rows;
}

/* ==========================================
   2. DATA FETCHING
   ========================================== */

async function fetchGalleryData() {
    try {
        // 1. Fetch All Photos
        const allRes = await fetch(ALL_PHOTOS_URL);
        const allText = await allRes.text();
        const allRows = parseCSV(allText);
        
        allPhotosData = [];
        // Row 1 is header, start from Row 2 (index 1)
        for (let i = 1; i < allRows.length; i++) {
            const row = allRows[i];
            if (row[0]) { // URL is required
                allPhotosData.push({
                    url: fixImageUrl(row[0]),
                    title: row[1] || 'MSNS Gallery',
                    desc: row[2] || ''
                });
            }
        }

        // 2. Fetch Albums
        const albumRes = await fetch(ALBUMS_URL);
        const albumText = await albumRes.text();
        const albumRows = parseCSV(albumText);
        
        albumsData = {};
        if (albumRows.length > 2) {
            const albumNamesRow = albumRows[0];
            const albumCols = [];

            // A1, D1, G1 වගේ තැන් වල Album Names තියෙනවා කියලා හිතමු (3 column groups)
            for (let i = 0; i < albumNamesRow.length; i += 3) {
                let name = albumNamesRow[i];
                if (name && name.trim() !== "") {
                    albumCols.push({ name: name.trim(), startIdx: i });
                    albumsData[name.trim()] = [];
                }
            }

            // Row 3 (index 2) ඉඳන් Data කියවීම
            for (let r = 2; r < albumRows.length; r++) {
                const row = albumRows[r];
                albumCols.forEach(album => {
                    const url = row[album.startIdx];
                    const title = row[album.startIdx + 1];
                    const desc = row[album.startIdx + 2];

                    if (url && url.trim() !== "") {
                        albumsData[album.name].push({
                            url: fixImageUrl(url),
                            title: title || 'MSNS Gallery',
                            desc: desc || ''
                        });
                    }
                });
            }
        }

        // Render Initial View (All Photos)
        renderGrid(allPhotosData, galleryGrid);

    } catch (error) {
        console.error("Error fetching data:", error);
        galleryGrid.innerHTML = `
            <div class="gallery-empty-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Failed to load gallery. Please check your internet connection.</span>
            </div>`;
    }
}

/* ==========================================
   3. RENDERING
   ========================================== */

// සාමාන්‍ය ෆොටෝ ග්‍රිඩ් එකක් හැදීම (All Photos / Album Photos)
function renderGrid(dataArray, container) {
    if (dataArray.length === 0) {
        container.innerHTML = `
            <div class="gallery-empty-state">
                <i class="fa-regular fa-image"></i>
                <span>No photos available right now.</span>
            </div>`;
        return;
    }

    container.innerHTML = '';
    dataArray.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
            <img src="${item.url}" alt="${item.title}" loading="lazy">
            <div class="gallery-card-title">${item.title}</div>
        `;
        // ෆොටෝ එක Click කරාම Modal එක ඕපන් වෙන්න
        card.addEventListener('click', () => openModal(dataArray, index));
        container.appendChild(card);
    });
}

// Album ලිස්ට් එක හැදීම
function renderAlbumsList() {
    const albumNames = Object.keys(albumsData);
    
    if (albumNames.length === 0) {
        albumListGrid.innerHTML = `
            <div class="gallery-empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <span>No albums available.</span>
            </div>`;
        return;
    }

    albumListGrid.innerHTML = '';
    albumNames.forEach(albumName => {
        const photosInAlbum = albumsData[albumName];
        if (photosInAlbum.length === 0) return; // හිස් ඇල්බම් පෙන්නන්නේ නෑ
        
        const coverPhoto = photosInAlbum[0].url; // පළවෙනි ෆොටෝ එක කවර් එක විදියට ගන්නවා

        const card = document.createElement('div');
        card.className = 'gallery-card album-card';
        card.innerHTML = `
            <div class="album-count-badge"><i class="fa-solid fa-images"></i> ${photosInAlbum.length}</div>
            <img src="${coverPhoto}" alt="${albumName}" loading="lazy">
            <div class="gallery-card-title album-card-title">${albumName}</div>
        `;
        
        // Album එක ක්ලික් කරාම ඒක ඇතුලට යන්න
        card.addEventListener('click', () => openAlbumView(albumName, photosInAlbum));
        albumListGrid.appendChild(card);
    });
}

/* ==========================================
   4. TAB & NAVIGATION LOGIC
   ========================================== */

tabAll.addEventListener('click', () => {
    tabAll.classList.add('active');
    tabAlbums.classList.remove('active');
    
    galleryGrid.style.display = 'grid';
    albumListGrid.style.display = 'none';
    albumViewContainer.style.display = 'none';
});

tabAlbums.addEventListener('click', () => {
    tabAlbums.classList.add('active');
    tabAll.classList.remove('active');
    
    galleryGrid.style.display = 'none';
    albumListGrid.style.display = 'grid';
    albumViewContainer.style.display = 'none';
    
    renderAlbumsList();
});

btnBackToAlbums.addEventListener('click', () => {
    albumViewContainer.style.display = 'none';
    albumListGrid.style.display = 'grid';
});

function openAlbumView(albumName, photosArray) {
    albumListGrid.style.display = 'none';
    albumViewContainer.style.display = 'block';
    currentAlbumTitle.innerText = albumName;
    renderGrid(photosArray, albumPhotosGrid);
}

/* ==========================================
   5. LIGHTBOX MODAL LOGIC
   ========================================== */

function openModal(dataArray, index) {
    currentModalPhotos = dataArray;
    currentImageIndex = index;
    updateModalContent();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // යටින් Page එක scroll වෙන එක නවත්තන්න
}

function updateModalContent() {
    const item = currentModalPhotos[currentImageIndex];
    modalImg.src = item.url;
    modalTitle.innerText = item.title;
    modalDesc.innerText = item.desc || '';
    modalCounter.innerText = `${currentImageIndex + 1} / ${currentModalPhotos.length}`;
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Scroll එක ආපහු දෙන්න
    setTimeout(() => { modalImg.src = ''; }, 300); // Animation එක ඉවර උනාම Image එක අයින් කරන්න
}

function showNext() {
    currentImageIndex = (currentImageIndex + 1) % currentModalPhotos.length;
    updateModalContent();
}

function showPrev() {
    currentImageIndex = (currentImageIndex - 1 + currentModalPhotos.length) % currentModalPhotos.length;
    updateModalContent();
}

// Modal Event Listeners
modalClose.addEventListener('click', closeModal);
modalNext.addEventListener('click', showNext);
modalPrev.addEventListener('click', showPrev);

// ESC එකෙන් Modal එක close කිරීම සහ ඊතල වලින් එහා මෙහා කිරීම
document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft') showPrev();
});

// ෆොටෝ එකට පිටින් ක්ලික් කරාමත් Close වෙන්න
modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('gallery-modal-inner')) {
        closeModal();
    }
});

// ==========================================
// 🚀 INITIATE FETCH ON LOAD
// ==========================================
fetchGalleryData();


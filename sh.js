const SHEET_ID = '1Y7syQBpLjg-nKPPDC6vQWaY98z95DOl1GEc4fbcRtmA';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

let searchDatabase = [];

// Fetch data from Google Sheet
async function fetchSheetData() {
    try {
        const response = await fetch(CSV_URL);
        const data = await response.text();
        parseCSV(data);
    } catch (error) {
        console.error('Error fetching sheet data:', error);
    }
}

function parseCSV(csvText) {
    const rows = csvText.split('\n').map(row => 
        row.split(',').map(cell => cell.replace(/^"(.*)"$/, '$1').trim())
    );

    if (rows.length < 2) return;

    const links = rows[0]; // Row 1 contiene link (index.html, etc)
    searchDatabase = [];

    for (let r = 1; r < rows.length; r++) {
        for (let c = 0; c < links.length; c++) {
            const keyword = rows[r][c];
            const targetLink = links[c];
            if (keyword && targetLink) {
                searchDatabase.push({
                    keyword: keyword,
                    link: targetLink
                });
            }
        }
    }
}

// Search Elements
const openSearchBtn = document.getElementById('openSearch');
const closeSearchBtn = document.getElementById('closeSearch');
const searchOverlay = document.getElementById('searchOverlay');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// Open / Close functionality
openSearchBtn.addEventListener('click', () => {
    searchOverlay.classList.add('active');
    searchInput.focus();
});

closeSearchBtn.addEventListener('click', () => {
    searchOverlay.classList.remove('active');
    searchInput.value = '';
    searchResults.innerHTML = '';
});

searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
        searchOverlay.classList.remove('active');
        searchInput.value = '';
        searchResults.innerHTML = '';
    }
});

// Live Search Filter
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    searchResults.innerHTML = '';

    if (!query) return;

    const filteredResults = searchDatabase.filter(item => 
        item.keyword.toLowerCase().includes(query)
    );

    if (filteredResults.length === 0) {
        searchResults.innerHTML = `<div style="color: #64748b; padding: 10px; font-size: 0.9rem; text-align: center;">ප්‍රතිඵල හමු නොවීය.</div>`;
        return;
    }

    filteredResults.forEach(item => {
        const a = document.createElement('a');
        a.href = item.link;
        a.className = 'search-result-item';
        a.innerHTML = `
            <span>${item.keyword}</span>
            <span class="link-tag">${item.link}</span>
        `;
        searchResults.appendChild(a);
    });
});

// Load Google Sheet Data on Start
document.addEventListener('DOMContentLoaded', fetchSheetData);

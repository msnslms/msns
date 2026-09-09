// DOM Elements
const $ = (id) => document.getElementById(id);

// Caching Duration: 1 Week in Milliseconds
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

document.addEventListener('DOMContentLoaded', () => {
    initGradeChangeListener();
    initSearchForm();
});

function initGradeChangeListener() {
    const gradeSelect = $('searchGrade');
    const streamBox = $('streamSelectBox');

    gradeSelect?.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (streamBox) {
            streamBox.style.display = (val === 12 || val === 13) ? 'block' : 'none';
        }
    });
}

function showStatus(msg, type = 'info') {
    const box = $('statusMessage');
    if (!box) return;
    box.className = `status-msg ${type}`;
    box.innerText = msg;
}

function initSearchForm() {
    const form = $('resultSearchForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const year = $('searchYear').value;
        const term = $('searchTerm').value;
        const grade = $('searchGrade').value;
        const cls = $('searchClass').value;
        const indexNum = $('searchIndex').value.trim();
        const stream = (parseInt(grade) >= 12) ? $('searchStream').value : '';

        if (!grade || !cls || !indexNum) {
            showStatus('Please complete all details.', 'error');
            return;
        }

        $('resultCardWrapper').style.display = 'none';
        showStatus('Data is being retrieved... please wait.', 'info');

        try {
            const parsedSheetData = await getOrFetchSheetData(year, term, grade, cls, stream);
            if (!parsedSheetData || parsedSheetData.length === 0) {
                showStatus('No documents were found for this class. , 'error');
                return;
            }

            renderStudentResult(parsedSheetData, indexNum, grade, cls, year, term);
        } catch (err) {
            console.error(err);
            showStatus('An error occurred while retrieving results: ' + err.message, 'error');
        }
    });
}

/**
 * Fetch Sheet URL from Local data.json file
 */
async function getOrFetchSheetData(year, term, grade, cls, stream) {
    const cacheKey = `term_data_${year}_T${term}_G${grade}_C${cls}_${stream || 'none'}`;
    const cachedItem = localStorage.getItem(cacheKey);

    // 1. Check Local Cache
    if (cachedItem) {
        try {
            const { timestamp, data } = JSON.parse(cachedItem);
            if (Date.now() - timestamp < ONE_WEEK_MS) {
                console.log('⚡ Loading sheet data from LocalCache...');
                return data;
            }
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    console.log('📂 Reading sheet URL from data.json...');
    
    try {
        // 2. Load Local JSON File
        const jsonResponse = await fetch('data.json');
        if (!jsonResponse.ok) {
            throw new Error('The data file could not be found. ');
        }

        const dataList = await jsonResponse.json();

        // 3. Search for matching record
        const matched = dataList.find(item => {
            const matchYear = item.year && item.year.toString().trim() === year.toString().trim();
            
            // Term Check (e.g. "2" or "2nd term")
            const itemTermNum = item.term ? item.term.toString().replace(/\D/g, '') : '';
            const searchTermNum = term.toString().replace(/\D/g, '');
            const matchTerm = (itemTermNum && searchTermNum && itemTermNum === searchTermNum) ||
                              (item.term && item.term.toString().toLowerCase().includes(term.toString().toLowerCase()));

            const matchGrade = item.grade && item.grade.toString().trim() === grade.toString().trim();

            // Class Check (e.g. "A" or "Class A")
            const itemClass = item.class ? item.class.toString().replace(/class/gi, '').trim().toLowerCase() : '';
            const searchClass = cls.toString().replace(/class/gi, '').trim().toLowerCase();
            const matchClass = itemClass === searchClass;

            // Stream Check
            let matchStream = true;
            if (parseInt(grade) >= 12 && stream) {
                matchStream = item.stream && item.stream.toString().trim().toLowerCase() === stream.trim().toLowerCase();
            }

            return matchYear && matchTerm && matchGrade && matchClass && matchStream;
        });

        if (!matched || !matched.sheetUrl) {
            throw new Error(`Grade ${grade}-${cls} (Year: ${year}, Term: ${term}) The link for is not included in data.`);
        }

        // 4. Fetch Google Sheet CSV
        const sheetData = await fetchGoogleSheetCSV(matched.sheetUrl);

        // Save Cache
        localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: sheetData
        }));

        return sheetData;

    } catch (error) {
        console.error("Data Search Error: ", error);
        throw error;
    }
}

/**
 * Fetch Google Sheet via GViz API (Prevents CORS Errors)
 */
async function fetchGoogleSheetCSV(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
        throw new Error('වලංගු නැති Google Sheet URL එකකි.');
    }

    const sheetId = match[1];

    try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
        const response = await fetch(gvizUrl);

        if (!response.ok) {
            throw new Error('The sheet could not be retrieved. Check if the sheet is set to Public ("Anyone with link").');
        }

        const csvText = await response.text();
        return parseCSVText(csvText);

    } catch (error) {
         console.error("Fetch Error:", error);
         throw new Error('Sheet එක කියවීමේදී දෝෂයක්: ' + error.message);
    }
}

/**
 * Parse CSV Data
 */
function parseCSVText(csvText) {
    const lines = csvText.split(/\r\n|\n/);
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const row = [];
        let insideQuotes = false;
        let entry = '';

        for (let char of line) {
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                row.push(entry.trim().replace(/^"(.*)"$/, '$1'));
                entry = '';
            } else {
                entry += char;
            }
        }
        row.push(entry.trim().replace(/^"(.*)"$/, '$1'));
        result.push(row);
    }
    return result;
}

/**
 * Render Student Results
 */
function renderStudentResult(rows, indexNum, grade, cls, year, term) {
    const numGrade = parseInt(grade);
    let subjectRowIndex, dataStartRowIndex, indexCol, nameCol, firstSubjectCol;

    if (numGrade >= 10 && numGrade <= 11) {
        subjectRowIndex = 6;
        dataStartRowIndex = 7;
        indexCol = 1;
        nameCol = 2;
        firstSubjectCol = 3;
    } else {
        subjectRowIndex = 7;
        dataStartRowIndex = 8;
        indexCol = 1;
        nameCol = 2;
        firstSubjectCol = 3;
    }

    if (rows.length <= dataStartRowIndex) {
        showStatus('There is not enough data in the sheet.', 'error');
        return;
    }

    const subjectsRow = rows[subjectRowIndex] || [];
    let targetStudentRow = null;

    for (let r = dataStartRowIndex; r < rows.length; r++) {
        const row = rows[r];
        if (row[indexCol] && row[indexCol].toString().trim().toLowerCase() === indexNum.toLowerCase()) {
            targetStudentRow = row;
            break;
        }
    }

    if (!targetStudentRow) {
        showStatus(`Exam number ${indexNum} No results found for.`, 'error');
        return;
    }

    const studentName = targetStudentRow[nameCol] || 'N/A';
    const markList = [];
    let totalMarks = '-';
    let avgMarks = '-';
    let rankPos = '-';

    for (let c = firstSubjectCol; c < subjectsRow.length; c++) {
        const subTitle = subjectsRow[c]?.trim();
        const markVal = targetStudentRow[c]?.trim() || '-';

        if (!subTitle) continue;

        const lowerSub = subTitle.toLowerCase();
        if (lowerSub.includes('total') || lowerSub.includes('Total')) {
            totalMarks = markVal;
        } else if (lowerSub.includes('avg') || lowerSub.includes('average') || lowerSub.includes('Average')) {
            avgMarks = markVal;
        } else if (lowerSub.includes('position') || lowerSub.includes('rank') || lowerSub.includes('Place')) {
            rankPos = markVal;
        } else {
            markList.push({ subject: subTitle, mark: markVal });
        }
    }

    $('rIndex').innerText = indexNum;
    $('rClass').innerText = `Grade ${grade} - ${cls}`;
    $('rName').innerText = studentName;
    $('a4TermTitle').innerText = `${year} - ${term} Forest inspection report`;

    const tBody = $('rTableBody');
    tBody.innerHTML = '';

    markList.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td style="text-align: left; font-weight: 600;">${item.subject}</td>
            <td style="font-weight: 700;">${item.mark}</td>
        `;
        tBody.appendChild(tr);
    });

    $('rTotal').innerText = totalMarks;
    $('rAvg').innerText = avgMarks;
    $('rRank').innerText = rankPos;

    showStatus('ප්‍රතිඵල සාර්ථකව සොයාගන්නා ලදී!', 'success');
    $('resultCardWrapper').style.display = 'block';
    $('resultCardWrapper').scrollIntoView({ behavior: 'smooth' });
}

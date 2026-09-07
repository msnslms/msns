        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import {
            getFirestore, doc, getDoc, updateDoc, deleteDoc, collection,
            query, where, addDoc, serverTimestamp, Timestamp, onSnapshot
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

        const IMGBB_API_KEY = '3c7f31bff91c8f5f4a9aef96751ac2db';

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        const $ = id => document.getElementById(id);
        const qsa = sel => [...document.querySelectorAll(sel)];

        function showToast(msg, type = '') {
            const t = $('toast');
            if (!t) return;
            t.textContent = msg;
            t.className = 'toast show ' + type;
            clearTimeout(t._hide);
            t._hide = setTimeout(() => t.classList.remove('show'), 3500);
        }

        // ImgBB Upload Helper
        async function uploadToImgBB(file) {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                return data.data.url;
            } else {
                throw new Error(data.error ? data.error.message : 'Upload failed');
            }
        }

        let currentUser = null;
        let currentProfile = null;
        let teacherQuizzes = [];
        let teacherNews = [];
        let editingQuizId = null;
        let windowQuizAnswers = {};
        let windowQImages = {};

        // Sidebar
        $('menuToggle')?.addEventListener('click', () => { $('sidebar').classList.add('active'); $('menuOverlay').classList.add('active'); });
        $('closeMenu')?.addEventListener('click', () => { $('sidebar').classList.remove('active'); $('menuOverlay').classList.remove('active'); });
        $('menuOverlay')?.addEventListener('click', () => { $('sidebar').classList.remove('active'); $('menuOverlay').classList.remove('active'); });

        // Auth Listener
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            if (!user) {
                $('loadingState').style.display = 'none';
                $('signedOutState').style.display = 'block';
                $('teacherDashboard').style.display = 'none';
                return;
            }
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    currentProfile = snap.data();
                    $('teacherName').textContent = currentProfile.displayName || user.displayName || 'Teacher';
                    $('teacherSubject').textContent = currentProfile.subject || 'Teacher';
                    $('teacherAvatar').textContent = (currentProfile.displayName || 'T').charAt(0).toUpperCase();

                    $('loadingState').style.display = 'none';
                    $('signedOutState').style.display = 'none';
                    $('teacherDashboard').style.display = 'block';

                    setupListeners();
                } else {
                    showToast('User profile not found.', 'error');
                }
            } catch (e) { showToast(e.message, 'error'); }
        });

        // Logout
        $('btnLogout')?.addEventListener('click', () => signOut(auth).then(() => location.reload()));

        // Realtime Listeners (Composite Index Error වැළැක්වීමට Memory Sorting භාවිත කර ඇත)
        function setupListeners() {
            const qq = query(collection(db, 'quizzes'), where('teacherId', '==', currentUser.uid));
            onSnapshot(qq, snap => {
                teacherQuizzes = [];
                snap.forEach(d => teacherQuizzes.push({ id: d.id, ...d.data() }));
                teacherQuizzes.sort((a, b) => {
                    const ta = a.createdAt?.seconds || 0;
                    const tb = b.createdAt?.seconds || 0;
                    return tb - ta;
                });
                renderQuizzes();
            }, err => showToast("Quizzes Load Error: " + err.message, "error"));

            const nq = query(collection(db, 'academic_news'), where('teacherId', '==', currentUser.uid));
            onSnapshot(nq, snap => {
                teacherNews = [];
                snap.forEach(d => teacherNews.push({ id: d.id, ...d.data() }));
                teacherNews.sort((a, b) => {
                    const ta = a.createdAt?.seconds || 0;
                    const tb = b.createdAt?.seconds || 0;
                    return tb - ta;
                });
                renderNews();
            }, err => showToast("News Load Error: " + err.message, "error"));
        }

        // Render Quizzes
        function renderQuizzes() {
            const container = $('quizList');
            if (teacherQuizzes.length === 0) {
                container.innerHTML = `<div class="qz-empty-state"><i class="fa-regular fa-file-lines"></i><p>No quizzes created yet.</p></div>`;
                return;
            }
            container.innerHTML = teacherQuizzes.map(q => `
                <div class="qz-card">
                    <div class="qz-card-header">
                        <i class="fa-solid fa-lightbulb qz-icon"></i>
                        <span class="qz-card-title">${q.title || 'Quiz'}</span>
                    </div>
                    <div class="qz-card-meta">
                        <span><i class="fa-solid fa-users"></i> Grade ${q.grade || 'All'} (${q.class || 'All'}) ${q.stream ? '- ' + q.stream : ''}</span>
                        <span><i class="fa-solid fa-circle-question"></i> ${q.questions?.length || 0} Questions</span>
                    </div>
                    <div class="qz-card-actions">
                        <button class="btn btn-ghost btn-sm btn-edit-q" data-id="${q.id}"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn btn-danger btn-sm btn-del-q" data-id="${q.id}"><i class="fa-solid fa-trash"></i> Delete</button>
                        <button class="btn btn-primary btn-sm btn-ana-q" data-id="${q.id}"><i class="fa-solid fa-chart-pie"></i> Analysis</button>
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('.btn-edit-q').forEach(b => b.onclick = () => editQuiz(b.dataset.id));
            container.querySelectorAll('.btn-del-q').forEach(b => b.onclick = () => deleteQuiz(b.dataset.id));
            container.querySelectorAll('.btn-ana-q').forEach(b => b.onclick = () => openAnalysis(b.dataset.id));
        }

        // Render News
        function renderNews() {
            const container = $('newsList');
            if (teacherNews.length === 0) {
                container.innerHTML = `<div class="qz-empty-state"><i class="fa-regular fa-newspaper"></i><p>No news posted yet.</p></div>`;
                return;
            }
            container.innerHTML = teacherNews.map(n => `
                <div class="qz-news-card">
                    ${n.imageUrl ? `<img src="${n.imageUrl}" class="qz-news-img">` : ''}
                    <div class="qz-news-body">
                        <h4>${n.title}</h4>
                        <p>${n.description}</p>
                        <div class="qz-news-meta">
                            <span><i class="fa-solid fa-user"></i> ${n.position || 'Teacher'}</span>
                            <span class="qz-view-count" data-id="${n.id}" style="cursor:pointer;color:var(--primary-color);"><i class="fa-solid fa-eye"></i> ${n.views?.length || 0} Views</span>
                        </div>
                        <button class="btn btn-danger btn-sm btn-del-news" data-id="${n.id}" style="margin-top:10px;"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('.btn-del-news').forEach(b => b.onclick = () => deleteNews(b.dataset.id));
            container.querySelectorAll('.qz-view-count').forEach(b => b.onclick = () => openViewsModal(b.dataset.id));
        }

        // Grade Stream Toggle (Quiz)
        $('quizGrade')?.addEventListener('change', (e) => {
            const v = parseInt(e.target.value);
            $('streamFieldWrap').style.display = (v === 12 || v === 13) ? 'block' : 'none';
        });

        // Grade Stream Toggle (Academic News)
        $('newsGrade')?.addEventListener('change', (e) => {
            const v = parseInt(e.target.value);
            $('newsStreamFieldWrap').style.display = (v === 12 || v === 13) ? 'block' : 'none';
        });

        // Question Builder
        function buildQuestionsUI(existingQuestions = null) {
            const container = $('questionsContainer');
            container.innerHTML = '';
            windowQuizAnswers = {};
            windowQImages = {};

            const count = existingQuestions ? existingQuestions.length : (parseInt($('questionCount').value) || 5);
            const aCount = parseInt($('answerCount').value) || 4;

            for (let i = 0; i < Math.min(count, 50); i++) {
                const qData = existingQuestions ? existingQuestions[i] : null;
                if (qData) {
                    windowQuizAnswers[i] = qData.correctAnswer;
                    if (qData.imageUrl) windowQImages[i] = qData.imageUrl;
                }

                const div = document.createElement('div');
                div.className = 'qz-question-block';
                div.dataset.index = i;
                div.innerHTML = `
                    <div class="qz-q-header">
                        <span class="qz-q-num">Question ${i+1}</span>
                    </div>
                    <div class="qz-field">
                        <label class="qz-label">Question Text</label>
                        <input type="text" class="custom-input q-text" value="${qData?.text || ''}" placeholder="Type question...">
                    </div>
                    <div class="qz-field">
                        <label class="qz-label">Question Image (Optional ImgBB)</label>
                        <input type="file" class="q-img-file custom-input" accept="image/*">
                        <div class="q-img-preview" style="margin-top:5px;${qData?.imageUrl ? '' : 'display:none;'}">
                            <img src="${qData?.imageUrl || ''}" style="max-height:80px;border-radius:6px;">
                        </div>
                    </div>
                    <div class="qz-answers-wrap">
                        <label class="qz-label">Answers (Select the correct answer option)</label>
                        <div class="qz-answers-grid">
                            ${Array.from({length: aCount}, (_, j) => `
                                <div class="qz-answer-item ${qData?.correctAnswer === j ? 'correct' : ''}" data-q="${i}" data-ans="${j}">
                                    <span class="qz-answer-letter">${['A','B','C','D','E'][j]}</span>
                                    <input type="text" class="custom-input q-answer" value="${qData?.answers[j] || ''}" placeholder="Option ${['A','B','C','D','E'][j]}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                container.appendChild(div);
            }

            // Image Upload Event Listener for each Question
            container.querySelectorAll('.q-img-file').forEach((input, i) => {
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    showToast('Uploading image to ImgBB...', 'info');
                    try {
                        const url = await uploadToImgBB(file);
                        windowQImages[i] = url;
                        const prev = container.querySelectorAll('.q-img-preview')[i];
                        prev.style.display = 'block';
                        prev.querySelector('img').src = url;
                        showToast('Image uploaded successfully!', 'ok');
                    } catch (err) { showToast(err.message, 'error'); }
                };
            });

            // Correct Answer Radio Logic
            container.querySelectorAll('.qz-answer-item').forEach(item => {
                item.onclick = (e) => {
                    if (e.target.tagName === 'INPUT') return;
                    const qIdx = parseInt(item.dataset.q);
                    const aIdx = parseInt(item.dataset.ans);
                    const parent = item.closest('.qz-answers-grid');
                    parent.querySelectorAll('.qz-answer-item').forEach(el => el.classList.remove('correct'));
                    item.classList.add('correct');
                    windowQuizAnswers[qIdx] = aIdx;
                    validateQuizForm();
                };
            });

            validateQuizForm();
        }

        function validateQuizForm() {
            const blocks = qsa('.qz-question-block');
            let valid = blocks.length > 0;
            blocks.forEach((b, i) => {
                const text = b.querySelector('.q-text').value.trim();
                const hasCorrect = windowQuizAnswers[i] !== undefined;
                if (!text || !hasCorrect) valid = false;
            });
            $('submitQuizBtn').disabled = !valid;
        }

        $('btnBuildQuestions')?.addEventListener('click', () => buildQuestionsUI());
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('q-text') || e.target.classList.contains('q-answer')) validateQuizForm();
        });

        // Add Quiz Modal Open
        $('btnAddQuiz')?.addEventListener('click', () => {
            editingQuizId = null;
            $('quizModalTitle').innerHTML = '<i class="fa-solid fa-plus"></i> Create New Quiz';
            $('quizTitle').value = 'Quiz';
            buildQuestionsUI();
            $('quizModal').classList.add('open');
        });

        $('closeQuizModal')?.addEventListener('click', () => $('quizModal').classList.remove('open'));
        $('closeQuizModal2')?.addEventListener('click', () => $('quizModal').classList.remove('open'));

        // Submit Quiz (Create or Update)
        $('submitQuizBtn')?.addEventListener('click', async () => {
            const btn = $('submitQuizBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> Saving...';

            try {
                const title = $('quizTitle').value.trim();
                const duration = parseInt($('quizDuration').value) || 30;
                const grade = $('quizGrade').value;
                const cls = $('quizClass').value;
                const stream = (grade === '12' || grade === '13') ? $('quizStream').value : '';

                const questions = [];
                qsa('.qz-question-block').forEach((b, i) => {
                    const text = b.querySelector('.q-text').value.trim();
                    const answers = [...b.querySelectorAll('.q-answer')].map(inp => inp.value.trim());
                    questions.push({
                        text,
                        answers,
                        correctAnswer: windowQuizAnswers[i],
                        imageUrl: windowQImages[i] || null
                    });
                });

                const now = new Date();
                const expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

                const data = {
                    teacherId: currentUser.uid,
                    teacherName: currentProfile.displayName || 'Teacher',
                    title, grade, class: cls, stream, duration,
                    expiresAt: Timestamp.fromDate(expiresAt),
                    questions
                };

                if (editingQuizId) {
                    await updateDoc(doc(db, 'quizzes', editingQuizId), data);
                    showToast('Quiz updated successfully!', 'ok');
                } else {
                    data.createdAt = serverTimestamp();
                    data.responses = {};
                    await addDoc(collection(db, 'quizzes'), data);
                    showToast('Quiz created successfully!', 'ok');
                }

                $('quizModal').classList.remove('open');
            } catch (err) { showToast(err.message, 'error'); }

            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Quiz';
        });

        // Edit Quiz
        function editQuiz(id) {
            const q = teacherQuizzes.find(x => x.id === id);
            if (!q) return;
            editingQuizId = id;
            $('quizModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Quiz';
            $('quizTitle').value = q.title;
            $('quizGrade').value = q.grade;
            $('quizClass').value = q.class;
            
            if (q.grade === '12' || q.grade === '13') {
                $('streamFieldWrap').style.display = 'block';
                $('quizStream').value = q.stream || '';
            } else {
                $('streamFieldWrap').style.display = 'none';
            }

            buildQuestionsUI(q.questions);
            $('quizModal').classList.add('open');
        }

        // Delete Quiz
        async function deleteQuiz(id) {
            if (confirm('Are you sure you want to delete this quiz?')) {
                await deleteDoc(doc(db, 'quizzes', id));
                showToast('Quiz deleted.', 'ok');
            }
        }

        // Full Screen Detailed Analysis
        async function openAnalysis(id) {
            const modal = $('analysisModal');
            const content = $('analysisContent');
            modal.classList.add('open');
            content.innerHTML = `<div style="text-align:center;padding:50px;"><i class="fa-solid fa-spinner spin fa-2x"></i></div>`;

            try {
                const snap = await getDoc(doc(db, 'quizzes', id));
                if (!snap.exists()) return;
                const data = snap.data();
                const responses = Object.values(data.responses || {});

                let html = `
                    <div style="margin-bottom:20px;">
                        <h3>${data.title} - Results (${responses.length} Submissions)</h3>
                    </div>
                `;

                if (responses.length === 0) {
                    html += `<p style="color:var(--text-muted);">No responses received yet.</p>`;
                } else {
                    html += `<div class="qz-table-wrap"><table class="qz-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Index No</th>
                                <th>Class/Stream</th>
                                <th>Score</th>
                                <th>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${responses.map(r => `
                                <tr>
                                    <td style="display:flex;align-items:center;gap:10px;">
                                        <img src="${r.photoURL || 'https://via.placeholder.com/35'}" style="width:32px;height:32px;border-radius:50%;">
                                        <div>
                                            <strong>${r.displayName || 'Student'}</strong><br>
                                            <small style="color:var(--text-muted);">${r.email || ''}</small>
                                        </div>
                                    </td>
                                    <td>${r.indexNo || 'N/A'}</td>
                                    <td>Grade ${r.grade || ''} ${r.studentClass || ''} (${r.stream || 'N/A'})</td>
                                    <td>${r.correctCount}/${r.total}</td>
                                    <td><strong style="color:${r.score >= 50 ? '#10b981' : '#ef4444'}">${r.score}%</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table></div>`;
                }

                content.innerHTML = html;
            } catch (err) { content.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`; }
        }

        $('closeAnalysisModal')?.addEventListener('click', () => $('analysisModal').classList.remove('open'));

        // News Handling
        let newsImgUrl = null;
        $('btnAddNews')?.addEventListener('click', () => {
            newsImgUrl = null;
            $('newsTitle').value = '';
            $('newsDesc').value = '';
            $('newsFileInput').value = '';
            $('newsPreview').style.display = 'none';
            $('newsStreamFieldWrap').style.display = 'none';
            $('newsModal').classList.add('open');
        });

        $('closeNewsModal')?.addEventListener('click', () => $('newsModal').classList.remove('open'));
        $('closeNewsModal2')?.addEventListener('click', () => $('newsModal').classList.remove('open'));

        $('newsFileInput')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            showToast('Uploading news image...', 'info');
            try {
                newsImgUrl = await uploadToImgBB(file);
                $('newsPreviewImg').src = newsImgUrl;
                $('newsPreview').style.display = 'block';
                showToast('Image uploaded!', 'ok');
            } catch (err) { showToast(err.message, 'error'); }
        });

        $('submitNewsBtn')?.addEventListener('click', async () => {
            const title = $('newsTitle').value.trim();
            const desc = $('newsDesc').value.trim();
            if (!title || !desc) return showToast('Title and description required', 'error');

            const grade = $('newsGrade').value;
            const stream = (grade === '12' || grade === '13') ? $('newsStream').value : '';

            await addDoc(collection(db, 'academic_news'), {
                teacherId: currentUser.uid,
                teacherName: currentProfile.displayName || 'Teacher',
                title, description: desc,
                position: $('newsPosition').value.trim() || 'Teacher',
                grade,
                class: $('newsClass').value,
                stream,
                imageUrl: newsImgUrl,
                createdAt: serverTimestamp(),
                views: []
            });

            showToast('News posted!', 'ok');
            $('newsModal').classList.remove('open');
        });

        // Delete News නිවැරදි කරන ලද කේතය
        async function deleteNews(id) {
            if (confirm('Delete this news?')) {
                await deleteDoc(doc(db, 'academic_news', id));
                showToast('News deleted.', 'ok');
            }
        }

        // Viewers list modal
        function openViewsModal(id) {
            const n = teacherNews.find(x => x.id === id);
            if (!n) return;
            const content = $('viewsContent');
            const views = n.views || [];

            let html = `<h4>Viewed by ${views.length} students</h4>`;
            if (views.length === 0) {
                html += `<p style="color:var(--text-muted);">No views recorded yet.</p>`;
            } else {
                html += `<ul style="list-style:none;padding:0;">${views.map(v => `
                    <li style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
                        <img src="${v.photoURL || 'https://via.placeholder.com/30'}" style="width:30px;height:30px;border-radius:50%;">
                        <div>
                            <strong>${v.displayName}</strong> (${v.indexNo || 'N/A'})<br>
                            <small style="color:var(--text-muted);">Grade ${v.grade} ${v.studentClass}</small>
                        </div>
                    </li>
                `).join('')}</ul>`;
            }

            content.innerHTML = html;
            $('viewsModal').classList.add('open');
        }

        $('closeViewsModal')?.addEventListener('click', () => $('viewsModal').classList.remove('open'));

        // Tabs
        qsa('.qz-tab').forEach(tab => {
            tab.onclick = () => {
                qsa('.qz-tab').forEach(t => t.classList.remove('active'));
                qsa('.qz-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                $(tab.dataset.tab === 'quizzes' ? 'tabQuizzes' : 'tabNews').classList.add('active');
            };
        });

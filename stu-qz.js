       import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
       import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
       import {
            getFirestore, doc, getDoc, updateDoc, arrayUnion, collection, onSnapshot
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
        const auth = getAuth(app);
        const db = getFirestore(app);

        const $ = id => document.getElementById(id);
        const qsa = sel => [...document.querySelectorAll(sel)];

        let currentUser = null;
        let currentProfile = null;
        let availableQuizzes = [];
        let availableNews = [];
        let activeQuiz = null;
        let userSelectedAnswers = {};

        // Dynamic Navigation & Sidebar Listeners
        document.addEventListener('DOMContentLoaded', setupNavigation);

        function setupNavigation() {
            $('menuToggle')?.addEventListener('click', () => {
                $('sidebar')?.classList.add('active', 'open');
                $('menuOverlay')?.classList.add('active', 'open');
            });

            const hideMenu = () => {
                $('sidebar')?.classList.remove('active', 'open');
                $('menuOverlay')?.classList.remove('active', 'open');
            };

            $('closeMenu')?.addEventListener('click', hideMenu);
            $('menuOverlay')?.addEventListener('click', hideMenu);
        }

        // Auth State Listener
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            if (!user) {
                if ($('loadingState')) $('loadingState').style.display = 'none';
                if ($('signedOutState')) $('signedOutState').style.display = 'block';
                return;
            }

            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    currentProfile = snap.data();
                    
                    if ($('stuName')) $('stuName').textContent = currentProfile.displayName || 'Student';
                    if ($('stuClassInfo')) {
                        $('stuClassInfo').textContent = `Grade ${currentProfile.baseGrade || currentProfile.grade || ''} - Class ${currentProfile.studentClass || ''} (${currentProfile.stream || 'General'})`;
                    }
                    if (currentProfile.photoURL && $('stuAvatar')) $('stuAvatar').src = currentProfile.photoURL;

                    if ($('loadingState')) $('loadingState').style.display = 'none';
                    if ($('studentDashboard')) $('studentDashboard').style.display = 'block';

                    loadQuizzesAndNews();
                } else {
                    if ($('loadingState')) $('loadingState').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><h3>Profile Record Not Found</h3>';
                }
            } catch (e) { 
                console.error("Profile load error:", e); 
                if ($('loadingState')) $('loadingState').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><h3>Error Loading Profile</h3>';
            }
        });

        // Helper function to normalize Stream names (e.g. Technology -> Tech)
        function normalizeStream(s) {
            const str = String(s || '').trim().toLowerCase();
            if (str.includes('tech')) return 'tech';
            if (str.includes('bio')) return 'bio';
            if (str.includes('math')) return 'maths';
            if (str.includes('com')) return 'commerce';
            if (str.includes('art')) return 'art';
            return str;
        }

        // Target audience verification
        function matchesTargetAudience(item) {
            if (!currentProfile) return false;

            const stuGrade = String(currentProfile.baseGrade || currentProfile.grade || '').trim().toLowerCase();
            const stuClass = String(currentProfile.studentClass || '').trim().toLowerCase().replace(/^class\s+/, '');
            const stuStream = normalizeStream(currentProfile.stream);

            const itemGrade = String(item.grade || '').trim().toLowerCase();
            const itemClass = String(item.class || '').trim().toLowerCase().replace(/^class\s+/, '');
            const itemStream = normalizeStream(item.stream);

            const isGradeMatch = (itemGrade === 'all' || itemGrade === '' || itemGrade === stuGrade);
            const isClassMatch = (itemClass === 'all' || itemClass === '' || itemClass === stuClass);
            const isStreamMatch = (!itemStream || itemStream === 'all' || itemStream === '' || itemStream === stuStream);

            return isGradeMatch && isClassMatch && isStreamMatch;
        }

        function loadQuizzesAndNews() {
            // Listen to Quizzes
            onSnapshot(collection(db, 'quizzes'), snap => {
                availableQuizzes = [];
                snap.forEach(d => {
                    const data = d.data();
                    if (matchesTargetAudience(data)) {
                        availableQuizzes.push({ id: d.id, ...data });
                    }
                });
                renderQuizzes();
            }, err => console.error("Error fetching quizzes:", err));

            // Listen to Academic News
            onSnapshot(collection(db, 'academic_news'), snap => {
                availableNews = [];
                snap.forEach(d => {
                    const data = d.data();
                    if (matchesTargetAudience(data)) {
                        availableNews.push({ id: d.id, ...data });
                    }
                });
                renderNews();
            }, err => console.error("Error fetching news:", err));
        }

        function renderQuizzes() {
            const container = $('quizList');
            if (!container) return;

            if (availableQuizzes.length === 0) {
                container.innerHTML = `
                    <div class="qz-empty-state">
                        <i class="fa-solid fa-clipboard-list"></i>
                        <h3>No Quizzes Available</h3>
                        <p>There are no active quizzes assigned for your grade or class right now.</p>
                    </div>`;
                return;
            }

            container.innerHTML = availableQuizzes.map(q => {
                const resp = q.responses?.[currentUser.uid];
                return `
                    <div class="qz-card">
                        <div class="qz-card-header">
                            <i class="fa-solid fa-pen-nib qz-icon"></i>
                            <div>
                                <div class="qz-card-title">${q.title}</div>
                                <div class="qz-card-meta" style="margin-top:4px;">By ${q.teacherName || 'Teacher'}</div>
                            </div>
                        </div>
                        ${resp ? `
                            <div style="margin-top:10px;padding:10px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:10px;color:#10b981;font-weight:700;font-size:0.88rem;display:flex;align-items:center;gap:8px;">
                                <i class="fa-solid fa-circle-check"></i> Completed: ${resp.score}% (${resp.correctCount}/${resp.total})
                            </div>
                        ` : `
                            <button class="btn btn-primary btn-sm btn-start-q" data-id="${q.id}" style="margin-top:12px;width:100%;">Start Quiz</button>
                        `}
                    </div>
                `;
            }).join('');

            container.querySelectorAll('.btn-start-q').forEach(b => b.onclick = () => startQuiz(b.dataset.id));
        }

        function startQuiz(id) {
            activeQuiz = availableQuizzes.find(x => x.id === id);
            if (!activeQuiz) return;
            userSelectedAnswers = {};
            if ($('attemptQuizTitle')) $('attemptQuizTitle').textContent = activeQuiz.title;

            const body = $('attemptBody');
            if (!body) return;

            body.innerHTML = `
                ${activeQuiz.questions.map((q, i) => `
                    <div class="qz-question-block">
                        <p class="qz-q-num">Q${i+1}. ${q.text}</p>
                        ${q.imageUrl ? `<img src="${q.imageUrl}" style="max-height:180px;border-radius:10px;margin-bottom:12px;object-fit:cover;">` : ''}
                        <div class="qz-answers-grid">
                            ${q.answers.map((ans, j) => `
                                <div class="qz-answer-item stu-ans-item" data-q="${i}" data-ans="${j}">
                                    <span class="qz-answer-letter">${['A','B','C','D','E'][j]}</span>
                                    <span>${ans}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
                <button class="btn btn-primary" id="btnSubmitAttempt" style="margin-top:20px;width:100%;">Submit Quiz Answers</button>
            `;

            body.querySelectorAll('.stu-ans-item').forEach(item => {
                item.onclick = () => {
                    const qIdx = parseInt(item.dataset.q);
                    const aIdx = parseInt(item.dataset.ans);
                    item.closest('.qz-answers-grid').querySelectorAll('.stu-ans-item').forEach(x => x.classList.remove('correct'));
                    item.classList.add('correct');
                    userSelectedAnswers[qIdx] = aIdx;
                };
            });

            if ($('btnSubmitAttempt')) $('btnSubmitAttempt').onclick = submitAttempt;
            $('attemptModal')?.classList.add('open');
        }

        async function submitAttempt() {
            let correctCount = 0;
            const total = activeQuiz.questions.length;

            const answeredCount = Object.keys(userSelectedAnswers).length;
            if (answeredCount < total) {
                if (!confirm(`You have answered ${answeredCount} out of ${total} questions. Are you sure you want to submit?`)) {
                    return;
                }
            }

            activeQuiz.questions.forEach((q, i) => {
                if (userSelectedAnswers[i] === q.correctAnswer) correctCount++;
            });

            const score = Math.round((correctCount / total) * 100);

            const responseData = {
                displayName: currentProfile.displayName || '',
                indexNo: currentProfile.indexNo || 'N/A',
                email: currentUser.email || '',
                photoURL: currentProfile.photoURL || '',
                studentClass: currentProfile.studentClass || '',
                grade: currentProfile.baseGrade || currentProfile.grade || '',
                stream: currentProfile.stream || '',
                score,
                correctCount,
                total,
                answers: userSelectedAnswers,
                submittedAt: new Date().toISOString()
            };

            try {
                await updateDoc(doc(db, 'quizzes', activeQuiz.id), {
                    [`responses.${currentUser.uid}`]: responseData
                });

                alert(`Quiz Submitted! Your Score: ${score}% (${correctCount}/${total})`);
                $('attemptModal')?.classList.remove('open');
            } catch (err) {
                console.error("Error submitting quiz:", err);
                alert("Failed to submit quiz. Please try again.");
            }
        }

        function renderNews() {
            const container = $('newsList');
            if (!container) return;

            if (availableNews.length === 0) {
                container.innerHTML = `
                    <div class="qz-empty-state">
                        <i class="fa-solid fa-newspaper"></i>
                        <h3>No Academic News</h3>
                        <p>There are no news announcements published for your class at the moment.</p>
                    </div>`;
                return;
            }

            container.innerHTML = availableNews.map(n => `
                <div class="qz-news-card stu-news-card" data-id="${n.id}">
                    ${n.imageUrl ? `<img src="${n.imageUrl}" class="qz-news-img">` : ''}
                    <div class="qz-news-body">
                        <h4>${n.title}</h4>
                        <p>${(n.description || '').substring(0, 90)}...</p>
                        <div class="qz-news-meta">
                            <span><i class="fa-solid fa-user-tie"></i> ${n.position || 'Teacher'}</span>
                            <span><i class="fa-solid fa-chevron-right"></i> Read More</span>
                        </div>
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('.stu-news-card').forEach(c => c.onclick = () => openNewsDetail(c.dataset.id));
        }

        async function openNewsDetail(id) {
            const n = availableNews.find(x => x.id === id);
            if (!n) return;

            if ($('newsDetailContent')) {
                $('newsDetailContent').innerHTML = `
                    ${n.imageUrl ? `<img src="${n.imageUrl}" style="width:100%;border-radius:12px;margin-bottom:15px;">` : ''}
                    <h3>${n.title}</h3>
                    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:15px;">Posted by: ${n.position || 'Teacher'}</p>
                    <p style="line-height:1.6;">${n.description || ''}</p>
                `;
            }
            $('newsDetailModal')?.classList.add('open');

            try {
                await updateDoc(doc(db, 'academic_news', id), {
                    views: arrayUnion({
                        uid: currentUser.uid,
                        displayName: currentProfile.displayName || 'Student',
                        indexNo: currentProfile.indexNo || 'N/A',
                        studentClass: currentProfile.studentClass || '',
                        grade: currentProfile.baseGrade || currentProfile.grade || '',
                        photoURL: currentProfile.photoURL || ''
                    })
                });
            } catch (e) {
                console.warn("Could not log news view:", e);
            }
        }

        // Modal Close Listeners & Tabs
        $('closeAttemptModal')?.addEventListener('click', () => $('attemptModal')?.classList.remove('open'));
        $('closeNewsDetail')?.addEventListener('click', () => $('newsDetailModal')?.classList.remove('open'));

        qsa('.qz-tab').forEach(tab => {
            tab.onclick = () => {
                qsa('.qz-tab').forEach(t => t.classList.remove('active'));
                qsa('.qz-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const target = $(tab.dataset.tab === 'quizzes' ? 'tabQuizzes' : 'tabNews');
                if (target) target.classList.add('active');
            };
        });


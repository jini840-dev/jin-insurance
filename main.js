document.addEventListener('DOMContentLoaded', () => {
    // --- 기초 데이터: 포인트 정책 ---
    const POINT_POLICY = {
        PHONE_USAGE: [
            { hours: 1, points: 1000 },
            { hours: 2, points: 2000 },
            { hours: 3, points: 3000 },
            { hours: 4, points: 5000 },
            { hours: 5, points: 7000 },
            { hours: 6, points: 10000 },
            { hours: 7, points: 15000 },
            { hours: 8, points: 20000 },
            { hours: 9, points: 30000 } // 8시간 초과
        ],
        ENGLISH_WORDS: [
            { count: 10, points: 100 },
            { count: 20, points: 200 },
            { count: 50, points: 500 },
            { count: 80, points: 800 },
            { count: 100, points: 3000 },
            { count: 150, points: 5000 },
            { count: 200, points: 10000 },
            { count: 201, points: 20000 } // 200개 초과
        ],
        ECON_QUIZ: [
            { count: 1, points: 500 },
            { count: 2, points: 1000 },
            { count: 3, points: 1500 },
            { count: 4, points: 2000 }
        ]
    };

    // --- 경제 퀴즈 문제 데이터 ---
    const QUIZ_DATA = [
        {
            q: "물가가 계속해서 오르고 돈의 가치가 떨어지는 현상을 무엇이라고 할까요?",
            options: ["인플레이션", "디플레이션", "스태그플레이션", "환율상승"],
            answer: 0,
            desc: "인플레이션은 물가가 상승하여 화폐 가치가 하락하는 현상입니다."
        },
        {
            q: "은행에 돈을 맡기거나 빌릴 때 지불하는 '돈의 가격'을 무엇이라고 할까요?",
            options: ["배당금", "이자", "수수료", "세금"],
            answer: 1,
            desc: "이자는 자금을 빌린 대가로 지급하는 비용입니다."
        },
        {
            q: "사람들의 욕구는 무한하지만, 이를 충족할 자원은 한정되어 있는 상태를 무엇이라고 할까요?",
            options: ["독점성", "대체성", "희소성", "공공성"],
            answer: 2,
            desc: "희소성은 자원이 유한하여 선택의 문제가 발생하는 경제의 기본 원리입니다."
        },
        {
            q: "여러 선택지 중 하나를 선택했을 때, 포기한 나머지 중 가치가 가장 큰 것을 무엇이라고 할까요?",
            options: ["매몰비용", "고정비용", "기회비용", "한계비용"],
            answer: 2,
            desc: "기회비용은 어떤 선택으로 인해 포기하게 된 가장 가치 있는 대안입니다."
        }
    ];

    // --- 데이터 초기화 (localStorage) ---
    if (!localStorage.getItem('users')) {
        const initialUsers = [
            { id: 'jin_01', phone: '010-1234-5678', nickname: '지니' },
            { id: 'growth_expert', phone: '010-9876-5432', nickname: '성장전문가' },
            { id: 'tester', phone: '010-0000-0000', nickname: '테스터' }
        ];
        localStorage.setItem('users', JSON.stringify(initialUsers));
    }

    // 페이지 요소
    const pages = {
        intro: document.getElementById('page-intro'),
        dashboard: document.getElementById('page-dashboard'),
        admin: document.getElementById('page-admin')
    };

    // 모달 요소
    const modalPhone = document.getElementById('modal-phone');
    const inputNickname = document.getElementById('input-nickname');
    const inputPhone = document.getElementById('input-phone');

    const modalAdminAuth = document.getElementById('modal-admin-auth');
    const inputAdminPw = document.getElementById('input-admin-pw');

    const modalQuiz = document.getElementById('modal-quiz');

    // 상태 관리
    let currentUser = null;
    let currentUsageId = null;

    let quizState = {
        currentIdx: 0,
        score: 0,
        selectedIdx: null
    };

    let missions = [
        { id: 1, tag: '공부', title: '매일 영단어 20개 외우기', start: '2026.04.01', end: '2026.04.30', progress: 65, reward: 500 },
        { id: 2, tag: '퀴즈', title: '경제 상식 퀴즈 챌린지', start: '2026.04.15', end: '2026.04.22', progress: 30, reward: 200 }
    ];

    function formatDate(date) {
        const d = new Date(date);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function switchPage(pageId) {
        Object.values(pages).forEach(page => page.classList.add('hidden'));
        pages[pageId].classList.remove('hidden');
    }

    // --- 로그인 로직 ---
    document.getElementById('btn-phone-login').addEventListener('click', () => {
        modalPhone.classList.remove('hidden');
        inputNickname.focus();
    });

    document.getElementById('btn-modal-close').addEventListener('click', () => {
        modalPhone.classList.add('hidden');
        inputNickname.value = '';
        inputPhone.value = '';
    });

    inputPhone.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 3 && val.length <= 7) val = val.slice(0, 3) + '-' + val.slice(3);
        else if (val.length > 7) val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7);
        e.target.value = val;
    });

    document.getElementById('btn-phone-submit').addEventListener('click', () => {
        const nickVal = inputNickname.value.trim();
        const phoneVal = inputPhone.value.trim();
        if (nickVal.length < 2 || phoneVal.length < 10) {
            alert('입력 정보를 다시 확인해 주세요.');
            return;
        }

        let users = JSON.parse(localStorage.getItem('users') || '[]');
        let foundUser = users.find(u => u.phone === phoneVal);

        if (!foundUser) {
            foundUser = { id: 'user_' + Date.now(), phone: phoneVal, nickname: nickVal };
            users.push(foundUser);
            localStorage.setItem('users', JSON.stringify(users));
        } else {
            foundUser.nickname = nickVal;
            localStorage.setItem('users', JSON.stringify(users));
        }

        currentUser = { ...foundUser, points: 1250, age: 16 };
        currentUsageId = Date.now();
        const usageLog = JSON.parse(localStorage.getItem('usage_logs') || '[]');
        usageLog.push({ usageId: currentUsageId, userId: currentUser.id, phone: currentUser.phone, startTime: formatDate(new Date()), endTime: null });
        localStorage.setItem('usage_logs', JSON.stringify(usageLog));

        document.getElementById('user-nickname').innerText = `${currentUser.nickname} (#${currentUser.id})`;
        modalPhone.classList.add('hidden');
        updateDashboard();
        switchPage('dashboard');
    });

    function logout() {
        if (currentUsageId) {
            const usageLog = JSON.parse(localStorage.getItem('usage_logs') || '[]');
            const index = usageLog.findIndex(log => log.usageId === currentUsageId);
            if (index !== -1) {
                usageLog[index].endTime = formatDate(new Date());
                localStorage.setItem('usage_logs', JSON.stringify(usageLog));
            }
        }
        currentUser = null;
        currentUsageId = null;
        switchPage('intro');
    }

    // --- 운영자 인증 로직 ---
    document.getElementById('go-admin').addEventListener('click', () => {
        modalAdminAuth.classList.remove('hidden');
        inputAdminPw.focus();
    });

    document.getElementById('btn-admin-auth-close').addEventListener('click', () => {
        modalAdminAuth.classList.add('hidden');
        inputAdminPw.value = '';
    });

    document.getElementById('btn-admin-auth-submit').addEventListener('click', () => {
        if (inputAdminPw.value === '0125') {
            modalAdminAuth.classList.add('hidden');
            inputAdminPw.value = '';
            switchPage('admin');
        } else {
            alert('비밀번호가 올바르지 않습니다.');
            inputAdminPw.value = '';
            inputAdminPw.focus();
        }
    });

    // --- 경제 퀴즈 로직 ---
    document.getElementById('btn-start-quiz').addEventListener('click', () => {
        quizState = { currentIdx: 0, score: 0, selectedIdx: null };
        showQuizStep();
        modalQuiz.classList.remove('hidden');
    });

    document.getElementById('btn-quiz-close').addEventListener('click', () => {
        modalQuiz.classList.add('hidden');
    });

    function showQuizStep() {
        const qData = QUIZ_DATA[quizState.currentIdx];
        document.getElementById('quiz-step').innerText = `문제 ${quizState.currentIdx + 1}/${QUIZ_DATA.length}`;
        document.getElementById('quiz-question').innerText = qData.q;
        
        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.innerHTML = '';
        qData.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = `${idx + 1}. ${opt}`;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                quizState.selectedIdx = idx;
            });
            optionsContainer.appendChild(btn);
        });

        document.getElementById('quiz-result').classList.add('hidden');
        document.getElementById('btn-quiz-check').classList.remove('hidden');
        document.getElementById('btn-quiz-next').classList.add('hidden');
    }

    document.getElementById('btn-quiz-check').addEventListener('click', () => {
        if (quizState.selectedIdx === null) {
            alert('답을 선택해 주세요!');
            return;
        }

        const qData = QUIZ_DATA[quizState.currentIdx];
        const isCorrect = quizState.selectedIdx === qData.answer;
        const resultEl = document.getElementById('quiz-result');
        
        if (isCorrect) {
            quizState.score++;
            resultEl.innerText = `정답입니다! 👏 ${qData.desc}`;
            resultEl.className = 'quiz-result-msg correct';
        } else {
            resultEl.innerText = `아쉽네요. 정답은 '${qData.options[qData.answer]}'입니다. ${qData.desc}`;
            resultEl.className = 'quiz-result-msg wrong';
        }

        resultEl.classList.remove('hidden');
        document.getElementById('btn-quiz-check').classList.add('hidden');
        document.getElementById('btn-quiz-next').classList.remove('hidden');
        
        if (quizState.currentIdx === QUIZ_DATA.length - 1) {
            document.getElementById('btn-quiz-next').innerText = '결과 보기';
        } else {
            document.getElementById('btn-quiz-next').innerText = '다음 문제';
        }
    });

    document.getElementById('btn-quiz-next').addEventListener('click', () => {
        if (quizState.currentIdx < QUIZ_DATA.length - 1) {
            quizState.currentIdx++;
            quizState.selectedIdx = null;
            showQuizStep();
        } else {
            const reward = quizState.score * 500;
            currentUser.points += reward;
            alert(`퀴즈 완료! ${quizState.score}문제를 맞혀 ${reward}P를 획득했습니다! 🚀`);
            modalQuiz.classList.add('hidden');
            updateDashboard();
        }
    });

    // --- 대시보드 및 미션 로직 ---
    function updateDashboard() {
        if (!currentUser) return;
        document.getElementById('user-points').innerText = currentUser.points.toLocaleString();
        const futureValue = (currentUser.points * 1000) * Math.pow(1.05, 20 - currentUser.age);
        document.getElementById('future-asset-value').innerText = Math.floor(futureValue).toLocaleString();
        renderMissions();
    }

    function renderMissions() {
        const container = document.getElementById('mission-container');
        container.innerHTML = '';
        missions.forEach(m => {
            const card = document.createElement('div');
            card.className = 'mission-card';
            card.innerHTML = `
                <div class="mission-top"><span class="mission-tag">${m.tag}</span><span class="mission-period">${m.start} ~ ${m.end}</span></div>
                <div class="mission-title">${m.title}</div>
                <div class="progress-container"><div class="progress-fill" style="width: ${m.progress}%"></div></div>
                <div class="mission-footer"><span>성공률 ${m.progress}%</span><span class="reward-points">+${m.reward}P 예정</span></div>
            `;
            container.appendChild(card);
        });
    }

    document.getElementById('btn-admin-back').addEventListener('click', () => switchPage('dashboard'));
    
    const logoutBtn = document.createElement('button');
    logoutBtn.innerText = '로그아웃';
    logoutBtn.style.cssText = 'margin-top: 20px; background: #333; color: #fff; border: none; padding: 15px; border-radius: 12px; width: 100%; cursor: pointer; font-weight: 700;';
    logoutBtn.addEventListener('click', logout);
    pages.dashboard.appendChild(logoutBtn);

    document.getElementById('mission-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const typeSelect = document.getElementById('mission-type');
        missions.unshift({
            id: Date.now(),
            tag: typeSelect.options[typeSelect.selectedIndex].text.split(' ')[0],
            title: document.getElementById('mission-title').value,
            start: formatDate(new Date()).split(' ')[0],
            end: '미정',
            progress: 0,
            reward: parseInt(document.getElementById('mission-reward').value)
        });
        alert('미션이 등록되었습니다! 🚀');
        updateDashboard();
        switchPage('dashboard');
        e.target.reset();
    });
});

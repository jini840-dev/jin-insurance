document.addEventListener('DOMContentLoaded', () => {
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
    const inputPhone = document.getElementById('input-phone');

    // 상태 관리
    let currentUser = null;
    let currentUsageId = null;

    let missions = [
        {
            id: 1,
            tag: '공부',
            title: '매일 영단어 20개 외우기',
            start: '2026.04.01',
            end: '2026.04.30',
            progress: 65,
            reward: 500
        },
        {
            id: 2,
            tag: '퀴즈',
            title: '경제 상식 퀴즈 챌린지',
            start: '2026.04.15',
            end: '2026.04.22',
            progress: 30,
            reward: 200
        }
    ];

    // 날짜 포맷팅 함수 (YYYY-MM-DD HH:mm)
    function formatDate(date) {
        const d = new Date(date);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // 페이지 전환 함수
    function switchPage(pageId) {
        Object.values(pages).forEach(page => page.classList.add('hidden'));
        pages[pageId].classList.remove('hidden');
    }

    // --- 휴대폰 로그인 로직 ---

    document.getElementById('btn-phone-login').addEventListener('click', () => {
        modalPhone.classList.remove('hidden');
        inputPhone.focus();
    });

    document.getElementById('btn-modal-close').addEventListener('click', () => {
        modalPhone.classList.add('hidden');
        inputPhone.value = '';
    });

    inputPhone.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 3 && val.length <= 7) {
            val = val.slice(0, 3) + '-' + val.slice(3);
        } else if (val.length > 7) {
            val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7);
        }
        e.target.value = val;
    });

    // 로그인 및 사용 기록 시작
    document.getElementById('btn-phone-submit').addEventListener('click', () => {
        const phoneVal = inputPhone.value;
        const users = JSON.parse(localStorage.getItem('users'));
        
        // 1. 사용자 확인
        const foundUser = users.find(u => u.phone === phoneVal);

        if (!foundUser) {
            alert('등록되지 않은 사용자입니다. 관리자에게 문의하세요.');
            return;
        }

        // 2. 로그인 성공 처리
        currentUser = {
            ...foundUser,
            points: 1250, // 기본 포인트 (실제로는 유저 DB에서 가져와야 함)
            age: 16
        };

        // 3. 휴대폰 사용 정보 기록 (시작)
        const startTime = formatDate(new Date());
        currentUsageId = Date.now();
        const usageLog = JSON.parse(localStorage.getItem('usage_logs') || '[]');
        usageLog.push({
            usageId: currentUsageId,
            userId: currentUser.id,
            phone: currentUser.phone,
            startTime: startTime,
            endTime: null
        });
        localStorage.setItem('usage_logs', JSON.stringify(usageLog));

        // UI 업데이트
        document.getElementById('user-nickname').innerText = `${currentUser.nickname} (#${currentUser.id})`;
        modalPhone.classList.add('hidden');
        updateDashboard();
        switchPage('dashboard');
        console.log(`[Login] ${currentUser.id} started at ${startTime}`);
    });

    // 로그아웃 및 사용 기록 종료
    function logout() {
        if (currentUsageId) {
            const usageLog = JSON.parse(localStorage.getItem('usage_logs') || '[]');
            const index = usageLog.findIndex(log => log.usageId === currentUsageId);
            if (index !== -1) {
                usageLog[index].endTime = formatDate(new Date());
                localStorage.setItem('usage_logs', JSON.stringify(usageLog));
                console.log(`[Logout] Recorded end time for ${currentUser.id}`);
            }
        }
        currentUser = null;
        currentUsageId = null;
        switchPage('intro');
    }

    // --- 대시보드 로직 ---
    function updateDashboard() {
        if (!currentUser) return;
        document.getElementById('user-points').innerText = currentUser.points.toLocaleString();
        
        const yearsToAdult = 20 - currentUser.age;
        const principal = currentUser.points * 1000; 
        const rate = 0.05;
        const futureValue = principal * Math.pow((1 + rate), yearsToAdult);
        
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
                <div class="mission-top">
                    <span class="mission-tag">${m.tag}</span>
                    <span class="mission-period">${m.start} ~ ${m.end}</span>
                </div>
                <div class="mission-title">${m.title}</div>
                <div class="progress-container">
                    <div class="progress-fill" style="width: ${m.progress}%"></div>
                </div>
                <div class="mission-footer">
                    <span>성공률 ${m.progress}%</span>
                    <span class="reward-points">+${m.reward}P 예정</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // 관리자/로그아웃 버튼 이벤트
    document.getElementById('go-admin').addEventListener('click', () => switchPage('admin'));
    document.getElementById('btn-admin-back').addEventListener('click', () => switchPage('dashboard'));
    
    // 로그아웃 버튼 (HTML에 추가 필요)
    const logoutBtn = document.createElement('button');
    logoutBtn.innerText = '로그아웃';
    logoutBtn.className = 'btn-logout'; // 스타일 필요
    logoutBtn.style.cssText = 'margin-top: 20px; background: #333; color: #fff; border: none; padding: 10px; border-radius: 8px; width: 100%;';
    logoutBtn.addEventListener('click', logout);
    pages.dashboard.appendChild(logoutBtn);

    // 미션 등록 로직
    document.getElementById('mission-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const typeSelect = document.getElementById('mission-type');
        const newMission = {
            id: Date.now(),
            tag: typeSelect.options[typeSelect.selectedIndex].text.split(' ')[0],
            title: document.getElementById('mission-title').value,
            start: formatDate(new Date()).split(' ')[0],
            end: '미정',
            progress: 0,
            reward: parseInt(document.getElementById('mission-reward').value)
        };

        missions.unshift(newMission);
        alert('새로운 성장의 기회가 등록되었습니다! 🚀');
        updateDashboard();
        switchPage('dashboard');
        e.target.reset();
    });
});


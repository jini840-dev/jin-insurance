document.addEventListener('DOMContentLoaded', () => {
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
    let user = {
        nickname: '성장크루',
        phone: '',
        points: 1250,
        age: 16 
    };

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

    // 페이지 전환 함수
    function switchPage(pageId) {
        Object.values(pages).forEach(page => page.classList.add('hidden'));
        pages[pageId].classList.remove('hidden');
    }

    // --- 휴대폰 로그인 로직 ---

    // 1. 휴대폰 번호로 시작 버튼 클릭 시 모달 열기
    document.getElementById('btn-phone-login').addEventListener('click', () => {
        modalPhone.classList.remove('hidden');
        inputPhone.focus();
    });

    // 2. 모달 닫기 (취소 버튼)
    document.getElementById('btn-modal-close').addEventListener('click', () => {
        modalPhone.classList.add('hidden');
        inputPhone.value = '';
    });

    // 3. 휴대폰 번호 입력 자동 하이픈 (선택사항)
    inputPhone.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 3 && val.length <= 7) {
            val = val.slice(0, 3) + '-' + val.slice(3);
        } else if (val.length > 7) {
            val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7);
        }
        e.target.value = val;
    });

    // 4. 시작하기 버튼 클릭 시 대시보드 진입
    document.getElementById('btn-phone-submit').addEventListener('click', () => {
        const phoneVal = inputPhone.value;
        if (phoneVal.length < 10) {
            alert('올바른 휴대폰 번호를 입력해 주세요.');
            return;
        }

        user.phone = phoneVal;
        // 뒷번호 4자리를 닉네임에 활용 (예: 성장크루 #1234)
        const lastFour = phoneVal.slice(-4);
        user.nickname = `성장크루 #${lastFour}`;
        
        document.getElementById('user-nickname').innerText = user.nickname;
        
        modalPhone.classList.add('hidden');
        updateDashboard();
        switchPage('dashboard');
    });

    // 2. 대시보드 업데이트 및 복리 계산
    function updateDashboard() {
        document.getElementById('user-points').innerText = user.points.toLocaleString();
        
        const yearsToAdult = 20 - user.age;
        const principal = user.points * 1000; 
        const rate = 0.05;
        const futureValue = principal * Math.pow((1 + rate), yearsToAdult);
        
        document.getElementById('future-asset-value').innerText = Math.floor(futureValue).toLocaleString();
        
        renderMissions();
    }

    // 3. 미션 카드 렌더링
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

    // 4. 관리자 페이지 전환
    document.getElementById('go-admin').addEventListener('click', () => switchPage('admin'));
    document.getElementById('btn-admin-back').addEventListener('click', () => switchPage('dashboard'));

    // 5. 미션 등록 로직
    document.getElementById('mission-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const typeSelect = document.getElementById('mission-type');
        const newMission = {
            id: Date.now(),
            tag: typeSelect.options[typeSelect.selectedIndex].text.split(' ')[0],
            title: document.getElementById('mission-title').value,
            start: new Date().toLocaleDateString(),
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

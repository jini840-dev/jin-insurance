document.addEventListener('DOMContentLoaded', () => {
    // Kakao SDK 초기화 (본인의 JavaScript 키로 교체하세요)
    // 예: Kakao.init('1234567890abcdef...');
    const KAKAO_JS_KEY = '7b303a7349ab87068d7888a55dc195af'; // 여기에 키를 입력하세요
    
    if (typeof Kakao !== 'undefined') {
        if (!Kakao.isInitialized()) {
            Kakao.init(KAKAO_JS_KEY);
        }
    }

    // 페이지 요소
    const pages = {
        intro: document.getElementById('page-intro'),
        dashboard: document.getElementById('page-dashboard'),
        admin: document.getElementById('page-admin')
    };

    // 상태 관리
    let user = {
        nickname: '지니',
        points: 1250,
        age: 16 // 현재 나이 (가정)
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

    // 1. 카카오 로그인 로직
    document.getElementById('btn-kakao-login').addEventListener('click', () => {
        if (KAKAO_JS_KEY === 'YOUR_KAKAO_JS_KEY') {
            alert('카카오 JavaScript 키가 설정되지 않았습니다. main.js 상단의 KAKAO_JS_KEY를 설정해 주세요.');
            // 테스트용 시뮬레이션 유지
            const nickname = prompt("사용하실 닉네임을 입력해 주세요!", "성장크루 #지니");
            if (nickname) {
                user.nickname = nickname;
                document.getElementById('user-nickname').innerText = user.nickname;
                updateDashboard();
                switchPage('dashboard');
            }
            return;
        }

        Kakao.Auth.login({
            success: function(authObj) {
                console.log('Login Success:', authObj);
                // 로그인 성공 시 사용자 정보 가져오기
                Kakao.API.request({
                    url: '/v2/user/me',
                    success: function(res) {
                        console.log('User Info:', res);
                        const kakaoNickname = res.kakao_account.profile.nickname;
                        
                        // 사용자 정보 업데이트
                        user.nickname = kakaoNickname || '성장크루';
                        document.getElementById('user-nickname').innerText = user.nickname;
                        
                        // 대시보드로 이동
                        updateDashboard();
                        switchPage('dashboard');
                    },
                    fail: function(error) {
                        console.error('Failed to get user info:', error);
                    }
                });
            },
            fail: function(err) {
                console.error('Login Failed:', err);
                alert('카카오 로그인에 실패했습니다.');
            },
        });
    });

    // 2. 대시보드 업데이트 및 복리 계산
    function updateDashboard() {
        document.getElementById('user-points').innerText = user.points.toLocaleString();
        
        // 복리 계산 시뮬레이션: (포인트 * 1000)원을 연 5% 복리로 20세까지 굴렸을 때
        const yearsToAdult = 20 - user.age;
        const principal = user.points * 1000; // 1포인트당 1000원의 가치로 가정
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
        
        // 폼 초기화
        e.target.reset();
    });
});

// --- Firebase SDK 및 초기화 ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// TODO: Firebase 콘솔에서 발급받은 실제 Config 값으로 교체하세요.
const firebaseConfig = {
    apiKey: "AIzaSyB-VooJveCkmf8pe_tBj64rgFD_K9MzfRU",
    authDomain: "jin-growth.firebaseapp.com",
    projectId: "jin-growth",
    storageBucket: "jin-growth.firebasestorage.app",
    messagingSenderId: "27010798564",
    appId: "1:27010798564:web:7a3d6cb7729c3237372df1",
    measurementId: "G-1NDJ1FP1QC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    // --- 기초 데이터: 포인트 정책 ---
    const POINT_POLICY = {
        PHONE_USAGE: [
            { hours: 1, points: 1000 }, { hours: 2, points: 2000 },
            { hours: 3, points: 3000 }, { hours: 4, points: 5000 },
            { hours: 5, points: 7000 }, { hours: 6, points: 10000 },
            { hours: 7, points: 15000 }, { hours: 8, points: 20000 },
            { hours: 9, points: 30000 }
        ],
        ENGLISH_WORDS: [
            { count: 10, points: 100 }, { count: 20, points: 200 },
            { count: 50, points: 500 }, { count: 80, points: 800 },
            { count: 100, points: 3000 }, { count: 150, points: 5000 },
            { count: 200, points: 10000 }, { count: 201, points: 20000 }
        ],
        ECON_QUIZ: [
            { count: 1, points: 500 }, { count: 2, points: 1000 },
            { count: 3, points: 1500 }, { count: 4, points: 2000 }
        ]
    };

    // --- 최신 경제 뉴스 기반 퀴즈 데이터 (2026.05.07 업데이트) ---
    const QUIZ_DATA = [
        {
            q: "최근 글로벌 통상 환경 변화로 수출 상품에 부과되는 '이것'이 강화될 우려가 있습니다. 수입품에 부과하는 세금은?",
            options: ["부가가치세", "관세", "소득세", "취득세"],
            answer: 1,
            desc: "관세는 자국 산업 보호를 위해 수입품에 부과하는 세금입니다."
        },
        {
            q: "2025-2026년 한국 경제의 저성장 기조가 우려되고 있습니다. 한 나라 안에서 생산된 최종 생산물의 가치를 합친 지표는?",
            options: ["GNP", "GDP", "KOSPI", "BSI"],
            answer: 1,
            desc: "GDP(국내총생산)는 한 나라의 경제 규모와 성장세를 나타내는 대표 지표입니다."
        },
        {
            q: "최근 AI 열풍과 함께 한국 수출을 견인하고 있는 '산업의 쌀'이라고 불리는 핵심 품목은?",
            options: ["자동차", "조선", "반도체", "철강"],
            answer: 2,
            desc: "반도체는 한국 수출의 가장 큰 비중을 차지하는 핵심 품목입니다."
        },
        {
            q: "물가 안정을 위해 한국은행이 조절하며, 돈을 빌린 대가로 지급하는 비율을 무엇이라고 할까요?",
            options: ["환율", "금리", "주가", "배당금"],
            answer: 1,
            desc: "금리(기준금리)를 조절하여 시중의 통화량과 물가를 관리합니다."
        }
    ];

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
    
    const modalQuiz = document.getElementById('modal-quiz');
    const quizQuestion = document.getElementById('quiz-question');
    const quizOptions = document.getElementById('quiz-options');
    const quizStep = document.getElementById('quiz-step');
    const quizResult = document.getElementById('quiz-result');
    const btnQuizCheck = document.getElementById('btn-quiz-check');
    const btnQuizNext = document.getElementById('btn-quiz-next');

    const modalAdminAuth = document.getElementById('modal-admin-auth');
    const inputAdminPw = document.getElementById('input-admin-pw');

    // 상태 관리
    let currentUser = null;
    let currentQuizIdx = 0;
    let correctAnswersCount = 0;
    let selectedOptionIdx = null;

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
    document.getElementById('btn-phone-login').addEventListener('click', () => { modalPhone.classList.remove('hidden'); inputNickname.focus(); });
    document.getElementById('btn-modal-close').addEventListener('click', () => { modalPhone.classList.add('hidden'); inputNickname.value = ''; inputPhone.value = ''; });

    inputPhone.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 3 && val.length <= 7) val = val.slice(0, 3) + '-' + val.slice(3);
        else if (val.length > 7) val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7);
        e.target.value = val;
    });

    document.getElementById('btn-phone-submit').addEventListener('click', () => {
        const nickVal = inputNickname.value.trim();
        const phoneVal = inputPhone.value.trim();
        if (nickVal.length < 2 || phoneVal.length < 10) { alert('정확한 정보를 입력해 주세요.'); return; }
        loginUser(phoneVal, nickVal);
    });

    async function loginUser(phone, nickname) {
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("phone", "==", phone));
            const querySnapshot = await getDocs(q);

            let foundUser = null;
            if (querySnapshot.empty) {
                // 1. 신규 유저: 최초 1회 정보를 저장(Create)
                const newUser = { 
                    phone, 
                    nickname, 
                    points: 1250, 
                    createdAt: new Date() 
                };
                const docRef = await addDoc(usersRef, newUser);
                foundUser = { id: docRef.id, ...newUser };
                console.log("신규 유저 등록 완료:", phone);
            } else {
                // 2. 기존 유저: 동일 휴대폰 번호가 있으면 저장하지 않고 기존 정보 로드(Read)
                const userDoc = querySnapshot.docs[0];
                foundUser = { id: userDoc.id, ...userDoc.data() };
                console.log("기존 유저 로그인:", foundUser.nickname);
            }
            
            currentUser = { ...foundUser, age: 16 };
            document.getElementById('user-nickname').innerText = `${currentUser.nickname} (#${currentUser.id.substring(0, 6)})`;
            if (modalPhone) modalPhone.classList.add('hidden');
            updateDashboard();
            switchPage('dashboard');
        } catch (error) {
            console.error("로그인 실패:", error);
            alert("서버 연결에 실패했습니다. Firebase Config 설정을 확인해주세요.");
        }
    }

    // --- 음악 플레이어 로직 ---
    const musicPlayToggle = document.getElementById('music-play-toggle');
    let isPlaying = false;
    musicPlayToggle.addEventListener('click', () => {
        isPlaying = !isPlaying;
        musicPlayToggle.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        const visualizer = document.querySelector('.visualizer');
        visualizer.style.opacity = isPlaying ? '1' : '0.3';
    });

    // --- 경제 퀴즈 로직 ---
    document.getElementById('btn-start-quiz').addEventListener('click', () => {
        currentQuizIdx = 0; correctAnswersCount = 0;
        showQuiz(currentQuizIdx);
        modalQuiz.classList.remove('hidden');
    });

    function showQuiz(idx) {
        const data = QUIZ_DATA[idx];
        quizStep.innerText = `문제 ${idx + 1}/${QUIZ_DATA.length}`;
        quizQuestion.innerText = data.q;
        quizOptions.innerHTML = '';
        quizResult.classList.add('hidden');
        btnQuizCheck.classList.remove('hidden');
        btnQuizNext.classList.add('hidden');
        selectedOptionIdx = null;

        data.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = `${i + 1}. ${opt}`;
            btn.onclick = () => {
                document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedOptionIdx = i;
            };
            quizOptions.appendChild(btn);
        });
    }

    btnQuizCheck.onclick = () => {
        if (selectedOptionIdx === null) { alert('정답을 선택해 주세요!'); return; }
        const isCorrect = selectedOptionIdx === QUIZ_DATA[currentQuizIdx].answer;
        quizResult.innerText = isCorrect ? `정답입니다! 👏 ${QUIZ_DATA[currentQuizIdx].desc}` : `오답입니다. 😢 정답은 '${QUIZ_DATA[currentQuizIdx].options[QUIZ_DATA[currentQuizIdx].answer]}'입니다. ${QUIZ_DATA[currentQuizIdx].desc}`;
        quizResult.className = `quiz-result-msg ${isCorrect ? 'correct' : 'wrong'}`;
        quizResult.classList.remove('hidden');
        if (isCorrect) correctAnswersCount++;
        btnQuizCheck.classList.add('hidden');
        btnQuizNext.classList.remove('hidden');
        btnQuizNext.innerText = currentQuizIdx === QUIZ_DATA.length - 1 ? "결과 확인" : "다음 문제";
    };

    btnQuizNext.onclick = async () => {
        if (currentQuizIdx < QUIZ_DATA.length - 1) {
            currentQuizIdx++; showQuiz(currentQuizIdx);
        } else {
            const reward = correctAnswersCount * 500;
            currentUser.points += reward;
            
            try {
                await updateDoc(doc(db, "users", currentUser.id), { points: currentUser.points });
                alert(`퀴즈 완료! ${correctAnswersCount}문제를 맞혀 ${reward}P를 획득했습니다! 🚀`);
                modalQuiz.classList.add('hidden');
                updateDashboard();
            } catch (error) {
                console.error("포인트 업데이트 실패:", error);
                alert("데이터 저장에 실패했습니다.");
            }
        }
    };
    document.getElementById('btn-quiz-close').onclick = () => modalQuiz.classList.add('hidden');

    // --- 운영자 인증 로직 ---
    document.getElementById('go-admin').addEventListener('click', () => { modalAdminAuth.classList.remove('hidden'); inputAdminPw.focus(); });
    document.getElementById('btn-admin-auth-close').addEventListener('click', () => { modalAdminAuth.classList.add('hidden'); inputAdminPw.value = ''; });
    document.getElementById('btn-admin-auth-submit').addEventListener('click', () => {
        if (inputAdminPw.value === '0125') { modalAdminAuth.classList.add('hidden'); inputAdminPw.value = ''; switchPage('admin'); }
        else { alert('비밀번호가 틀렸습니다!'); inputAdminPw.value = ''; inputAdminPw.focus(); }
    });

    document.getElementById('btn-admin-back').addEventListener('click', () => switchPage('dashboard'));

    // --- 자산 정보 안내 ---
    document.getElementById('btn-asset-info').addEventListener('click', () => {
        alert('현재 보유하신 포인트(1P = 1,000원 환산)를 기반으로, 연 5% 복리 수익률을 적용하여 만 20세 성인이 되었을 때의 예상 자산을 계산한 결과입니다. 🚀\n\n꾸준한 미션 수행으로 미래의 나를 위한 마중물을 준비하세요!');
    });

    function updateDashboard() {
        if (!currentUser) return;
        document.getElementById('user-points').innerText = currentUser.points.toLocaleString();
        const futureValue = (currentUser.points * 1000) * Math.pow(1.05, 20 - currentUser.age);
        document.getElementById('future-asset-value').innerText = Math.floor(futureValue).toLocaleString();
        renderMissions();
    }

    async function renderMissions() {
        const container = document.getElementById('mission-container');
        container.innerHTML = '<p style="text-align:center; color:var(--text-gray);">미션 불러오는 중...</p>';
        
        try {
            const querySnapshot = await getDocs(collection(db, "missions"));
            // 사용자의 참여 미션 정보 가져오기 (없으면 빈 객체)
            const userMissions = currentUser.participatingMissions || {};
            
            container.innerHTML = '';
            querySnapshot.forEach((docSnap) => {
                const m = docSnap.data();
                const mId = docSnap.id;
                const isParticipating = !!userMissions[mId];
                const currentProgress = isParticipating ? userMissions[mId].progress : 0;

                const card = document.createElement('div');
                card.className = `mission-card ${isParticipating ? 'active' : ''}`;
                card.innerHTML = `
                    <div class="mission-top">
                        <span class="mission-tag">${m.tag}</span>
                        <span class="mission-period">${m.start} ~ ${m.end}</span>
                    </div>
                    <div class="mission-title">${m.title}</div>
                    <div class="progress-container">
                        <div class="progress-fill" style="width: ${isParticipating ? currentProgress : m.progress}%"></div>
                    </div>
                    <div class="mission-footer">
                        <span>${isParticipating ? '나의 성공률 ' + currentProgress + '%' : '예상 성공률 ' + m.progress + '%'}</span>
                        <span class="reward-points">+${m.reward.toLocaleString()}P 예정</span>
                    </div>
                    <div class="mission-action">
                        ${isParticipating 
                            ? `<button class="btn-mission-status" disabled>진행 중 🔥</button>`
                            : `<button class="btn-mission-join" data-id="${mId}">참여하기</button>`
                        }
                    </div>
                `;
                container.appendChild(card);
            });

            // 참여하기 버튼 이벤트 바인딩
            document.querySelectorAll('.btn-mission-join').forEach(btn => {
                btn.onclick = async (e) => {
                    const mId = e.target.getAttribute('data-id');
                    await joinMission(mId);
                };
            });

        } catch (error) {
            console.error("미션 로드 실패:", error);
            container.innerHTML = '<p style="text-align:center; color:#ff4d4d;">미션을 불러오지 못했습니다.</p>';
        }
    }

    async function joinMission(missionId) {
        if (!currentUser) return;
        
        try {
            // participatingMissions 객체에 미션 ID 추가
            const updatedParticipating = {
                ...(currentUser.participatingMissions || {}),
                [missionId]: { progress: 10, joinedAt: new Date() } // 시작 시 10% 기본 부여
            };

            await updateDoc(doc(db, "users", currentUser.id), {
                participatingMissions: updatedParticipating
            });

            currentUser.participatingMissions = updatedParticipating;
            alert('챌린지에 참여했습니다! 성장을 시작해볼까요? 🚀');
            renderMissions();
        } catch (error) {
            console.error("미션 참여 실패:", error);
            alert("미션 참여에 실패했습니다.");
        }
    }

    // --- 미션 등록 (운영자) ---
    const missionForm = document.getElementById('mission-form');
    missionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const typeSelect = document.getElementById('mission-type');
        const titleInput = document.getElementById('mission-title');
        const rewardInput = document.getElementById('mission-reward');

        if (!titleInput.value.trim() || !rewardInput.value) {
            alert('정보를 모두 입력해주세요!');
            return;
        }

        const newMission = {
            tag: typeSelect.options[typeSelect.selectedIndex].text.split(' ')[0],
            title: titleInput.value.trim(),
            start: new Date().toLocaleDateString(),
            end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            progress: 0,
            reward: parseInt(rewardInput.value),
            createdAt: new Date()
        };

        try {
            await addDoc(collection(db, "missions"), newMission);
            alert('새로운 챌린지가 Firebase에 등록되었습니다! 🔥');
            missionForm.reset();
            switchPage('dashboard');
            updateDashboard();
        } catch (error) {
            console.error("미션 등록 실패:", error);
            alert("미션 등록에 실패했습니다.");
        }
    });

    const logoutBtn = document.createElement('button');
    logoutBtn.innerText = '로그아웃';
    logoutBtn.style.cssText = 'margin-top: 20px; background: #333; color: #fff; border: none; padding: 15px; border-radius: 12px; width: 100%; cursor: pointer; font-weight: 700;';
    logoutBtn.onclick = () => { currentUser = null; switchPage('intro'); };
    pages.dashboard.appendChild(logoutBtn);
});
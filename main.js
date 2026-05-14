// --- Firebase SDK 및 초기화 ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyB-VooJveCkmf8pe_tBj64rgFD_K9MzfRU",
    authDomain: "jin-growth.firebaseapp.com",
    projectId: "jin-growth",
    storageBucket: "jin-growth.firebasestorage.app",
    messagingSenderId: "27010798564",
    appId: "1:27010798564:web:7a3d6cb7729c3237372df1",
    measurementId: "G-1NDJ1FP1QC"
};

// 전역 변수 설정
let db;
let app;
let currentUser = null;
let QUIZ_DATA = []; // Firestore에서 로드할 예정
let MISSION_STANDARDS = {}; // Firestore에서 로드할 예정

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

// --- 기준정보 초기화 (최초 1회 실행용) ---
async function initializeReferenceData() {
    try {
        console.log("Initializing reference data to Firestore...");
        
        // 1. 미션 기준정보 (Standard Rewards)
        const standards = {
            "quiz": { title: "행운자산화 퀴즈 챌린지", maxReward: 2000, perQuestion: 500, tag: "퀴즈" },
            "study": { title: "공부/독서 타이머 챌린지", reward: 1000, tag: "공부" },
            "family": { title: "효도활동 자산화 챌린지", reward: 1500, tag: "효도" }
        };

        for (const [key, value] of Object.entries(standards)) {
            await setDoc(doc(db, "mission_standards", key), value);
        }

        // 2. 퀴즈 데이터
        const quizzes = [
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

        const quizSnap = await getDocs(collection(db, "quizzes"));
        if (quizSnap.empty) {
            for (const q of quizzes) {
                await addDoc(collection(db, "quizzes"), q);
            }
        }
        console.log("Reference data initialization complete.");
        return true;
    } catch (error) {
        console.error("Initialization error:", error);
        return false;
    }
}

// --- 데이터 로드 함수 ---
async function loadReferenceData() {
    try {
        const standardsSnap = await getDocs(collection(db, "mission_standards"));
        if (standardsSnap.empty) {
            // 데이터가 없으면 초기화 실행
            await initializeReferenceData();
            return loadReferenceData(); // 재귀 호출로 로드
        }

        standardsSnap.forEach(doc => {
            MISSION_STANDARDS[doc.id] = doc.data();
        });

        const quizSnap = await getDocs(collection(db, "quizzes"));
        QUIZ_DATA = quizSnap.docs.map(doc => doc.data());
        
        console.log("Reference data loaded:", { MISSION_STANDARDS, quizCount: QUIZ_DATA.length });
    } catch (error) {
        console.error("Data load error:", error);
    }
}

// UI 요소 선언
const getEl = (id) => document.getElementById(id);

// --- 핵심 비즈니스 로직 ---

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const target = getEl(`page-${pageId}`);
    if (target) target.classList.remove('hidden');
}

async function updateDashboard() {
    if (!currentUser) return;
    getEl('user-points').innerText = (currentUser.points || 0).toLocaleString();
    const futureValue = (currentUser.points * 1000) * Math.pow(1.05, 20 - (currentUser.age || 16));
    getEl('future-asset-value').innerText = Math.floor(futureValue).toLocaleString();
    await renderMissions();
}

async function renderMissions() {
    const container = getEl('mission-container');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align:center; color:var(--text-gray);">미션 불러오는 중...</p>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "missions"));
        const userMissions = currentUser.participatingMissions || {};
        
        container.innerHTML = '';
        if (querySnapshot.empty) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-gray);">등록된 미션이 없습니다.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const m = docSnap.data();
            const mId = docSnap.id;
            const isParticipating = !!userMissions[mId];
            const currentProgress = isParticipating ? userMissions[mId].progress : 0;

            const card = document.createElement('div');
            card.className = `mission-card ${isParticipating ? 'active' : ''}`;
            card.innerHTML = `
                <div class="mission-top">
                    <span class="mission-tag">${m.tag || '챌린지'}</span>
                    <span class="mission-period">${m.start || ''} ~ ${m.end || ''}</span>
                </div>
                <div class="mission-title">${m.title || '제목 없음'}</div>
                <div class="progress-container">
                    <div class="progress-fill" style="width: ${isParticipating ? currentProgress : (m.progress || 0)}%"></div>
                </div>
                <div class="mission-footer">
                    <span>${isParticipating ? '나의 성공률 ' + currentProgress + '%' : '예상 성공률 ' + (m.progress || 0) + '%'}</span>
                    <span class="reward-points">+${(m.reward || 0).toLocaleString()}P 예정</span>
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

        document.querySelectorAll('.btn-mission-join').forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.target.getAttribute('data-id');
                await joinMission(id);
            };
        });
    } catch (error) {
        console.error("Missions load error:", error);
        container.innerHTML = '<p style="text-align:center; color:#ff4d4d;">데이터 로드 실패 (Firestore 설정을 확인하세요)</p>';
    }
}

async function joinMission(missionId) {
    if (!currentUser || !db) return;
    try {
        const updatedParticipating = {
            ...(currentUser.participatingMissions || {}),
            [missionId]: { progress: 10, joinedAt: new Date() }
        };
        await updateDoc(doc(db, "users", currentUser.id), {
            participatingMissions: updatedParticipating
        });
        currentUser.participatingMissions = updatedParticipating;
        alert('챌린지에 참여했습니다! 성장을 시작해볼까요? 🚀');
        await renderMissions();
    } catch (error) {
        console.error("Join mission error:", error);
        alert("미션 참여에 실패했습니다.");
    }
}

async function loginUser(phone, nickname) {
    if (!db) {
        alert("데이터베이스 초기화 중입니다. 잠시 후 다시 시도하세요.");
        return;
    }

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("phone", "==", phone));
        const querySnapshot = await getDocs(q);

        let foundUser = null;
        if (querySnapshot.empty) {
            const newUser = { 
                phone, 
                nickname, 
                points: 1250, 
                createdAt: new Date(),
                participatingMissions: {}
            };
            const docRef = await addDoc(usersRef, newUser);
            foundUser = { id: docRef.id, ...newUser };
        } else {
            const userDoc = querySnapshot.docs[0];
            foundUser = { id: userDoc.id, ...userDoc.data() };
        }
        
        currentUser = { ...foundUser, age: 16 };
        getEl('user-nickname').innerText = `${currentUser.nickname} (#${currentUser.id.substring(0, 6)})`;
        getEl('modal-phone').classList.add('hidden');
        
        await updateDashboard();
        switchPage('dashboard');
    } catch (error) {
        console.error("Login Error:", error);
        alert(`로그인 오류: ${error.message}`);
    }
}

// --- 이벤트 리스너 설정 ---
async function init() {
    console.log("Initializing app...");
    
    // 기준정보 로드
    await loadReferenceData();

    // 인트로 페이지 버튼
    const btnPhoneLogin = getEl('btn-phone-login');
    if (btnPhoneLogin) {
        btnPhoneLogin.onclick = () => {
            getEl('modal-phone').classList.remove('hidden');
            getEl('input-nickname').focus();
        };
    }

    getEl('btn-modal-close').onclick = () => getEl('modal-phone').classList.add('hidden');

    getEl('btn-phone-submit').onclick = async () => {
        const nickVal = getEl('input-nickname').value.trim();
        const phoneVal = getEl('input-phone').value.trim();
        if (nickVal.length < 2 || phoneVal.length < 10) {
            alert('정확한 정보를 입력해 주세요.');
            return;
        }
        await loginUser(phoneVal, nickVal);
    };

    const inputPhone = getEl('input-phone');
    const inputNickname = getEl('input-nickname');
    if (inputPhone) {
        inputPhone.oninput = (e) => {
            // 번호가 변경되면 닉네임 필드 초기화
            if (inputNickname) {
                inputNickname.value = "";
                inputNickname.style.borderColor = "var(--border-color)";
            }

            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val.length > 3 && val.length <= 7) val = val.slice(0, 3) + '-' + val.slice(3);
            else if (val.length > 7) val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7);
            e.target.value = val;
        };
    }

    const musicPlayToggle = getEl('music-play-toggle');
    if (musicPlayToggle) {
        let isPlaying = false;
        musicPlayToggle.onclick = () => {
            isPlaying = !isPlaying;
            musicPlayToggle.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
            const visualizer = document.querySelector('.visualizer');
            if (visualizer) visualizer.style.opacity = isPlaying ? '1' : '0.3';
        };
    }

    getEl('btn-start-quiz').onclick = () => {
        if (QUIZ_DATA.length === 0) {
            alert("퀴즈 데이터를 불러오는 중입니다. 잠시만 기다려주세요.");
            return;
        }
        currentQuizIdx = 0;
        correctAnswersCount = 0;
        showQuiz(0);
        getEl('modal-quiz').classList.remove('hidden');
    };

    getEl('go-admin').onclick = () => {
        getEl('modal-admin-auth').classList.remove('hidden');
        getEl('input-admin-pw').focus();
    };

    getEl('btn-admin-auth-submit').onclick = () => {
        if (getEl('input-admin-pw').value === '0125') {
            getEl('modal-admin-auth').classList.add('hidden');
            getEl('input-admin-pw').value = '';
            switchPage('admin');
        } else {
            alert('비밀번호가 틀렸습니다!');
            getEl('input-admin-pw').value = '';
        }
    };

    getEl('btn-admin-back').onclick = () => switchPage('dashboard');
    getEl('btn-asset-info').onclick = () => alert('현재 보유하신 포인트(1P = 1,000원 환산)를 기반으로, 연 5% 복리 수익률을 적용하여 만 20세 성인이 되었을 때의 예상 자산을 계산한 결과입니다. 🚀');

    const logoutBtn = document.createElement('button');
    logoutBtn.innerText = '로그아웃';
    logoutBtn.style.cssText = 'margin-top: 20px; background: #333; color: #fff; border: none; padding: 15px; border-radius: 12px; width: 100%; cursor: pointer; font-weight: 700;';
    logoutBtn.onclick = () => { 
        currentUser = null; 
        // 로그아웃 시 입력 필드 초기화
        if (getEl('input-phone')) getEl('input-phone').value = "";
        if (getEl('input-nickname')) {
            getEl('input-nickname').value = "";
            getEl('input-nickname').style.borderColor = "var(--border-color)";
        }
        switchPage('intro'); 
    };
    getEl('page-dashboard').appendChild(logoutBtn);

    const missionForm = getEl('mission-form');
    if (missionForm) {
        missionForm.onsubmit = async (e) => {
            e.preventDefault();
            const typeSelect = getEl('mission-type');
            const titleInput = getEl('mission-title');
            const rewardInput = getEl('mission-reward');

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
                alert('새로운 챌린지가 등록되었습니다! 🔥');
                missionForm.reset();
                switchPage('dashboard');
                await updateDashboard();
            } catch (error) {
                console.error("Mission reg error:", error);
                alert("등록 실패");
            }
        };
    }
}

// 퀴즈 관련 함수들
let currentQuizIdx = 0;
let correctAnswersCount = 0;
let selectedOptionIdx = null;

function showQuiz(idx) {
    const data = QUIZ_DATA[idx];
    getEl('quiz-step').innerText = `문제 ${idx + 1}/${QUIZ_DATA.length}`;
    getEl('quiz-question').innerText = data.q;
    const optionsContainer = getEl('quiz-options');
    optionsContainer.innerHTML = '';
    getEl('quiz-result').classList.add('hidden');
    getEl('btn-quiz-check').classList.remove('hidden');
    getEl('btn-quiz-next').classList.add('hidden');
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
        optionsContainer.appendChild(btn);
    });
}

getEl('btn-quiz-check').onclick = () => {
    if (selectedOptionIdx === null) { alert('정답을 선택해 주세요!'); return; }
    const isCorrect = selectedOptionIdx === QUIZ_DATA[currentQuizIdx].answer;
    const resultEl = getEl('quiz-result');
    resultEl.innerText = isCorrect ? `정답입니다! 👏 ${QUIZ_DATA[currentQuizIdx].desc}` : `오답입니다. 😢 정답은 '${QUIZ_DATA[currentQuizIdx].options[QUIZ_DATA[currentQuizIdx].answer]}'입니다.`;
    resultEl.className = `quiz-result-msg ${isCorrect ? 'correct' : 'wrong'}`;
    resultEl.classList.remove('hidden');
    if (isCorrect) correctAnswersCount++;
    getEl('btn-quiz-check').classList.add('hidden');
    getEl('btn-quiz-next').classList.remove('hidden');
    getEl('btn-quiz-next').innerText = currentQuizIdx === QUIZ_DATA.length - 1 ? "결과 확인" : "다음 문제";
};

getEl('btn-quiz-next').onclick = async () => {
    if (currentQuizIdx < QUIZ_DATA.length - 1) {
        currentQuizIdx++;
        showQuiz(currentQuizIdx);
    } else {
        const perQuestion = MISSION_STANDARDS.quiz ? MISSION_STANDARDS.quiz.perQuestion : 500;
        const reward = correctAnswersCount * perQuestion;
        currentUser.points += reward;
        try {
            await updateDoc(doc(db, "users", currentUser.id), { points: currentUser.points });
            alert(`퀴즈 완료! ${correctAnswersCount}문제를 맞혀 ${reward}P를 획득했습니다! 🚀`);
            getEl('modal-quiz').classList.add('hidden');
            await updateDashboard();
        } catch (error) {
            alert("데이터 저장 실패");
        }
    }
};

getEl('btn-quiz-close').onclick = () => getEl('modal-quiz').classList.add('hidden');
getEl('btn-admin-auth-close').onclick = () => getEl('modal-admin-auth').classList.add('hidden');

// 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
// --- Firebase SDK 및 초기화 ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-storage.js";

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
let storage;
let app;
let currentUser = null;
let QUIZ_DATA = []; // Firestore에서 로드할 예정
let MISSION_STANDARDS = {}; // Firestore에서 로드할 예정

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
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

// --- 미래가치 계산 함수 ---
function calculateFutureAsset(birthYear, currentPoints, baseAnnualRate = 0.05, streakBonusRate = 0.0) {
  const today = new Date();
  const birthDate = new Date(birthYear, 0, 1);
  
  const targetDate = new Date(birthDate);
  targetDate.setFullYear(targetDate.getFullYear() + 19); // 한국 나이 대략 스무살(만 19세)

  if (today >= targetDate) {
    return {
      remainingMonths: 0,
      futureValue: currentPoints,
      totalInterestRate: baseAnnualRate + streakBonusRate
    };
  }

  let remainingMonths = (targetDate.getFullYear() - today.getFullYear()) * 12;
  remainingMonths -= today.getMonth();
  remainingMonths += targetDate.getMonth();
  if (remainingMonths < 0) remainingMonths = 0;

  const totalAnnualRate = baseAnnualRate + streakBonusRate;
  const monthlyRate = totalAnnualRate / 12;
  
  const futureValue = currentPoints * Math.pow((1 + monthlyRate), remainingMonths);

  return {
    remainingMonths: remainingMonths,
    futureValue: Math.floor(futureValue),
    totalInterestRate: totalAnnualRate
  };
}

// --- 핵심 비즈니스 로직 ---

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const target = getEl(`page-${pageId}`);
    if (target) target.classList.remove('hidden');

    // 네비게이션 아이템 활성화 상태 업데이트
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = getEl(`nav-${pageId === 'dashboard' ? 'home' : pageId}`);
    if (activeNav) activeNav.classList.add('active');
}

async function updateDashboard() {
    if (!currentUser) return;
    const points = currentUser.points || 0;
    getEl('user-points').innerText = points.toLocaleString();
    if (getEl('prof-points')) getEl('prof-points').innerText = points.toLocaleString();
    if (getEl('reward-user-points')) getEl('reward-user-points').innerText = points.toLocaleString();
    
    // 월복리 미래가치 산출 로직 적용 (스트릭 보너스 2% 가산 가정)
    const userBirthYear = currentUser.birthYear || (new Date().getFullYear() - 17); // 기본값 고2(2009년생)
    const futureAsset = calculateFutureAsset(userBirthYear, points, 0.05, 0.02);
    
    getEl('future-asset-value').innerText = futureAsset.futureValue.toLocaleString();
    
    const adultYear = userBirthYear + 19;
    const assetDesc = document.querySelector('.asset-desc');
    if (assetDesc) {
        assetDesc.innerText = `${adultYear}년 스무 살이 되었을 때 예상액 (연 ${Math.floor(futureAsset.totalInterestRate * 100)}% 월복리)`;
    }
    
    await renderMissions();
}

// --- 프로필 모달 업데이트 ---
function openProfileModal() {
    if (!currentUser) return;
    getEl('prof-nickname').innerText = currentUser.nickname;
    getEl('prof-phone').innerText = currentUser.phone;
    getEl('prof-birth').innerText = `${currentUser.birthYear}년생`;
    getEl('prof-points').innerText = (currentUser.points || 0).toLocaleString();
    getEl('modal-profile').classList.remove('hidden');
}

// --- 보상 교환 로직 ---
async function redeemReward(rewardId, price, name) {
    if (!currentUser) return;
    if (currentUser.points < price) {
        alert("자산(포인트)이 부족합니다! 미션을 더 수행해 보세요. 💪");
        return;
    }
    
    if (confirm(`'${name}' 상품을 ${price.toLocaleString()}P로 교환하시겠습니까?`)) {
        try {
            currentUser.points -= price;
            await updateDoc(doc(db, "users", currentUser.id), {
                points: currentUser.points
            });
            alert(`교환 성공! '${name}' 쿠폰이 발급되었습니다. 🎁\n남은 자산: ${currentUser.points.toLocaleString()}P`);
            await updateDashboard();
        } catch (error) {
            console.error("Redeem error:", error);
            alert("교환 처리 중 오류가 발생했습니다.");
        }
    }
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
            
            // 대시보드에서는 참여 중인 미션만 표시
            if (!isParticipating) return;

            const missionData = userMissions[mId];
            const currentProgress = missionData.progress || 0;
            const isFamilyMission = m.tag && m.tag.includes('효도');
            const isStudyMission = m.tag && m.tag.includes('공부');

            let isCompleted = currentProgress >= 100;

            // 공부 미션 일일 초기화 로직
            if (isStudyMission && isCompleted && missionData.completedAt) {
                const completedDate = missionData.completedAt.toDate ? missionData.completedAt.toDate() : new Date(missionData.completedAt);
                const today = new Date();
                const isSameDay = completedDate.getDate() === today.getDate() &&
                                 completedDate.getMonth() === today.getMonth() &&
                                 completedDate.getFullYear() === today.getFullYear();
                
                if (!isSameDay) {
                    isCompleted = false; // 하루가 지났으면 다시 도전 가능
                }
            }

            const card = document.createElement('div');
            card.className = `mission-card ${isCompleted ? 'completed' : 'active'}`;
            card.innerHTML = `
                <div class="mission-top">
                    <span class="mission-tag">${m.tag || '챌린지'}</span>
                    <span class="mission-period">${m.start || ''} ~ ${m.end || ''}</span>
                </div>
                <div class="mission-title">${m.title || '제목 없음'}</div>
                <div class="progress-container">
                    <div class="progress-fill" style="width: ${isCompleted ? 100 : (isStudyMission ? 0 : currentProgress)}%"></div>
                </div>
                <div class="mission-footer">
                    <span>${isCompleted ? '오늘 달성 완료! 🎉' : (isStudyMission ? '오늘의 집중을 시작하세요!' : '나의 성공률 ' + currentProgress + '%')}</span>
                    <span class="reward-points">${isFamilyMission ? '사진 1장당 ' + (m.reward || 500).toLocaleString() + '원' : '+' + (m.reward || 0).toLocaleString() + '원 예정'}</span>
                </div>
                <div class="mission-action">
                    ${isCompleted 
                        ? `<button class="btn-mission-done" disabled><i class="fas fa-check-circle"></i> 미션 완료</button>`
                        : isStudyMission
                            ? `<button class="btn-mission-join-study" data-id="${mId}">타이머 시작하기 🔥</button>`
                            : isFamilyMission 
                                ? `
                                    <div class="upload-area">
                                        <input type="file" id="file-${mId}" class="input-file-hidden" accept="image/*">
                                        <label for="file-${mId}" class="btn-upload-label" id="label-${mId}">
                                            <i class="fas fa-camera"></i> 사진 인증하고 포인트 받기
                                        </label>
                                    </div>
                                `
                                : `<button class="btn-mission-status" disabled>진행 중 🔥</button>`
                    }
                </div>
            `;
            container.appendChild(card);

            // 이벤트 바인딩
            if (!isCompleted && isStudyMission) {
                card.querySelector('.btn-mission-join-study').onclick = () => {
                    startStudyTimer(mId, m.title);
                };
            }

            // 효도 미션 이벤트 바인딩 (업로드 즉시 포인트 지급)
            if (isFamilyMission) {
                const fileInput = getEl(`file-${mId}`);
                const label = getEl(`label-${mId}`);

                if (fileInput) {
                    fileInput.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        label.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 업로드 중...`;
                        label.style.pointerEvents = 'none';

                        try {
                            const storageRef = ref(storage, `missions/${currentUser.id}/${mId}_${Date.now()}`);
                            await uploadBytes(storageRef, file);
                            const downloadURL = await getDownloadURL(storageRef);
                            
                            label.innerHTML = `<i class="fas fa-check"></i> 인증 완료 (+${(m.reward || 500).toLocaleString()}원)`;
                            label.classList.add('success');
                            
                            // 업로드 즉시 포인트 지급
                            await addPoints(m.reward || 500, `${m.title}`);
                            
                            setTimeout(() => {
                                label.innerHTML = `<i class="fas fa-camera"></i> 추가 사진 인증하기`;
                                label.classList.remove('success');
                                label.style.pointerEvents = 'auto';
                            }, 3000);

                        } catch (error) {
                            console.error("Upload error:", error);
                            alert("사진 업로드에 실패했습니다.");
                            label.innerHTML = `<i class="fas fa-camera"></i> 다시 시도`;
                            label.style.pointerEvents = 'auto';
                        }
                    };
                }
            }
        });

        if (container.innerHTML === '') {
            container.innerHTML = '<p style="text-align:center; color:var(--text-gray);">진행 중인 미션이 없습니다.<br>상단의 "미션 가져오기"를 클릭해 보세요!</p>';
        }
    } catch (error) {
        console.error("Missions load error:", error);
        container.innerHTML = '<p style="text-align:center; color:#ff4d4d;">데이터 로드 실패 (Firestore 설정을 확인하세요)</p>';
    }
}

// --- 공부 타이머 전용 로직 ---
let studyInterval = null;
let studyStartTime = null;
let activeMissionId = null;

function startStudyTimer(missionId, title) {
    activeMissionId = missionId;
    studyStartTime = new Date();
    getEl('modal-study-timer').classList.remove('hidden');
    getEl('timer-display').innerText = "00:00:00";
    getEl('timer-status-msg').classList.remove('hidden');
    
    studyInterval = setInterval(updateTimerUI, 1000);
}

function updateTimerUI() {
    if (!studyStartTime) return;
    const now = new Date();
    const diff = Math.floor((now - studyStartTime) / 1000);
    const h = String(Math.floor(diff / 3600)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    getEl('timer-display').innerText = `${h}:${m}:${s}`;
}

getEl('btn-timer-stop').onclick = async () => {
    if (!studyInterval) return;
    
    const now = new Date();
    const durationMinutes = Math.floor((now - studyStartTime) / (1000 * 60));
    const earnedPoints = durationMinutes * 100; // 1분당 100P (예시)

    clearInterval(studyInterval);
    studyInterval = null;
    getEl('modal-study-timer').classList.add('hidden');

    if (durationMinutes < 1) {
        alert("최소 1분 이상 집중해야 포인트가 적립됩니다! 조금 더 힘내봐요! 💪\n잠깐! 여기서 포기하면 스무 살에 받을 이자가 공중분해돼요. 💸");
    } else {
        await finishMission(activeMissionId, earnedPoints);
    }
    
    activeMissionId = null;
    studyStartTime = null;
};

// 휴대폰 사용 감지 (App Background/Foreground 감지)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && studyInterval) {
        // 백그라운드에 있다가 다시 앱으로 돌아왔을 때 (잠금 해제 포함)
        alert("잠깐! 여기서 포기하면 스무 살에 받을 소중한 자산이 공중분해돼요. 💸\n휴대폰을 뒤집고 조금만 더 집중해 볼까요?");
    }
});

async function finishMission(missionId, reward) {
    if (!currentUser || !db) return;
    try {
        const updatedParticipating = {
            ...(currentUser.participatingMissions || {}),
            [missionId]: { ...currentUser.participatingMissions[missionId], progress: 100, completedAt: new Date() }
        };
        
        currentUser.points += reward;
        
        await updateDoc(doc(db, "users", currentUser.id), {
            participatingMissions: updatedParticipating,
            points: currentUser.points
        });
        
        currentUser.participatingMissions = updatedParticipating;
        
        const futureAsset = calculateFutureAsset(currentUser.birthYear || 2009, reward, 0.05, 0.02);
        alert(`축하합니다! 미션을 완료하여 ${reward.toLocaleString()}원을 획득했습니다! 🎉\n복리의 마법으로 스무 살에는 ${futureAsset.futureValue.toLocaleString()}원이 될 거예요! 🚀`);
        
        await updateDashboard();
    } catch (error) {
        console.error("Finish mission error:", error);
        alert("미션 완료 처리에 실패했습니다.");
    }
}

async function addPoints(amount, reason) {
    if (!currentUser || !db) return;
    try {
        currentUser.points += amount;
        await updateDoc(doc(db, "users", currentUser.id), {
            points: currentUser.points
        });
        
        const futureAsset = calculateFutureAsset(currentUser.birthYear || 2009, amount, 0.05, 0.02);
        alert(`오늘의 ${reason} 미션으로 번 ${amount.toLocaleString()}원 🍽️\n스무 살의 시드머니가 ${futureAsset.futureValue.toLocaleString()}원으로 점프했어요! 🚀 (연속 달성 우대금리 2% 팡팡!)`);
        
        await updateDashboard();
    } catch (error) {
        console.error("Add points error:", error);
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
        alert("시간은 금이다? 아니, 시간은 '복리'다! ⏰\n챌린지에 참여했습니다! 성장을 시작해볼까요? 🚀");
        await renderMissions();
    } catch (error) {
        console.error("Join mission error:", error);
        alert("미션 참여에 실패했습니다.");
    }
}

async function loginUser(phone, nickname, birthYear) {
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
                birthYear: parseInt(birthYear),
                points: 1250, 
                createdAt: new Date(),
                participatingMissions: {}
            };
            const docRef = await addDoc(usersRef, newUser);
            foundUser = { id: docRef.id, ...newUser };
        } else {
            const userDoc = querySnapshot.docs[0];
            const existingData = userDoc.data();
            // birthYear가 없는 기존 사용자의 경우 업데이트
            if (!existingData.birthYear) {
                await updateDoc(userDoc.ref, { birthYear: parseInt(birthYear) });
            }
            foundUser = { id: userDoc.id, ...existingData, birthYear: existingData.birthYear || parseInt(birthYear) };
        }
        
        currentUser = foundUser;
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
    const btnKakaoLogin = getEl('btn-kakao-login');
    if (btnKakaoLogin) {
        btnKakaoLogin.onclick = async () => {
            // PRD: 카카오계정으로 자동 로그인 구성
            // 실제 구현 시에는 Kakao SDK 연동이 필요하지만, 여기서는 시연용으로 자동 로그인을 모킹합니다.
            console.log("Kakao auto-login triggered");
            
            // 기존 등록된 사용자가 있으면 해당 정보로, 없으면 기본 정보로 로그인
            const mockPhone = "010-1234-5678";
            const mockNickname = "힙한지니";
            const mockBirth = "2009";

            await loginUser(mockPhone, mockNickname, mockBirth);
        };
    }

    const btnPhoneLogin = getEl('btn-phone-login');
    if (btnPhoneLogin) {
        btnPhoneLogin.onclick = () => {
            getEl('modal-phone').classList.remove('hidden');
            // 렌더링 및 브라우저 기본 동작을 고려하여 포커스 강제 전환
            setTimeout(() => {
                const phoneInput = getEl('input-phone');
                const nickInput = getEl('input-nickname');
                
                // 닉네임 칸의 포커스를 확실히 해제
                if (nickInput) nickInput.blur();
                
                if (phoneInput) {
                    phoneInput.focus();
                    // 커서를 마지막으로 이동
                    const len = phoneInput.value.length;
                    phoneInput.setSelectionRange(len, len);
                }
            }, 100);
        };
    }

    getEl('btn-modal-close').onclick = () => getEl('modal-phone').classList.add('hidden');

    getEl('btn-phone-submit').onclick = async () => {
        const nickVal = getEl('input-nickname').value.trim();
        const phoneVal = getEl('input-phone').value.trim();
        const birthYearVal = getEl('input-birth-year').value.trim();

        if (nickVal.length < 2 || phoneVal.length < 10 || !birthYearVal) {
            alert('정확한 정보를 입력해 주세요.');
            return;
        }
        await loginUser(phoneVal, nickVal, birthYearVal);
    };

    // 네비게이션 이벤트
    getEl('nav-home').onclick = () => switchPage('dashboard');
    getEl('nav-challenge').onclick = () => switchPage('dashboard'); // 챌린지는 대시보드와 동일
    getEl('nav-reward').onclick = () => {
        switchPage('reward');
        if (currentUser) {
            getEl('reward-user-points').innerText = (currentUser.points || 0).toLocaleString();
        }
    };
    getEl('nav-profile').onclick = () => openProfileModal();

    getEl('btn-profile-close').onclick = () => getEl('modal-profile').classList.add('hidden');

    // 보상 교환 버튼들
    document.querySelectorAll('.btn-redeem').forEach(btn => {
        btn.onclick = async () => {
            const rid = btn.getAttribute('data-id');
            const price = parseInt(btn.getAttribute('data-price'));
            const name = btn.getAttribute('data-name');
            await redeemReward(rid, price, name);
        };
    });

    const inputPhone = getEl('input-phone');
    const inputNickname = getEl('input-nickname');
    const inputBirthYear = getEl('input-birth-year');
    if (inputPhone) {
        inputPhone.oninput = async (e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val.length > 3 && val.length <= 7) val = val.slice(0, 3) + '-' + val.slice(3);
            else if (val.length > 7) val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7);
            e.target.value = val;

            // 번호 입력이 완료되면(13자) 기존 사용자 확인
            if (val.length === 13) {
                try {
                    const usersRef = collection(db, "users");
                    const q = query(usersRef, where("phone", "==", val));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const userData = querySnapshot.docs[0].data();
                        if (inputNickname) {
                            inputNickname.value = userData.nickname;
                            inputNickname.style.borderColor = "var(--neon-green)";
                        }
                        if (inputBirthYear && userData.birthYear) {
                            inputBirthYear.value = userData.birthYear;
                            inputBirthYear.style.borderColor = "var(--neon-green)";
                        }
                        // 사용자에게 알림 효과 (선택사항)
                        console.log("기존 사용자 확인:", userData.nickname);
                    } else {
                        // 신규 사용자인 경우 필드 초기화 및 강조 해제
                        if (inputNickname) {
                            inputNickname.value = "";
                            inputNickname.style.borderColor = "";
                        }
                        if (inputBirthYear) {
                            inputBirthYear.value = "";
                            inputBirthYear.style.borderColor = "";
                        }
                    }
                } catch (error) {
                    console.error("User check error:", error);
                }
            }
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
        if (!currentUser) return;
        
        // 오늘 이미 퀴즈를 풀었는지 확인
        const today = new Date().toLocaleDateString();
        if (currentUser.lastQuizDate === today) {
            alert("오늘의 퀴즈 기회를 이미 사용하셨습니다! 내일 다시 도전해 주세요. 💡");
            return;
        }

        if (QUIZ_DATA.length === 0) {
            alert("퀴즈 데이터를 불러오는 중입니다. 잠시만 기다려주세요.");
            return;
        }
        currentQuizIdx = 0;
        correctAnswersCount = 0;
        showQuiz(0);
        getEl('modal-quiz').classList.remove('hidden');
    };

    // 미션 가져오기 버튼
    const btnGetMission = getEl('btn-get-mission');
    if (btnGetMission) {
        btnGetMission.onclick = async () => {
            console.log("미션 가져오기 버튼 클릭됨");
            if (!currentUser) {
                alert("로그인이 필요합니다.");
                return;
            }
            await renderMissionPool();
            getEl('modal-mission-pool').classList.remove('hidden');
        };
    }

    getEl('btn-pool-close').onclick = () => getEl('modal-mission-pool').classList.add('hidden');

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
    getEl('btn-asset-info').onclick = () => alert('현재 보유하신 자산(1P = 1원)을 기반으로, 한화생명의 연 5% 복리 수익률을 적용하여 성인이 되었을 때의 가치를 계산했습니다. 이 자산은 향후 한화생명 보험료 납입으로도 활용하실 수 있습니다! 🧡');
    getEl('btn-hanwha-link').onclick = () => window.open('https://www.hanwhalife.com', '_blank');

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

// 미션 풀(Pool) 렌더링
async function renderMissionPool() {
    const container = getEl('mission-pool-container');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; color:var(--text-gray);">미션 탐색 중...</p>';

    try {
        const querySnapshot = await getDocs(collection(db, "missions"));
        const userMissions = currentUser.participatingMissions || {};
        
        container.innerHTML = '';
        let hasAvailable = false;

        querySnapshot.forEach((docSnap) => {
            const m = docSnap.data();
            const mId = docSnap.id;
            
            // 이미 참여 중인 미션은 제외
            if (userMissions[mId]) return;

            hasAvailable = true;
            const item = document.createElement('div');
            item.className = 'pool-item';
            const rewardText = m.reward ? m.reward.toLocaleString() : '0';
            item.innerHTML = `
                <div class="pool-item-info">
                    <h5>${m.title || '제목 없음'}</h5>
                    <p>+${rewardText}P</p>
                </div>
                <button class="btn-pool-join" data-id="${mId}">가져오기</button>
            `;
            container.appendChild(item);
        });

        if (!hasAvailable) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-gray);">도전 가능한 새 미션이 없습니다.</p>';
        }

        document.querySelectorAll('.btn-pool-join').forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.target.getAttribute('data-id');
                await joinMission(id);
                await renderMissionPool(); // 풀 리스트 갱신
            };
        });
    } catch (error) {
        console.error("Pool load error:", error);
        container.innerHTML = '<p style="text-align:center; color:#ff4d4d;">미션을 가져오지 못했습니다.</p>';
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
        const today = new Date().toLocaleDateString();
        
        currentUser.points += reward;
        currentUser.lastQuizDate = today;

        try {
            await updateDoc(doc(db, "users", currentUser.id), { 
                points: currentUser.points,
                lastQuizDate: today
            });
            
            const futureAsset = calculateFutureAsset(currentUser.birthYear || 2009, reward, 0.05, 0.02);
            alert(`경제 지식 상승! 📈 ${correctAnswersCount}문제를 맞혀 ${reward}원을 획득했습니다!\n스무 살의 시드머니가 ${futureAsset.futureValue.toLocaleString()}원 더 늘어났어요! 🚀`);
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
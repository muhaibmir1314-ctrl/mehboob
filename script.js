// ============================================
// FIREBASE IMPORTS
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    addDoc,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// ============================================
// FIREBASE CONFIG
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyD_soaQHORvmGv5tWyhOMgbF0BIsirWLlM",
    authDomain: "mehboob-f9765.firebaseapp.com",
    projectId: "mehboob-f9765",
    storageBucket: "mehboob-f9765.firebasestorage.app",
    messagingSenderId: "640538039007",
    appId: "1:640538039007:web:d742dea650502b657b0f6a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================
// DATA
// ============================================

const DISTRICTS = [
    "Srinagar", "Baramulla", "Anantnag", "Kupwara",
    "Bandipora", "Ganderbal", "Budgam", "Pulwama",
    "Shopian", "Kulgam"
];

const CASTES = [
    "Bhat", "Mir", "Kumar", "Dar", "Zargar", "Malik", "Sheikh",
    "Raina", "Khan", "Parray", "Khawaja", "Rather", "Shah",
    "Ganaie", "Wani", "Geelani", "Khar", "Waza", "Lone", "Kachru",
    "Khandey", "Chopan", "Hajjam", "Syed", "Peer", "Mattoo",
    "Kachroo", "Ahanger", "Pirzada", "Teli", "Reshi", "Hakeem",
    "Gojar", "Qureshi", "Pahari", "Mughal", "Sufi", "Qadri",
    "Hamdani", "Gurezi"
];

const AVATAR_COLORS = [
    "#D4A373", "#CC8B5C", "#8B5A2B", "#A8703C", "#C4956A",
    "#B5476B", "#3498DB", "#27AE60", "#E67E22", "#9B59B6"
];

// ============================================
// STATE
// ============================================

let currentUser = null;
let currentProfile = null;
let allUsers = [];
let myLikes = [];
let myMatches = [];
let currentStep = 0;
let onboardData = {};
let currentPage = 'home';
let viewedProfileUser = null;
let currentChatPartner = null;

let unsubscribeUsers = null;
let unsubscribeLikes = null;
let unsubscribeMatches = null;
let unsubscribeMessages = null;

// ============================================
// DOM REFS
// ============================================

const appContent = document.getElementById('app-content');
const headerTitle = document.getElementById('header-title');
const headerBackBtn = document.getElementById('header-back-btn');
const headerRight = document.getElementById('header-right');
const navBtns = document.querySelectorAll('.nav-btn');
const bottomNav = document.getElementById('bottom-nav');
const appHeader = document.getElementById('app-header');

// ============================================
// AVATAR HELPER
// ============================================

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name) {
    return (name || '?').charAt(0).toUpperCase();
}

function renderAvatar(name, size = 44) {
    const color = getAvatarColor(name || '');
    const initial = getInitial(name);
    return `<div class="avatar-circle" style="background:${color};width:${size}px;height:${size}px;font-size:${size * 0.4}px;">${initial}</div>`;
}

// ============================================
// REAL-TIME LISTENERS
// ============================================

function listenToUsers() {
    if (unsubscribeUsers) unsubscribeUsers();
    const q = collection(db, 'users');
    unsubscribeUsers = onSnapshot(q, (snap) => {
        allUsers = [];
        snap.forEach(d => allUsers.push({ id: d.id, ...d.data() }));
        if (currentPage === 'home') renderHome();
        if (currentPage === 'search') applySearch();
    });
}

function listenToLikes() {
    if (!currentUser) return;
    if (unsubscribeLikes) unsubscribeLikes();
    const q = query(collection(db, 'likes'), where('from_user', '==', currentUser.uid));
    unsubscribeLikes = onSnapshot(q, (snap) => {
        myLikes = [];
        snap.forEach(d => myLikes.push({ id: d.id, ...d.data() }));
        if (currentPage === 'home') renderHome();
        if (currentPage === 'profile-view' && viewedProfileUser) renderProfileView({ user: viewedProfileUser });
    });
}

function listenToMatches() {
    if (!currentUser) return;
    if (unsubscribeMatches) unsubscribeMatches();
    
    const q1 = query(collection(db, 'matches'), where('user1', '==', currentUser.uid));
    const q2 = query(collection(db, 'matches'), where('user2', '==', currentUser.uid));

    const unsub1 = onSnapshot(q1, (snap1) => {
        const m1 = [];
        snap1.forEach(d => m1.push({ id: d.id, ...d.data() }));
        const m2 = myMatches.filter(m => m.user2 === currentUser.uid);
        myMatches = [...m1, ...m2];
        myMatches = Array.from(new Set(myMatches.map(m => m.id))).map(id => myMatches.find(m => m.id === id));
        
        if (currentPage === 'home') renderHome();
        if (currentPage === 'matches') renderMatches();
        if (currentPage === 'messages') renderMessages();
        if (currentPage === 'profile-view' && viewedProfileUser) renderProfileView({ user: viewedProfileUser });
    });

    const unsub2 = onSnapshot(q2, (snap2) => {
        const m2 = [];
        snap2.forEach(d => m2.push({ id: d.id, ...d.data() }));
        const m1 = myMatches.filter(m => m.user1 === currentUser.uid);
        myMatches = [...m1, ...m2];
        myMatches = Array.from(new Set(myMatches.map(m => m.id))).map(id => myMatches.find(m => m.id === id));
        
        if (currentPage === 'home') renderHome();
        if (currentPage === 'matches') renderMatches();
        if (currentPage === 'messages') renderMessages();
        if (currentPage === 'profile-view' && viewedProfileUser) renderProfileView({ user: viewedProfileUser });
    });

    unsubscribeMatches = () => { unsub1(); unsub2(); };
}

// ============================================
// NAVIGATION
// ============================================

function navigateTo(page, data = null) {
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
    currentPage = page;
    
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    if (page === 'login' || page === 'onboarding') {
        bottomNav.style.display = 'none';
        appHeader.style.display = 'none';
    } else {
        bottomNav.style.display = 'flex';
        appHeader.style.display = 'flex';
    }

    const backPages = ['onboarding', 'chat', 'messages', 'profile-view'];
    headerBackBtn.style.display = backPages.includes(page) ? 'block' : 'none';

    switch (page) {
        case 'login': renderLogin(); break;
        case 'onboarding': renderOnboarding(); break;
        case 'home': renderHome(); break;
        case 'search': renderSearch(); break;
        case 'matches': renderMatches(); break;
        case 'chat': renderChat(data); break;
        case 'messages': renderMessages(); break;
        case 'profile': renderProfile(); break;
        case 'profile-view': renderProfileView(data); break;
        default: renderHome();
    }
}

headerBackBtn.addEventListener('click', () => {
    if (currentPage === 'onboarding') {
        if (currentStep > 0) { currentStep--; renderOnboarding(); }
        else navigateTo('login');
    } else if (currentPage === 'chat') {
        navigateTo('matches');
    } else if (currentPage === 'messages' || currentPage === 'profile-view') {
        navigateTo('home');
    } else {
        navigateTo('home');
    }
});

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (!currentProfile && page !== 'home') { navigateTo('login'); return; }
        navigateTo(page);
    });
});

function setHeaderTitle(page, title, icon = null) {
    if (page === 'home') {
        headerTitle.innerHTML = `<span style="color:#C4956A;font-size:20px;">🍁</span> Mehboob`;
    } else if (icon) {
        headerTitle.innerHTML = `<span class="header-title-with-icon"><i class="fas fa-${icon}"></i> ${title}</span>`;
    } else {
        headerTitle.textContent = title;
    }
}

function updateHeaderRight() {
    headerRight.innerHTML = '';
    if (currentProfile && currentPage === 'home') {
        const messagesBtn = document.createElement('button');
        messagesBtn.className = 'header-btn';
        messagesBtn.innerHTML = '<i class="fas fa-paper-plane" style="color:var(--primary);font-size:20px;"></i>';
        messagesBtn.addEventListener('click', () => navigateTo('messages'));
        headerRight.appendChild(messagesBtn);
    }
}

// ============================================
// RENDER: LOGIN
// ============================================

function renderLogin() {
    setHeaderTitle('login', 'Login');
    updateHeaderRight();
    appContent.innerHTML = `
        <div class="login-container">
            <div class="logo-wrapper">
                <div class="logo-icon">🍁</div>
                <h1 class="app-name">Mehboob</h1>
                <p class="tagline">Find your Mehboob</p>
            </div>
            <div class="login-form">
                <button id="continue-btn" class="btn-primary">Continue <i class="fas fa-arrow-right"></i></button>
                <p class="terms">By continuing you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a></p>
            </div>
        </div>
    `;
    document.getElementById('continue-btn').addEventListener('click', async () => {
        // YEH LINE FIX HAI: Taaki hamesha Login ke baad Onboarding khule
        localStorage.setItem('hasClickedContinue', 'true'); 
        
        if (currentProfile) { navigateTo('home'); return; }
        currentStep = 0;
        onboardData = {};
        navigateTo('onboarding');
    });
}

// ============================================
// RENDER: ONBOARDING
// ============================================

const onboardingSteps = [
    { id: 'name', label: "What's your name?", subtitle: "What should we call you?", type: 'text', placeholder: 'Enter your name' },
    { id: 'age', label: "How old are you?", subtitle: "Age must be between 16-35", type: 'number', placeholder: '16-35', min: 16, max: 35 },
    { id: 'district', label: "Which district are you from?", subtitle: "Select your Kashmir district", type: 'select', options: DISTRICTS },
    { id: 'caste', label: "What's your caste?", subtitle: "If not listed, select 'Other' and type yours", type: 'caste' },
    { id: 'bio', label: "Tell us about yourself", subtitle: "A short bio (max 100 chars)", type: 'text', placeholder: 'Love mountains & chai...', maxlength: 100 }
];

function renderOnboarding() {
    setHeaderTitle('onboarding', 'Create Profile');
    updateHeaderRight();
    if (currentStep < 0) currentStep = 0;
    if (currentStep >= onboardingSteps.length) currentStep = onboardingSteps.length - 1;

    const step = onboardingSteps[currentStep];
    let html = `<div class="onboarding-container"><div class="progress-bar"><div class="progress-fill" style="width:${((currentStep+1)/onboardingSteps.length)*100}%"></div></div><div id="onboarding-content">`;
    html += `<h2>${step.label}</h2><p class="subtitle">${step.subtitle}</p>`;

    if (step.type === 'text') {
        const maxAttr = step.maxlength ? `maxlength="${step.maxlength}"` : '';
        html += `<input type="text" id="onboard-input" placeholder="${step.placeholder}" ${maxAttr} />`;
        if (step.maxlength) {
            html += `<div class="char-counter"><span id="char-counter">0</span>/${step.maxlength}</div>`;
        }
    } else if (step.type === 'number') {
        html += `<input type="number" id="onboard-input" placeholder="${step.placeholder}" min="${step.min}" max="${step.max}" />`;
    } else if (step.type === 'select') {
        html += `<select id="onboard-select"><option value="">Select...</option>`;
        step.options.forEach(opt => { html += `<option value="${opt}">${opt}</option>`; });
        html += `</select>`;
    } else if (step.type === 'caste') {
        html += `<select id="onboard-select"><option value="">Select your caste...</option>`;
        CASTES.forEach(c => { html += `<option value="${c}">${c}</option>`; });
        html += `<option value="other">Other (type yours)</option></select>`;
        html += `<div id="caste-other-container" class="caste-other-input"><input type="text" id="caste-other-input" placeholder="Type your caste..." /></div>`;
    }

    html += `<div class="onboarding-buttons">`;
    if (currentStep > 0) html += `<button class="btn-back" id="onboard-back"><i class="fas fa-arrow-left"></i> Back</button>`;
    html += `<button class="btn-next" id="onboard-next" disabled>${currentStep === onboardingSteps.length - 1 ? 'Finish' : 'Next →'}</button>`;
    html += `</div></div></div>`;

    appContent.innerHTML = html;

    if (step.type === 'text' && step.maxlength) {
        const input = document.getElementById('onboard-input');
        const counter = document.getElementById('char-counter');
        input.addEventListener('input', () => { counter.textContent = input.value.length; });
    }

    document.getElementById('onboard-back')?.addEventListener('click', () => {
        if (currentStep > 0) { currentStep--; renderOnboarding(); }
    });

    const nextBtn = document.getElementById('onboard-next');
    const input = document.getElementById('onboard-input');

    if (input && (step.type === 'text' || step.type === 'number')) {
        input.addEventListener('input', () => {
            const val = input.value.trim();
            if (val.length > 0) { nextBtn.classList.add('active'); nextBtn.disabled = false; }
            else { nextBtn.classList.remove('active'); nextBtn.disabled = true; }
        });
        if (step.type === 'number') {
            input.addEventListener('change', () => {
                const val = parseInt(input.value);
                if (val >= 16 && val <= 35 && val) { nextBtn.classList.add('active'); nextBtn.disabled = false; }
                else { nextBtn.classList.remove('active'); nextBtn.disabled = true; }
            });
        }
    }

    const select = document.getElementById('onboard-select');
    if (select) {
        select.addEventListener('change', () => {
            if (select.value) { nextBtn.classList.add('active'); nextBtn.disabled = false; }
            else { nextBtn.classList.remove('active'); nextBtn.disabled = true; }
            if (step.type === 'caste') {
                const otherContainer = document.getElementById('caste-other-container');
                otherContainer.classList.toggle('show', select.value === 'other');
            }
        });
    }

    nextBtn.addEventListener('click', handleOnboardNext);
}

function handleOnboardNext() {
    const step = onboardingSteps[currentStep];
    if (step.type === 'text') {
        const val = document.getElementById('onboard-input')?.value.trim();
        if (!val) return alert('Please fill this field');
        onboardData[step.id] = val;
    } else if (step.type === 'number') {
        const val = parseInt(document.getElementById('onboard-input')?.value);
        if (!val || val < 16 || val > 35) return alert('Age must be between 16-35');
        onboardData[step.id] = val;
    } else if (step.type === 'select') {
        const val = document.getElementById('onboard-select')?.value;
        if (!val) return alert('Please select an option');
        onboardData[step.id] = val;
    } else if (step.type === 'caste') {
        let val = document.getElementById('onboard-select')?.value;
        if (!val) return alert('Please select your caste');
        if (val === 'other') {
            const otherVal = document.getElementById('caste-other-input')?.value.trim();
            if (!otherVal) return alert('Please type your caste');
            val = otherVal;
        }
        onboardData[step.id] = val;
    }

    if (currentStep === onboardingSteps.length - 1) {
        finishOnboarding();
    } else {
        currentStep++;
        renderOnboarding();
    }
}

async function finishOnboarding() {
    if (!currentUser) {
        alert('Auth error. Please refresh.');
        return;
    }
    const userData = {
        name: onboardData.name || "",
        age: onboardData.age || 0,
        district: onboardData.district || "",
        caste: onboardData.caste || "",
        bio: onboardData.bio || "",
        createdAt: serverTimestamp()
    };
    try {
        await setDoc(doc(db, 'users', currentUser.uid), userData);
        currentProfile = { id: currentUser.uid, ...userData };
        
        listenToUsers();
        listenToLikes();
        listenToMatches();
        
        navigateTo('home');
    } catch (e) {
        console.error('Save user error:', e);
        alert('Error saving profile: ' + e.message);
    }
}

// ============================================
// RENDER: HOME
// ============================================

function renderHome() {
    setHeaderTitle('home');
    updateHeaderRight();

    const available = allUsers.filter(u => u.id !== currentUser?.uid);
    let html = `<div class="feed-container">`;

    if (available.length === 0) {
        html += `<div class="feed-empty"><i class="fas fa-users"></i><p>No users yet</p><span>Be the first to join!</span></div>`;
    } else {
        available.forEach(user => {
            const isLiked = myLikes.some(l => l.to_user === user.id);
            const isMatched = myMatches.some(m =>
                (m.user1 === currentUser.uid && m.user2 === user.id) ||
                (m.user2 === currentUser.uid && m.user1 === user.id)
            );
            let btnText = '🤍 Request';
            let btnClass = 'feed-action-btn request';
            if (isMatched) { btnText = '💬 Chat'; btnClass = 'feed-action-btn chat'; }
            else if (isLiked) { btnText = '⏳ Requested'; btnClass = 'feed-action-btn requested'; }

            html += `
                <div class="feed-card" onclick="window.viewProfile('${user.id}')">
                    <div class="feed-row">
                        <div class="feed-left">
                            ${renderAvatar(user.name)}
                            <div class="feed-info">
                                <div class="feed-name-age">
                                    <span class="feed-name">${user.name}</span>
                                    <span class="feed-age">${user.age}</span>
                                </div>
                                <div class="feed-district"><i class="fas fa-map-pin"></i>${user.district}</div>
                            </div>
                        </div>
                        <button class="${btnClass}" onclick="event.stopPropagation(); window.handleMatchAction('${user.id}')">${btnText}</button>
                    </div>
                </div>
            `;
        });
    }
    html += `</div>`;
    appContent.innerHTML = html;
}

window.viewProfile = function(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    viewedProfileUser = user;
    navigateTo('profile-view', { user });
};

window.handleMatchAction = async function(targetId) {
    if (!currentUser) { navigateTo('login'); return; }
    const target = allUsers.find(u => u.id === targetId);
    if (!target) return;

    const isMatched = myMatches.some(m =>
        (m.user1 === currentUser.uid && m.user2 === targetId) ||
        (m.user2 === currentUser.uid && m.user1 === targetId)
    );
    if (isMatched) {
        currentChatPartner = target;
        navigateTo('chat', { partner: target });
        return;
    }

    const isLiked = myLikes.some(l => l.to_user === targetId);
    if (isLiked) { alert('Request already sent!'); return; }

    try {
        const q = query(collection(db, 'likes'),
            where('from_user', '==', targetId),
            where('to_user', '==', currentUser.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            await addDoc(collection(db, 'matches'), {
                user1: currentUser.uid,
                user2: targetId,
                createdAt: serverTimestamp()
            });
            alert(`🎉 You matched with ${target.name}!`);
        } else {
            await addDoc(collection(db, 'likes'), {
                from_user: currentUser.uid,
                to_user: targetId,
                createdAt: serverTimestamp()
            });
            alert(`❤️ Request sent to ${target.name}`);
        }
    } catch (e) {
        console.error('Match action error:', e);
        alert('Error: ' + e.message);
    }
};

// ============================================
// RENDER: PROFILE VIEW
// ============================================

function renderProfileView(data) {
    const user = data?.user || viewedProfileUser;
    if (!user) { navigateTo('home'); return; }
    setHeaderTitle('profile-view', `${user.name}, ${user.age}`);
    updateHeaderRight();

    const isLiked = myLikes.some(l => l.to_user === user.id);
    const isMatched = myMatches.some(m =>
        (m.user1 === currentUser?.uid && m.user2 === user.id) ||
        (m.user2 === currentUser?.uid && m.user1 === user.id)
    );

    let actionHtml = '';
    if (isMatched) {
        actionHtml = `<button class="pv-action-btn chat" onclick="window.openChatFromProfile('${user.id}')">💬 Chat</button>`;
    } else if (isLiked) {
        actionHtml = `<button class="pv-action-btn requested" disabled>⏳ Requested</button>`;
    } else {
        actionHtml = `<button class="pv-action-btn" onclick="window.handleMatchActionFromProfile('${user.id}')">🤍 Match Request</button>`;
    }

    appContent.innerHTML = `
        <div class="profile-view-container">
            <div class="pv-header">
                <span class="pv-name-age">${user.name}<span class="pv-age">, ${user.age}</span></span>
                <span class="pv-district"><i class="fas fa-map-pin"></i>${user.district}</span>
            </div>
            <div class="pv-avatar">${renderAvatar(user.name, 100)}</div>
            <div class="pv-bio">${user.bio || 'Hey there!'}</div>
            <div class="pv-info">
                <div class="pv-field"><span class="label">District</span><span class="value">${user.district || '-'}</span></div>
                <div class="pv-field"><span class="label">Caste</span><span class="value">${user.caste || '-'}</span></div>
            </div>
            ${actionHtml}
        </div>
    `;
}

window.openChatFromProfile = function(partnerId) {
    const partner = allUsers.find(u => u.id === partnerId);
    currentChatPartner = partner;
    navigateTo('chat', { partner });
};

window.handleMatchActionFromProfile = async function(targetId) {
    await window.handleMatchAction(targetId);
    const user = allUsers.find(u => u.id === targetId);
    if (user) navigateTo('profile-view', { user });
};

// ============================================
// RENDER: SEARCH
// ============================================

function renderSearch() {
    setHeaderTitle('search', 'Search', 'search');
    updateHeaderRight();
    let html = `
        <div class="search-container">
            <div class="search-filter">
                <input type="text" id="search-name-input" placeholder="Search by name..." />
            </div>
            <div class="search-filter">
                <select id="district-filter">
                    <option value="">All Districts</option>
    `;
    DISTRICTS.forEach(d => { html += `<option value="${d}">${d}</option>`; });
    html += `</select></div>
            <button id="search-apply-btn">Apply</button>
            <div id="search-results-wrapper"><div id="search-results"></div></div>
        </div>
    `;
    appContent.innerHTML = html;
    document.getElementById('search-apply-btn').addEventListener('click', applySearch);
    document.getElementById('search-name-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applySearch();
    });
    applySearch();
}

function applySearch() {
    const nameQuery = document.getElementById('search-name-input')?.value.trim().toLowerCase() || '';
    const district = document.getElementById('district-filter')?.value || '';
    const container = document.getElementById('search-results');
    let results = allUsers.filter(u => u.id !== currentUser?.uid);
    if (nameQuery) results = results.filter(u => u.name.toLowerCase().includes(nameQuery));
    if (district) results = results.filter(u => u.district === district);
    if (!container) return;
    if (results.length === 0) {
        container.innerHTML = `<p style="color:var(--text-light);text-align:center;padding:20px;">No users found</p>`;
        return;
    }
    container.innerHTML = results.map(u => {
        const alreadyLiked = myLikes.some(l => l.to_user === u.id);
        return `
            <div class="search-result-card" onclick="window.viewProfile('${u.id}')">
                ${renderAvatar(u.name)}
                <div class="info"><h4>${u.name}, ${u.age}</h4><p>${u.district}</p></div>
                <button class="like-btn ${alreadyLiked ? 'liked' : ''}" onclick="event.stopPropagation(); window.handleMatchAction('${u.id}')">${alreadyLiked ? '❤️ Liked' : '🤍 Like'}</button>
            </div>
        `;
    }).join('');
}

// ============================================
// RENDER: MATCHES
// ============================================

function renderMatches() {
    setHeaderTitle('matches', 'Matches', 'heart');
    updateHeaderRight();
    let html = `<div class="matches-container"><div id="matches-list">`;
    if (myMatches.length === 0) {
        html += `<div style="text-align:center;padding:40px 0;color:var(--text-light);">
            <i class="fas fa-heart" style="font-size:40px;opacity:0.2;display:block;margin-bottom:12px;"></i>
            <p>No matches yet</p>
            <p style="font-size:14px;">Send match requests to connect!</p>
        </div>`;
    } else {
        html += myMatches.map(m => {
            const partnerId = m.user1 === currentUser?.uid ? m.user2 : m.user1;
            const partner = allUsers.find(u => u.id === partnerId);
            if (!partner) return '';
            return `
                <div class="match-card" onclick="window.openChatFromMatch('${partner.id}')">
                    ${renderAvatar(partner.name)}
                    <div class="info"><h4>${partner.name}, ${partner.age}</h4><p>📍 ${partner.district}</p></div>
                    <i class="fas fa-arrow-right chat-arrow"></i>
                </div>
            `;
        }).join('');
    }
    html += `</div></div>`;
    appContent.innerHTML = html;
}

window.openChatFromMatch = function(partnerId) {
    const partner = allUsers.find(u => u.id === partnerId);
    currentChatPartner = partner;
    navigateTo('chat', { partner });
};

// ============================================
// RENDER: CHAT
// ============================================

function renderChat(data) {
    const partner = data?.partner || currentChatPartner;
    if (!partner) { navigateTo('matches'); return; }
    setHeaderTitle('chat', `Chat with ${partner.name}`);
    updateHeaderRight();

    appContent.innerHTML = `
        <div class="chat-container">
            <div id="chat-messages">
                <div class="msg received">👋 You matched! Say hi.</div>
            </div>
            <div class="chat-input">
                <input type="text" id="chat-input-field" placeholder="Type a message..." />
                <button id="chat-send-btn"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;

    document.getElementById('chat-send-btn').addEventListener('click', () => sendMessage(partner.id));
    document.getElementById('chat-input-field').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage(partner.id);
    });

    const matchId = getMatchId(partner.id);
    const q = query(collection(db, 'messages'), where('match_id', '==', matchId));
    unsubscribeMessages = onSnapshot(q, (snap) => {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const msgs = [];
        snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
        msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

        if (msgs.length === 0) {
            container.innerHTML = `<div class="msg received">👋 You matched! Say hi.</div>`;
        } else {
            container.innerHTML = msgs.map(m => `
                <div class="msg ${m.sender === currentUser.uid ? 'sent' : 'received'}">${m.text}</div>
            `).join('');
        }
        container.scrollTop = container.scrollHeight;
    });
}

function getMatchId(partnerId) {
    return [currentUser.uid, partnerId].sort().join('_');
}

async function sendMessage(partnerId) {
    const input = document.getElementById('chat-input-field');
    const text = input?.value.trim();
    if (!text) return;
    try {
        await addDoc(collection(db, 'messages'), {
            match_id: getMatchId(partnerId),
            sender: currentUser.uid,
            text: text,
            createdAt: serverTimestamp()
        });
        input.value = '';
    } catch (e) {
        console.error('Send message error:', e);
        alert('Failed to send message');
    }
}

// ============================================
// RENDER: MESSAGES
// ============================================

function renderMessages() {
    setHeaderTitle('messages', 'Messages', 'comment-dots');
    updateHeaderRight();
    let html = `<div class="messages-container"><div id="messages-list">`;
    if (myMatches.length === 0) {
        html += `
            <div style="text-align:center;padding:60px 20px;color:var(--text-light);">
                <i class="fas fa-comment-dots" style="font-size:48px;opacity:0.2;display:block;margin-bottom:12px;color:var(--primary);"></i>
                <p style="font-size:16px;font-weight:600;color:var(--text);">No messages yet</p>
                <p style="font-size:13px;">Your chats will appear here</p>
            </div>
        `;
    } else {
        myMatches.forEach(m => {
            const partnerId = m.user1 === currentUser?.uid ? m.user2 : m.user1;
            const partner = allUsers.find(u => u.id === partnerId);
            if (!partner) return;
            html += `
                <div class="chat-row" onclick="window.openChatFromMatch('${partner.id}')">
                    ${renderAvatar(partner.name, 50)}
                    <div class="chat-info">
                        <div class="chat-top">
                            <span class="chat-name">${partner.name}</span>
                            <span class="chat-time">now</span>
                        </div>
                        <div class="chat-preview">Tap to start chatting!</div>
                    </div>
                    <i class="fas fa-chevron-right chat-chevron"></i>
                </div>
            `;
        });
    }
    html += `</div></div>`;
    appContent.innerHTML = html;
}

// ============================================
// RENDER: PROFILE
// ============================================

function renderProfile() {
    setHeaderTitle('profile', 'Profile', 'user');
    updateHeaderRight();
    if (!currentProfile) { navigateTo('login'); return; }

    appContent.innerHTML = `
        <div class="profile-container">
            <div class="profile-avatar">${renderAvatar(currentProfile.name, 100)}</div>
            <div class="profile-name">${currentProfile.name}</div>
            <div class="profile-age">${currentProfile.age}</div>
            <div class="profile-info">
                <div class="profile-field"><span class="label">District</span><span class="value">${currentProfile.district || '-'}</span></div>
                <div class="profile-field"><span class="label">Caste</span><span class="value">${currentProfile.caste || '-'}</span></div>
                <div class="profile-field"><span class="label">Bio</span><span class="value">${currentProfile.bio || 'Hey there!'}</span></div>
            </div>
            <button id="delete-account-btn" class="delete-btn">Delete Account</button>
        </div>
    `;

    document.getElementById('delete-account-btn').addEventListener('click', async () => {
        if (!confirm('Delete account? This cannot be undone.')) return;
        try {
            await setDoc(doc(db, 'users', currentUser.uid), {}, { merge: false });
            await signOut(auth);
            currentUser = null;
            currentProfile = null;
            allUsers = [];
            myLikes = [];
            myMatches = [];
            localStorage.removeItem('hasClickedContinue'); // Reset flag
            navigateTo('login');
            alert('Account deleted.');
        } catch (e) {
            console.error('Delete error:', e);
            alert('Error deleting account');
        }
    });
}

// ============================================
// INIT
// ============================================

async function init() {
    appContent.innerHTML = `<div class="loading-screen"><div class="spinner"></div><p style="color:var(--text-light);">Loading Mehboob...</p></div>`;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            
            // YEH FIX HAI: Agar user ne Continue nahi dabaya, toh Login dikhao
            const hasClickedContinue = localStorage.getItem('hasClickedContinue');
            if (!hasClickedContinue) {
                navigateTo('login');
                return;
            }

            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                currentProfile = { id: docSnap.id, ...docSnap.data() };
                
                listenToUsers();
                listenToLikes();
                listenToMatches();
                
                navigateTo('home');
            } else {
                navigateTo('onboarding');
            }
        } else {
            try {
                await signInAnonymously(auth);
            } catch (e) {
                console.error('Auth error:', e);
                alert('Auth failed. Check Firebase settings.');
            }
        }
    });
}

init();
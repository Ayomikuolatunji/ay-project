import {
  createRegistrationDraft,
  getRegistrationProgress,
  isValidEmail,
  normalizeBusinessName,
} from './app-core.js';

const STORAGE_KEY = 'regulai-client-prototype-v1';
const validRoutes = new Set(['landing', 'login', 'register', 'dashboard']);
const registrationSteps = [
  { id: 'data', label: 'Business details' },
  { id: 'documents', label: 'Document check' },
  { id: 'payment', label: 'Payment & filing' },
];
const trackerSteps = [
  { id: 'data', label: 'Data pending' },
  { id: 'payment', label: 'Payment' },
  { id: 'verifying', label: 'Verifying' },
  { id: 'waiting', label: 'Waiting for CAC' },
  { id: 'registered', label: 'Registered' },
];

const defaultState = {
  language: 'en',
  user: null,
  draft: null,
  registrationStep: 'data',
};

let state = loadState();
let toastTimeout;

const screens = [...document.querySelectorAll('[data-screen]')];
const toast = document.querySelector('#toast');
const publicNav = document.querySelector('.public-nav');
const mobileMenuButton = document.querySelector('.mobile-menu-button');
const mobileMenu = document.querySelector('[data-mobile-menu]');
const landingNavLinks = [...document.querySelectorAll('[data-nav-scroll]')];

function setActiveLandingSection(sectionId) {
  landingNavLinks.forEach((link) => {
    const isActive = Boolean(sectionId) && link.dataset.scroll === sectionId;
    link.classList.toggle('is-active', isActive);
    if (isActive) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function observeLandingSections() {
  if (!('IntersectionObserver' in window)) return;
  const sections = ['features', 'how-it-works', 'brand-building']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visibleSection = entries
      .filter((entry) => entry.isIntersecting)
      .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
    if (visibleSection) setActiveLandingSection(visibleSection.target.id);
  }, { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.2, 0.6] });

  sections.forEach((section) => observer.observe(section));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved && typeof saved === 'object' ? { ...defaultState, ...saved } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  })[character]);
}

function titleCase(value = '') {
  return value
    .split(/[._-]/)[0]
    .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Ayo';
}

function showToast(message) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function setMobileMenu(open) {
  publicNav?.classList.toggle('menu-open', open);
  mobileMenuButton?.setAttribute('aria-expanded', String(open));
  mobileMenuButton?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  if (mobileMenu) mobileMenu.hidden = !open;
}

function syncLanguageControls() {
  document.querySelectorAll('[data-language-select]').forEach((select) => {
    select.value = state.language;
  });
}

function navigate(route, updateHash = true) {
  const targetRoute = validRoutes.has(route) ? route : 'landing';
  if (targetRoute === 'dashboard' && !state.user) {
    if (window.location.hash !== '#login') history.replaceState(null, '', '#login');
    navigate('login', false);
    showToast('Sign in to open your workspace.');
    return;
  }
  setMobileMenu(false);
  if (targetRoute === 'landing') setActiveLandingSection(null);

  screens.forEach((screen) => {
    const isTarget = screen.dataset.screen === targetRoute;
    screen.hidden = !isTarget;
    screen.classList.toggle('is-active', isTarget);
  });

  if (updateHash && window.location.hash !== `#${targetRoute}`) {
    history.replaceState(null, '', `#${targetRoute}`);
  }

  if (targetRoute === 'register') renderRegistration();
  if (targetRoute === 'dashboard') renderDashboard();
  syncLanguageControls();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderFlowSteps() {
  const activeIndex = registrationSteps.findIndex((step) => step.id === state.registrationStep);
  const flowSteps = document.querySelector('#flow-steps');

  flowSteps.innerHTML = registrationSteps.map((step, index) => {
    const isDone = index < activeIndex;
    const isActive = index === activeIndex;
    return `<div class="flow-step ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}">
      <span class="flow-step-marker">${isDone ? '✓' : index + 1}</span>
      <span>${step.label}</span>
    </div>`;
  }).join('');
}

function renderRegistration() {
  renderFlowSteps();
  const stage = document.querySelector('#registration-stage');
  if (state.registrationStep === 'documents') {
    stage.innerHTML = renderDocumentsStep();
    return;
  }
  if (state.registrationStep === 'payment') {
    stage.innerHTML = renderPaymentStep();
    return;
  }
  stage.innerHTML = renderBusinessStep();
}

function renderBusinessStep() {
  const draft = state.draft || {};
  return `<div class="flow-stage-heading">
    <div class="eyebrow">Step 1 of 3 · Business details</div>
    <h1>Tell us about the business you’re building.</h1>
    <p>You don’t need to know the official language. Start with the idea in your own words and we’ll help shape the application.</p>
  </div>
  <div class="guide-message"><span class="mini-avatar">R</span><p><strong>RegulAI guide</strong><br />Welcome. What kind of business are you bringing to life?</p></div>
  <form class="flow-form-card" id="business-form">
    <div class="form-grid">
      <label class="form-field"><span>Business name or idea</span><input id="business-name" name="businessName" type="text" value="${escapeHtml(draft.businessName || '')}" placeholder="e.g. Ayo’s Table" required maxlength="70" /></label>
      <label class="form-field"><span>Business type</span><select name="businessType"><option>Business Name</option><option>Limited Company (Ltd)</option><option>Incorporated Trustee</option></select></label>
    </div>
    <div class="eyebrow" style="margin-top: 1px;">Need inspiration?</div>
    <div class="suggestion-row"><button type="button" data-suggested-name="Ayo’s Table">Ayo’s Table</button><button type="button" data-suggested-name="Lush &amp; Local">Lush &amp; Local</button><button type="button" data-suggested-name="Northstar Repairs">Northstar Repairs</button></div>
    <label class="form-field"><span>What does the business do?</span><textarea name="description" rows="3" placeholder="Tell us what you sell, make, or help people do."></textarea></label>
    <div class="flow-form-actions"><span class="flow-note"><span>✦</span> You can change these details later.</span><button class="button button-dark" type="submit">Continue to documents <span aria-hidden="true">↗</span></button></div>
  </form>`;
}

function renderDocumentsStep() {
  const draft = state.draft || createRegistrationDraft();
  const identityPassed = draft.documents?.identity === 'passed';
  const passportPassed = draft.documents?.passport === 'passed';
  return `<div class="flow-stage-heading">
    <div class="eyebrow">Step 2 of 3 · Document check</div>
    <h1>Let’s make sure your documents are ready.</h1>
    <p>Upload clear copies of the documents needed for your Business Name application. This prototype checks quality and completeness before the next step.</p>
  </div>
  <div class="guide-message"><span class="mini-avatar">R</span><p><strong>RegulAI guide</strong><br />A clear document now means less back-and-forth later. You can use the mock upload buttons for this demo.</p></div>
  <form class="flow-form-card" id="document-form">
    <div class="document-list">
      ${renderDocumentRow('identity', '▤', 'Government-issued identity document', 'National ID, driver’s licence, or international passport', identityPassed)}
      ${renderDocumentRow('passport', '◉', 'Passport photograph', 'A recent, clear photo with a plain background', passportPassed)}
    </div>
    <p class="form-error" id="document-error" role="alert"></p>
    <div class="flow-form-actions"><button class="button button-quiet" type="button" data-action="previous-step">← Back</button><button class="button button-dark" type="submit">Review application <span aria-hidden="true">↗</span></button></div>
  </form>`;
}

function renderDocumentRow(id, icon, title, description, passed) {
  return `<div class="document-row"><span class="document-icon" aria-hidden="true">${icon}</span><div class="document-copy"><strong>${title}</strong><span>${description}</span></div><span class="document-status ${passed ? 'is-passed' : ''}"><i></i>${passed ? 'Ready' : 'Pending'}</span><button class="upload-button" type="button" data-action="mock-upload" data-document="${id}">${passed ? 'Replace' : 'Use mock file'}</button></div>`;
}

function renderPaymentStep() {
  const draft = state.draft || {};
  return `<div class="flow-stage-heading">
    <div class="eyebrow">Step 3 of 3 · Payment &amp; filing</div>
    <h1>Your application is ready to move.</h1>
    <p>Review the details below. In the full system this step connects to a sandbox payment flow before the application enters verification.</p>
  </div>
  <div class="guide-message"><span class="mini-avatar">R</span><p><strong>RegulAI guide</strong><br />Everything looks ready. Once payment is confirmed, your application moves to the verification queue.</p></div>
  <form class="flow-form-card" id="payment-form">
    <div class="review-grid"><div class="review-item"><span>Business name</span><strong>${escapeHtml(draft.businessName || 'Your business')}</strong></div><div class="review-item"><span>Registration type</span><strong>Business Name</strong></div><div class="review-item"><span>Documents</span><strong>2 files · quality checked</strong></div><div class="review-item"><span>Preferred language</span><strong>${languageLabel(state.language)}</strong></div></div>
    <div class="payment-summary"><div><span>Mock filing fee</span><strong>₦25,000</strong></div><small>Government charges included<br />Sandbox payment</small></div>
    <div class="flow-form-actions"><button class="button button-quiet" type="button" data-action="previous-step">← Back</button><button class="button button-dark" type="submit">Pay &amp; queue application <span aria-hidden="true">↗</span></button></div>
  </form>`;
}

function languageLabel(language) {
  return ({ en: 'English', yo: 'Yorùbá', ha: 'Hausa', ig: 'Igbo' })[language] || 'English';
}

function trackerStage(stage) {
  if (stage === 'documents') return 'data';
  return stage || 'data';
}

function renderDashboard() {
  const draft = state.draft;
  const displayName = draft?.businessName || 'No registration started';
  const stage = trackerStage(draft?.stage || 'data');
  const currentIndex = trackerSteps.findIndex((item) => item.id === stage);
  const progress = draft ? getRegistrationProgress(draft.stage) : 0;
  const userName = state.user?.name || 'Ayo Olatunji';

  document.querySelector('#dashboard-user-name').textContent = userName;
  document.querySelector('#dashboard-first-name').textContent = userName.split(' ')[0];
  document.querySelector('#dashboard-business-name').textContent = displayName;
  document.querySelector('#dashboard-progress-number').textContent = `${progress}%`;
  document.querySelector('#dashboard-progress-bar').style.width = `${progress}%`;
  document.querySelector('#status-tracker').innerHTML = trackerSteps.map((item, index) => {
    const done = index < currentIndex;
    const active = index === currentIndex;
    return `<div class="tracker-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}"><span class="tracker-step-marker">${done ? '✓' : index + 1}</span><span>${item.label}</span></div>`;
  }).join('');
}

function setError(selector, message) {
  const element = document.querySelector(selector);
  if (element) element.textContent = message;
}

function ensureUser() {
  if (!state.user) state.user = { name: 'Ayo Olatunji', email: 'demo@regulai.local' };
}

function handleBusinessSubmit(form) {
  const data = new FormData(form);
  const businessName = normalizeBusinessName(data.get('businessName'));
  if (!businessName) {
    setError('#business-name', '');
    document.querySelector('#business-name')?.focus();
    showToast('Add a business name or idea to continue.');
    return;
  }

  state.draft = createRegistrationDraft({ businessName, language: state.language });
  state.registrationStep = 'documents';
  ensureUser();
  saveState();
  renderRegistration();
  showToast('Business details saved. Next: document readiness.');
}

function handleDocumentSubmit() {
  const documents = state.draft?.documents || {};
  if (documents.identity !== 'passed' || documents.passport !== 'passed') {
    setError('#document-error', 'Use the mock upload buttons for both documents before continuing.');
    return;
  }

  state.draft.stage = 'payment';
  state.registrationStep = 'payment';
  saveState();
  renderRegistration();
  showToast('Documents checked. Review the filing step.');
}

function handlePaymentSubmit() {
  ensureUser();
  state.draft.stage = 'verifying';
  state.registrationStep = 'data';
  saveState();
  navigate('dashboard');
  showToast('Mock payment confirmed. Your application is now verifying.');
}

function handleLoginSubmit(form) {
  const data = new FormData(form);
  const email = String(data.get('email') || '').trim();
  const password = String(data.get('password') || '');
  if (!isValidEmail(email)) {
    setError('#login-error', 'Enter a valid email address to continue.');
    return;
  }
  if (password.length < 4) {
    setError('#login-error', 'Use a password with at least 4 characters for this demo.');
    return;
  }

  state.user = { email, name: titleCase(email) };
  saveState();
  navigate('dashboard');
  showToast('Welcome back. Your workspace is ready.');
}

function resetLoginForm() {
  const form = document.querySelector('#login-form');
  const password = document.querySelector('#login-password');
  const toggle = document.querySelector('[data-action="toggle-password"]');
  form?.reset();
  if (password) password.type = 'password';
  if (toggle) {
    toggle.textContent = 'Show password';
    toggle.setAttribute('aria-pressed', 'false');
  }
  setError('#login-error', '');
}

function handleSignOut() {
  state.user = null;
  saveState();
  resetLoginForm();
  navigate('login');
  showToast('You’re signed out. Your application is saved.');
}

function togglePasswordVisibility() {
  const password = document.querySelector('#login-password');
  const toggle = document.querySelector('[data-action="toggle-password"]');
  if (!password || !toggle) return;
  const isVisible = password.type === 'text';
  password.type = isVisible ? 'password' : 'text';
  toggle.textContent = isVisible ? 'Show password' : 'Hide password';
  toggle.setAttribute('aria-pressed', String(!isVisible));
}

function handleDemoLogin() {
  state.user = { email: 'ayo@regulai.demo', name: 'Ayo Olatunji' };
  if (!state.draft) state.draft = createRegistrationDraft({ businessName: 'Ayo’s Table', language: state.language });
  saveState();
  navigate('dashboard');
  showToast('Demo account opened.');
}

function handleClick(event) {
  const routeButton = event.target.closest('[data-route]');
  if (routeButton) {
    navigate(routeButton.dataset.route);
    return;
  }

  const scrollButton = event.target.closest('[data-scroll]');
  if (scrollButton) {
    const destination = document.getElementById(scrollButton.dataset.scroll);
    if (destination) {
      setActiveLandingSection(destination.id);
      destination.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenu(false);
    return;
  }

  const suggestion = event.target.closest('[data-suggested-name]');
  if (suggestion) {
    const input = document.querySelector('#business-name');
    if (input) {
      input.value = suggestion.dataset.suggestedName;
      input.focus();
    }
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const action = actionButton.dataset.action;

  if (action === 'mock-upload') {
    ensureUser();
    if (!state.draft) state.draft = createRegistrationDraft();
    state.draft.documents[actionButton.dataset.document] = 'passed';
    saveState();
    renderRegistration();
    showToast('Mock document checked and marked ready.');
  }

  if (action === 'previous-step') {
    const currentIndex = registrationSteps.findIndex((step) => step.id === state.registrationStep);
    state.registrationStep = registrationSteps[Math.max(0, currentIndex - 1)].id;
    saveState();
    renderRegistration();
  }

  if (action === 'demo-login') handleDemoLogin();
  if (action === 'sign-out') handleSignOut();
  if (action === 'toggle-password') togglePasswordVisibility();
  if (action === 'open-chat') showToast('Mock RegulAI guide opened — ask about documents, names, or status.');
  if (action === 'brand-preview') showToast('Brand kit preview is queued for after filing.');
  if (action === 'notifications') showToast('You’re all caught up.');
  if (action === 'account-menu') showToast('Account menu is mocked for this prototype.');
  if (action === 'forgot-password') showToast('Password reset is mocked for this prototype.');
  if (action === 'terms') showToast('Terms are represented as prototype copy.');
  if (action === 'privacy') showToast('Privacy policy is represented as prototype copy.');
  if (action === 'toggle-mobile-menu') setMobileMenu(!publicNav?.classList.contains('menu-open'));
}

function handleSubmit(event) {
  event.preventDefault();
  if (event.target.id === 'login-form') handleLoginSubmit(event.target);
  if (event.target.id === 'business-form') handleBusinessSubmit(event.target);
  if (event.target.id === 'document-form') handleDocumentSubmit();
  if (event.target.id === 'payment-form') handlePaymentSubmit();
}

function handleChange(event) {
  if (!event.target.matches('[data-language-select]')) return;
  state.language = event.target.value;
  if (state.draft) state.draft.language = state.language;
  saveState();
  syncLanguageControls();
  showToast(`Language set to ${languageLabel(state.language)}.`);
}

function handleHashChange() {
  const route = window.location.hash.slice(1);
  navigate(validRoutes.has(route) ? route : 'landing', false);
}

document.addEventListener('click', handleClick);
document.addEventListener('submit', handleSubmit);
document.addEventListener('change', handleChange);
window.addEventListener('hashchange', handleHashChange);

const initialRoute = window.location.hash.slice(1);
observeLandingSections();
navigate(validRoutes.has(initialRoute) ? initialRoute : 'landing', false);

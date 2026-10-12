import {
  createBrandKit,
  createRegistrationDraft,
  getApplicationTimeline,
  getLocalizedCopy,
  getRegistrationGuidance,
  getRegistrationProgress,
  getRegulAIReply,
  isValidEmail,
  normalizeBusinessName,
  validateDocumentFile,
  validateRegistrationDetails,
} from './app-core.js';

const STORAGE_KEY = 'regulai-client-prototype-v1';
const validRoutes = new Set(['landing', 'login', 'register', 'dashboard']);
const registrationSteps = [
  { id: 'data', label: 'Business details' },
  { id: 'documents', label: 'Document check' },
  { id: 'payment', label: 'Payment & filing' },
];
const defaultState = {
  language: 'en',
  user: null,
  draft: null,
  brandKit: { themeId: 'meadow' },
  registrationStep: 'data',
};

let state = loadState();
let toastTimeout;
let brandPreviewTrigger = null;
let brandPreviewThemeId = 'meadow';
let timelineTrigger = null;
let guideTrigger = null;
let accountMenuTrigger = null;

const screens = [...document.querySelectorAll('[data-screen]')];
const toast = document.querySelector('#toast');
const brandModal = document.querySelector('#brand-modal');
const timelineModal = document.querySelector('#timeline-modal');
const guideModal = document.querySelector('#guide-modal');
const accountPopover = document.querySelector('#account-popover');
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

function appendChatMessage(message, role = 'ai') {
  const messages = document.querySelector('#dashboard-chat-messages');
  if (!messages) return;

  const item = document.createElement('div');
  item.className = `dashboard-message dashboard-message-${role}`;
  item.dataset.chatGenerated = 'true';

  if (role === 'ai') {
    const avatar = document.createElement('span');
    avatar.className = 'mini-avatar';
    avatar.textContent = 'R';
    item.append(avatar);
  }

  const bubble = document.createElement('p');
  bubble.textContent = message;
  item.append(bubble);
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}

function resetGuideChat() {
  document.querySelectorAll('[data-chat-generated]').forEach((message) => message.remove());
  document.querySelector('#chat-form')?.setAttribute('hidden', '');
  document.querySelector('.chat-start-button')?.removeAttribute('hidden');
  document.querySelectorAll('.quick-question').forEach((question) => question.removeAttribute('hidden'));
}

function activeBrandKit(themeId = state.draft?.brandKit?.themeId || state.brandKit?.themeId || 'meadow') {
  return createBrandKit({
    businessName: state.draft?.businessName || 'Ayo’s Table',
    description: state.draft?.description || 'Warm meals. Good company.',
    themeId,
  });
}

function paintSwatches(selector, colors) {
  document.querySelectorAll(selector).forEach((swatch, index) => {
    swatch.style.backgroundColor = colors[index] || '';
  });
}

function renderDashboardBrandKit() {
  const kit = activeBrandKit();
  const preview = document.querySelector('#dashboard-brand-preview');
  const logo = document.querySelector('#dashboard-brand-preview .brand-kit-logo');
  const plus = document.querySelector('#dashboard-brand-preview .brand-kit-plus');
  const name = document.querySelector('#dashboard-brand-name');
  const tagline = document.querySelector('#dashboard-brand-tagline');
  if (!preview || !logo || !plus || !name || !tagline) return;

  document.querySelector('#dashboard-brand-initials').textContent = kit.initials;
  name.textContent = kit.businessName;
  tagline.textContent = kit.descriptor;
  preview.style.backgroundColor = kit.theme.background;
  logo.style.borderColor = kit.theme.accent;
  logo.style.color = kit.theme.accent;
  plus.style.color = kit.theme.secondary;
  paintSwatches('[data-brand-dashboard-swatch]', [kit.theme.accent, kit.theme.secondary, kit.theme.surface]);
}

function renderBrandPreview() {
  const kit = activeBrandKit(brandPreviewThemeId);
  const preview = document.querySelector('#brand-large-preview');
  if (!preview) return;

  document.querySelector('#brand-preview-initials').textContent = kit.initials;
  document.querySelector('#brand-preview-name').textContent = kit.businessName;
  document.querySelector('#brand-preview-descriptor').textContent = kit.descriptor;
  document.querySelector('#brand-theme-label').textContent = kit.theme.label;
  document.querySelector('#brand-modal-copy').textContent = `A ${kit.theme.label.toLowerCase()} direction built around ${kit.businessName}.`;
  preview.style.backgroundColor = kit.theme.background;
  preview.style.setProperty('--brand-preview-accent', kit.theme.accent);
  preview.style.setProperty('--brand-preview-secondary', kit.theme.secondary);
  paintSwatches('[data-brand-preview-swatch]', [kit.theme.accent, kit.theme.secondary, kit.theme.surface, kit.theme.muted]);
  document.querySelectorAll('[data-action="select-brand-theme"]').forEach((button) => {
    const isSelected = button.dataset.brandTheme === brandPreviewThemeId;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
}

function showBrandPreview(trigger = null) {
  if (!brandModal) return;
  brandPreviewTrigger = trigger;
  brandPreviewThemeId = activeBrandKit(state.draft?.brandKit?.themeId || state.brandKit?.themeId || 'meadow').theme.id;
  renderBrandPreview();
  brandModal.hidden = false;
  document.body.classList.add('brand-modal-open');
  brandModal.querySelector('.brand-modal-close')?.focus();
}

function closeBrandPreview() {
  if (!brandModal || brandModal.hidden) return;
  brandModal.hidden = true;
  document.body.classList.remove('brand-modal-open');
  brandPreviewTrigger?.focus();
  brandPreviewTrigger = null;
}

function saveBrandKitDirection() {
  const kit = activeBrandKit(brandPreviewThemeId);
  state.brandKit = { ...(state.brandKit || {}), themeId: brandPreviewThemeId };
  if (state.draft) state.draft.brandKit = { ...(state.draft.brandKit || {}), themeId: brandPreviewThemeId };
  saveState();
  renderDashboardBrandKit();
  closeBrandPreview();
  showToast(`${kit.theme.label} saved to your workspace.`);
}

function copyBrandProfile() {
  const kit = activeBrandKit(brandPreviewThemeId);
  const profile = `${kit.businessName}\n${kit.descriptor}\n\nStarter kit: logo concept, company profile, and landing-page direction.`;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(profile).then(
      () => showToast('Company profile copied.'),
      () => showToast('Company profile is ready to copy in this preview.'),
    );
    return;
  }
  showToast('Company profile is ready to copy in this preview.');
}

function renderApplicationTimeline() {
  const copy = getLocalizedCopy(state.language);
  const timeline = getApplicationTimeline(trackerStage(state.draft?.stage || 'data'));
  const current = timeline.find((item) => item.status === 'current') || timeline[0];
  const currentLabel = document.querySelector('#timeline-current-label');
  const currentNote = document.querySelector('#timeline-current-note');
  const list = document.querySelector('#timeline-list');
  if (!currentLabel || !currentNote || !list) return;

  currentLabel.textContent = copy.tracker[current.id] || current.label;
  currentNote.textContent = current.note;
  list.innerHTML = timeline.map((item, index) => `<div class="timeline-item is-${item.status}">
    <span class="timeline-marker">${item.status === 'complete' ? '✓' : index + 1}</span>
    <div class="timeline-item-copy"><div><strong>${escapeHtml(copy.tracker[item.id] || item.label)}</strong><span>${escapeHtml(copy.timeline[item.status])}</span></div><p>${escapeHtml(item.note)}</p></div>
  </div>`).join('');
}

function showApplicationTimeline(trigger = null) {
  if (!timelineModal) return;
  timelineTrigger = trigger;
  renderApplicationTimeline();
  timelineModal.hidden = false;
  document.body.classList.add('timeline-modal-open');
  timelineModal.querySelector('.timeline-modal-close')?.focus();
}

function closeApplicationTimeline() {
  if (!timelineModal || timelineModal.hidden) return;
  timelineModal.hidden = true;
  document.body.classList.remove('timeline-modal-open');
  timelineTrigger?.focus();
  timelineTrigger = null;
}

function renderRegistrationGuide() {
  const guidance = getRegistrationGuidance(state.registrationStep);
  setText('#guide-modal-eyebrow', guidance.eyebrow);
  setText('#guide-modal-title', guidance.title);
  setText('#guide-modal-intro', guidance.intro);
  setText('#guide-modal-footer-copy', guidance.footer);
  const list = document.querySelector('#guide-modal-list');
  if (!list) return;

  list.innerHTML = guidance.items.map((item, index) => `<div class="guide-item">
    <span class="guide-item-number">${String(index + 1).padStart(2, '0')}</span>
    <div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p></div>
  </div>`).join('');
}

function showRegistrationGuide(trigger = null) {
  if (!guideModal) return;
  guideTrigger = trigger;
  renderRegistrationGuide();
  guideModal.hidden = false;
  document.body.classList.add('guide-modal-open');
  guideModal.querySelector('.guide-modal-close')?.focus();
}

function closeRegistrationGuide() {
  if (!guideModal || guideModal.hidden) return;
  guideModal.hidden = true;
  document.body.classList.remove('guide-modal-open');
  guideTrigger?.focus();
  guideTrigger = null;
}

function showAccountMenu(trigger = null) {
  if (!accountPopover) return;
  accountMenuTrigger = trigger;
  setText('#account-popover-name', state.user?.name || 'Demo visitor');
  setText('#account-popover-email', state.user?.email || 'demo@regulai.local');
  accountPopover.hidden = false;
  accountPopover.querySelector('[data-action="reset-demo"]')?.focus();
}

function closeAccountMenu() {
  if (!accountPopover || accountPopover.hidden) return;
  accountPopover.hidden = true;
  accountMenuTrigger?.focus();
  accountMenuTrigger = null;
}

function resetDemo() {
  if (!window.confirm('Restart the demo and clear this browser’s saved application?')) return;
  const language = state.language || defaultState.language;
  state = { ...defaultState, language, brandKit: { ...defaultState.brandKit } };
  saveState();
  closeAccountMenu();
  resetLoginForm();
  navigate('login');
  showToast('Demo reset. Start again from the beginning.');
}

function showGuideChat(question = '') {
  const form = document.querySelector('#chat-form');
  if (!form) return;

  form.removeAttribute('hidden');
  document.querySelector('.chat-start-button')?.setAttribute('hidden', '');
  document.querySelectorAll('.quick-question').forEach((quickQuestion) => quickQuestion.setAttribute('hidden', ''));

  if (question) {
    appendChatMessage(question, 'user');
    appendChatMessage(getRegulAIReply(question));
  }

  document.querySelector('#chat-input')?.focus();
}

function handleChatSubmit(form) {
  const input = form.querySelector('#chat-input');
  const message = String(new FormData(form).get('message') || '').trim();
  if (!message) {
    input?.focus();
    return;
  }

  appendChatMessage(message, 'user');
  appendChatMessage(getRegulAIReply(message));
  form.reset();
  input?.focus();
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
  const copy = getLocalizedCopy(state.language);

  flowSteps.innerHTML = registrationSteps.map((step, index) => {
    const isDone = index < activeIndex;
    const isActive = index === activeIndex;
    return `<div class="flow-step ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}">
      <span class="flow-step-marker">${isDone ? '✓' : index + 1}</span>
      <span>${copy.steps[step.id] || step.label}</span>
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
  const businessType = draft.businessType || 'Business Name';
  return `<div class="flow-stage-heading">
    <div class="eyebrow">Step 1 of 3 · Business details</div>
    <h1>Tell us about the business you’re building.</h1>
    <p>You don’t need to know the official language. Start with the idea in your own words and we’ll help shape the application.</p>
  </div>
  <div class="guide-message"><span class="mini-avatar">R</span><p><strong>RegulAI guide</strong><br />Welcome. What kind of business are you bringing to life?</p></div>
  <form class="flow-form-card" id="business-form" novalidate>
    <div class="form-grid">
      <label class="form-field"><span>Business name or idea</span><input id="business-name" name="businessName" type="text" value="${escapeHtml(draft.businessName || '')}" placeholder="e.g. Ayo’s Table" required maxlength="70" /></label>
      <label class="form-field"><span>Business type</span><select id="business-type" name="businessType"><option${businessType === 'Business Name' ? ' selected' : ''}>Business Name</option><option${businessType === 'Limited Company (Ltd)' ? ' selected' : ''}>Limited Company (Ltd)</option><option${businessType === 'Incorporated Trustee' ? ' selected' : ''}>Incorporated Trustee</option></select></label>
    </div>
    <div class="eyebrow" style="margin-top: 1px;">Need inspiration?</div>
    <div class="suggestion-row"><button type="button" data-suggested-name="Ayo’s Table">Ayo’s Table</button><button type="button" data-suggested-name="Lush &amp; Local">Lush &amp; Local</button><button type="button" data-suggested-name="Northstar Repairs">Northstar Repairs</button></div>
    <label class="form-field"><span>What does the business do?</span><textarea name="description" rows="3" placeholder="Tell us what you sell, make, or help people do.">${escapeHtml(draft.description || '')}</textarea></label>
    <p class="form-error" id="business-error" role="alert"></p>
    <div class="flow-form-actions"><span class="flow-note"><span>✦</span> You can change these details later.</span><button class="button button-dark" type="submit">Continue to documents <span aria-hidden="true">↗</span></button></div>
  </form>`;
}

function renderDocumentsStep() {
  const draft = state.draft || createRegistrationDraft();
  const documents = draft.documents || {};
  const documentFiles = draft.documentFiles || {};
  const documentErrors = draft.documentErrors || {};
  return `<div class="flow-stage-heading">
    <div class="eyebrow">Step 2 of 3 · Document check</div>
    <h1>Let’s make sure your documents are ready.</h1>
    <p>Upload clear copies of the documents needed for your Business Name application. This prototype checks quality and completeness before the next step.</p>
  </div>
  <div class="guide-message"><span class="mini-avatar">R</span><p><strong>RegulAI guide</strong><br />A clear document now means less back-and-forth later. Choose a file or use a demo file for this prototype.</p></div>
  <form class="flow-form-card" id="document-form">
    <div class="document-list">
      ${renderDocumentRow('identity', '▤', 'Government-issued identity document', 'National ID, driver’s licence, or international passport', documents.identity, documentFiles.identity, documentErrors.identity, 'application/pdf,image/jpeg,image/png')}
      ${renderDocumentRow('passport', '◉', 'Passport photograph', 'A recent, clear photo with a plain background', documents.passport, documentFiles.passport, documentErrors.passport, 'image/jpeg,image/png')}
    </div>
    <p class="form-error" id="document-error" role="alert"></p>
    <div class="flow-form-actions"><button class="button button-quiet" type="button" data-action="previous-step">← Back</button><button class="button button-dark" type="submit">Review application <span aria-hidden="true">↗</span></button></div>
  </form>`;
}

function renderDocumentRow(id, icon, title, description, status = 'pending', file = null, error = '', accept = '') {
  const passed = status === 'passed';
  const failed = status === 'failed';
  const statusLabel = passed ? 'Ready' : failed ? 'Needs attention' : 'Pending';
  const fileLabel = file?.name
    ? `${escapeHtml(file.name)}${Number(file.size) > 0 ? ` · ${formatFileSize(file.size)}` : ''}`
    : escapeHtml(description);
  return `<div class="document-row ${failed ? 'has-error' : ''}">
    <span class="document-icon" aria-hidden="true">${icon}</span>
    <div class="document-copy"><strong>${title}</strong><span>${fileLabel}</span>${error ? `<small class="document-error" role="alert">${escapeHtml(error)}</small>` : ''}</div>
    <span class="document-status ${passed ? 'is-passed' : ''} ${failed ? 'is-failed' : ''}"><i></i>${statusLabel}</span>
    <div class="document-actions"><label class="upload-button" for="${id}-file">${file ? 'Replace file' : 'Choose file'}</label><input class="document-file-input" id="${id}-file" type="file" data-document-input="${id}" accept="${accept}" /><button class="demo-file-button" type="button" data-action="mock-upload" data-document="${id}">Use demo file</button></div>
  </div>`;
}

function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function ensureDocumentState() {
  if (!state.draft) state.draft = createRegistrationDraft();
  state.draft.documents ||= {};
  state.draft.documents.identity ||= 'pending';
  state.draft.documents.passport ||= 'pending';
  state.draft.documentFiles ||= {};
  state.draft.documentFiles.identity ??= null;
  state.draft.documentFiles.passport ??= null;
  state.draft.documentErrors ||= {};
  state.draft.documentErrors.identity ??= '';
  state.draft.documentErrors.passport ??= '';
}

const demoDocumentFiles = {
  identity: { name: 'ayo-identity.pdf', mimeType: 'application/pdf', size: 1_200_000 },
  passport: { name: 'ayo-passport.jpg', mimeType: 'image/jpeg', size: 850_000 },
};

function applyDocumentFile(documentType, file) {
  ensureUser();
  ensureDocumentState();
  const metadata = {
    name: String(file?.name || ''),
    mimeType: String(file?.type || file?.mimeType || ''),
    size: Number(file?.size) || 0,
  };
  const result = validateDocumentFile({ documentType, ...metadata });
  state.draft.documentFiles[documentType] = metadata;
  state.draft.documents[documentType] = result.valid ? 'passed' : 'failed';
  state.draft.documentErrors[documentType] = result.valid ? '' : result.message;
  saveState();
  renderRegistration();
  showToast(result.valid ? `${metadata.name} checked and marked ready.` : result.message);
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
    <div class="review-grid"><div class="review-item"><span>Business name</span><strong>${escapeHtml(draft.businessName || 'Your business')}</strong></div><div class="review-item"><span>Registration type</span><strong>${escapeHtml(draft.businessType || 'Business Name')}</strong></div><div class="review-item review-item-wide"><span>What the business does</span><strong>${escapeHtml(draft.description || 'Description to be confirmed')}</strong></div><div class="review-item"><span>Documents</span><strong>2 files · quality checked</strong></div><div class="review-item"><span>Preferred language</span><strong>${languageLabel(state.language)}</strong></div></div>
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
  const copy = getLocalizedCopy(state.language);
  const displayName = draft?.businessName || 'No registration started';
  const stage = trackerStage(draft?.stage || 'data');
  const timeline = getApplicationTimeline(stage);
  const progress = draft ? getRegistrationProgress(draft.stage) : 0;
  const userName = state.user?.name || 'Ayo Olatunji';

  setText('#dashboard-user-name', userName);
  setText('#dashboard-first-name', userName.split(' ')[0]);
  setText('#dashboard-chat-greeting', `Hi ${userName.split(' ')[0]}. What would you like to make clearer today?`);
  setText('#dashboard-business-name', displayName);
  setText('#dashboard-registration-type', `${draft?.businessType || 'Business Name'} registration · Started today`);
  setText('#dashboard-progress-number', `${progress}%`);
  setText('#dashboard-breadcrumb', copy.dashboard.breadcrumb);
  setText('#dashboard-greeting-label', copy.dashboard.greeting);
  setText('#dashboard-progress-eyebrow', copy.dashboard.progressEyebrow);
  setText('#dashboard-heading', copy.dashboard.heading);
  setText('#dashboard-subheading', copy.dashboard.subheading);
  setText('#dashboard-continue-label', copy.dashboard.continueRegistration);
  setText('#dashboard-status-label', copy.dashboard.applicationInProgress);
  setText('#dashboard-current-progress-label', copy.dashboard.currentProgress);
  setText('#dashboard-timeline-label', copy.dashboard.viewTimeline);
  setText('#dashboard-chat-eyebrow', copy.dashboard.alwaysAvailable);
  setText('#dashboard-chat-title', copy.dashboard.askRegulai);
  setText('#dashboard-online-label', copy.dashboard.online);
  setText('#dashboard-brand-eyebrow', copy.dashboard.afterRegistration);
  setText('#dashboard-brand-title', copy.dashboard.brandKit);
  setText('#dashboard-brand-preview-label', copy.dashboard.preview);
  setText('#dashboard-start-chat-label', copy.dashboard.startConversation);
  const progressBar = document.querySelector('#dashboard-progress-bar');
  if (progressBar) progressBar.style.width = `${progress}%`;
  const quickQuestions = document.querySelectorAll('.quick-question');
  const quickQuestionCopy = [copy.dashboard.quickDocuments, copy.dashboard.quickTiming];
  quickQuestions.forEach((question, index) => {
    const label = question.querySelector('[data-quick-question-label]');
    const localizedQuestion = quickQuestionCopy[index] || question.dataset.chatQuestion;
    if (label) label.textContent = localizedQuestion;
  });
  document.querySelector('#status-tracker').innerHTML = timeline.map((item, index) => {
    const done = item.status === 'complete';
    const active = item.status === 'current';
    return `<div class="tracker-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}"><span class="tracker-step-marker">${done ? '✓' : index + 1}</span><span>${copy.tracker[item.id] || item.label}</span></div>`;
  }).join('');
  renderDashboardBrandKit();
  resetGuideChat();
}

function setError(selector, message) {
  const element = document.querySelector(selector);
  if (element) element.textContent = message;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function ensureUser() {
  if (!state.user) state.user = { name: 'Ayo Olatunji', email: 'demo@regulai.local' };
}

function handleBusinessSubmit(form) {
  const data = new FormData(form);
  const businessName = normalizeBusinessName(data.get('businessName'));
  const businessType = String(data.get('businessType') || '');
  const description = String(data.get('description') || '').trim();
  const errors = validateRegistrationDetails({ businessName, businessType });
  if (Object.keys(errors).length > 0) {
    setError('#business-error', Object.values(errors)[0]);
    document.querySelector(errors.businessName ? '#business-name' : '#business-type')?.focus();
    showToast(Object.values(errors)[0]);
    return;
  }

  state.draft = createRegistrationDraft({ businessName, businessType, description, language: state.language });
  state.registrationStep = 'documents';
  ensureUser();
  saveState();
  renderRegistration();
  showToast('Business details saved. Next: document readiness.');
}

function handleDocumentSubmit() {
  const documents = state.draft?.documents || {};
  if (documents.identity !== 'passed' || documents.passport !== 'passed') {
    setError('#document-error', 'Choose a valid file or use a demo file for both documents before continuing.');
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
  state.draft.payment = 'paid';
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
  if (accountPopover && !accountPopover.hidden && !event.target.closest('#account-popover') && !event.target.closest('[data-action="account-menu"]')) {
    closeAccountMenu();
  }

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
    applyDocumentFile(actionButton.dataset.document, demoDocumentFiles[actionButton.dataset.document]);
    return;
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
  if (action === 'open-chat') showGuideChat(actionButton.dataset.chatQuestion || '');
  if (action === 'open-timeline') {
    showApplicationTimeline(actionButton);
    return;
  }
  if (action === 'close-timeline') {
    closeApplicationTimeline();
    return;
  }
  if (action === 'open-registration-guide') {
    showRegistrationGuide(actionButton);
    return;
  }
  if (action === 'close-registration-guide') {
    closeRegistrationGuide();
    return;
  }
  if (action === 'account-menu') {
    showAccountMenu(actionButton);
    return;
  }
  if (action === 'close-account-menu') {
    closeAccountMenu();
    return;
  }
  if (action === 'reset-demo') {
    resetDemo();
    return;
  }
  if (action === 'brand-preview') {
    showBrandPreview(actionButton);
    return;
  }
  if (action === 'close-brand-preview') {
    closeBrandPreview();
    return;
  }
  if (action === 'select-brand-theme') {
    brandPreviewThemeId = actionButton.dataset.brandTheme || 'meadow';
    renderBrandPreview();
    return;
  }
  if (action === 'save-brand-kit') {
    saveBrandKitDirection();
    return;
  }
  if (action === 'copy-brand-profile') {
    copyBrandProfile();
    return;
  }
  if (action === 'notifications') showToast('You’re all caught up.');
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
  if (event.target.id === 'chat-form') handleChatSubmit(event.target);
}

function handleChange(event) {
  if (event.target.matches('[data-document-input]')) {
    const file = event.target.files?.[0];
    if (file) applyDocumentFile(event.target.dataset.documentInput, file);
    return;
  }
  if (!event.target.matches('[data-language-select]')) return;
  state.language = event.target.value;
  if (state.draft) state.draft.language = state.language;
  saveState();
  syncLanguageControls();
  const activeScreen = document.querySelector('.screen.is-active')?.dataset.screen;
  if (activeScreen === 'register') renderRegistration();
  if (activeScreen === 'dashboard') renderDashboard();
  showToast(`Language set to ${languageLabel(state.language)}.`);
}

function handleHashChange() {
  const route = window.location.hash.slice(1);
  navigate(validRoutes.has(route) ? route : 'landing', false);
}

function handleKeydown(event) {
  if (event.key !== 'Escape') return;
  if (timelineModal && !timelineModal.hidden) closeApplicationTimeline();
  if (brandModal && !brandModal.hidden) closeBrandPreview();
  if (guideModal && !guideModal.hidden) closeRegistrationGuide();
  if (accountPopover && !accountPopover.hidden) closeAccountMenu();
}

document.addEventListener('click', handleClick);
document.addEventListener('submit', handleSubmit);
document.addEventListener('change', handleChange);
document.addEventListener('keydown', handleKeydown);
window.addEventListener('hashchange', handleHashChange);

const initialRoute = window.location.hash.slice(1);
observeLandingSections();
navigate(validRoutes.has(initialRoute) ? initialRoute : 'landing', false);

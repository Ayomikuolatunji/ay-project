import {
  checkBusinessNameAvailability,
  createBrandAssets,
  createBrandKit,
  createRegistrationDraft,
  getApplicationTimeline,
  getLocalizedCopy,
  getNextApplicationStage,
  getRegistrationGuidance,
  getRegistrationProgress,
  getRegulAIReply,
  isValidEmail,
  normalizeBusinessName,
  validateRegistrationDetails,
  verifyDocumentReadiness,
} from './app-core.js';

const STORAGE_KEY = 'regulai-client-prototype-v1';
const validRoutes = new Set(['landing', 'login', 'register', 'dashboard', 'admin']);
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
  notifications: [],
};

let state = loadState();
let toastTimeout;
let brandPreviewTrigger = null;
let brandPreviewThemeId = 'meadow';
let brandPreviewOutput = 'logo';
let timelineTrigger = null;
let guideTrigger = null;
let accountMenuTrigger = null;
let notificationTrigger = null;

const screens = [...document.querySelectorAll('[data-screen]')];
const toast = document.querySelector('#toast');
const brandModal = document.querySelector('#brand-modal');
const timelineModal = document.querySelector('#timeline-modal');
const guideModal = document.querySelector('#guide-modal');
const accountPopover = document.querySelector('#account-popover');
const notificationsModal = document.querySelector('#notifications-modal');
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

function addNotification(title, message, type = 'info') {
  state.notifications ||= [];
  const duplicate = state.notifications.some((notification) => notification.title === title && notification.message === message);
  if (duplicate) return;
  state.notifications.unshift({
    id: `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  });
  state.notifications = state.notifications.slice(0, 8);
  saveState();
}

function seedDemoNotifications() {
  if (state.notifications?.length) return;
  state.notifications = [
    {
      id: 'demo-welcome',
      title: 'Demo workspace ready',
      message: 'Your saved application, tracker, and starter brand assets are available in this browser.',
      type: 'info',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ];
  saveState();
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

function activeBrandAssets(themeId = state.draft?.brandKit?.themeId || state.brandKit?.themeId || 'meadow') {
  if (state.draft?.stage === 'registered') ensureRegisteredDetails();
  return createBrandAssets({
    businessName: state.draft?.businessName || 'Ayo’s Table',
    description: state.draft?.description || 'Warm meals. Good company.',
    serviceList: state.draft?.serviceList || '',
    contactEmail: state.draft?.contactEmail || '',
    contactPhone: state.draft?.contactPhone || '',
    registrationNumber: state.draft?.registrationNumber || '',
    themeId,
  });
}

function paintSwatches(selector, colors) {
  document.querySelectorAll(selector).forEach((swatch, index) => {
    swatch.style.backgroundColor = colors[index] || '';
  });
}

function renderDashboardBrandKit() {
  const kit = activeBrandAssets().brand;
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
  const assets = activeBrandAssets(brandPreviewThemeId);
  const kit = assets.brand;
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
  document.querySelectorAll('[data-action="select-brand-output"]').forEach((button) => {
    const isSelected = button.dataset.brandOutput === brandPreviewOutput;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });

  const logoOutput = document.querySelector('#brand-logo-output');
  const profileOutput = document.querySelector('#brand-profile-output');
  const landingOutput = document.querySelector('#brand-landing-output');
  if (logoOutput) logoOutput.hidden = brandPreviewOutput !== 'logo';
  if (profileOutput) profileOutput.hidden = brandPreviewOutput !== 'profile';
  if (landingOutput) landingOutput.hidden = brandPreviewOutput !== 'landing';
  if (profileOutput) {
    setText('#brand-profile-name', assets.profile.businessName);
    setText('#brand-profile-registration', assets.profile.registrationNumber);
    setText('#brand-profile-about', assets.profile.about);
    setText('#brand-profile-email', assets.profile.contactEmail);
    setText('#brand-profile-phone', assets.profile.contactPhone);
    const services = document.querySelector('#brand-profile-services');
    if (services) services.innerHTML = assets.profile.services.map((service) => `<li>${escapeHtml(service)}</li>`).join('');
  }
  if (landingOutput) {
    setText('#brand-landing-name', assets.landing.businessName);
    setText('#brand-landing-tagline', assets.landing.tagline);
    setText('#brand-landing-about', assets.landing.about);
    setText('#brand-landing-email', assets.landing.contactEmail);
    setText('#brand-landing-phone', assets.landing.contactPhone);
    const services = document.querySelector('#brand-landing-services');
    if (services) services.innerHTML = assets.landing.services.map((service) => `<span>${escapeHtml(service)}</span>`).join('');
  }
}

function showBrandPreview(trigger = null, output = 'logo') {
  if (!brandModal) return;
  brandPreviewTrigger = trigger;
  brandPreviewThemeId = activeBrandAssets(state.draft?.brandKit?.themeId || state.brandKit?.themeId || 'meadow').brand.theme.id;
  brandPreviewOutput = output;
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
  const assets = activeBrandAssets(brandPreviewThemeId);
  const profile = [
    assets.profile.businessName,
    assets.profile.registrationNumber,
    '',
    `About: ${assets.profile.about}`,
    `Services: ${assets.profile.services.join(', ')}`,
    `Contact: ${assets.profile.contactEmail} · ${assets.profile.contactPhone}`,
  ].join('\n');
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

function renderNotifications() {
  const list = document.querySelector('#notifications-list');
  if (!list) return;
  const notifications = state.notifications || [];
  list.innerHTML = notifications.length
    ? notifications.map((notification) => `<article class="notification-item ${notification.read ? 'is-read' : ''}">
        <span class="notification-dot notification-dot-${escapeHtml(notification.type || 'info')}" aria-hidden="true"></span>
        <div><strong>${escapeHtml(notification.title)}</strong><p>${escapeHtml(notification.message)}</p><small>Local demo update</small></div>
      </article>`).join('')
    : '<p class="empty-state">No updates yet. Your application activity will appear here.</p>';
  state.notifications = notifications.map((notification) => ({ ...notification, read: true }));
  saveState();
  document.querySelector('#notification-count')?.setAttribute('hidden', '');
}

function showNotifications(trigger = null) {
  if (!notificationsModal) return;
  notificationTrigger = trigger;
  renderNotifications();
  notificationsModal.hidden = false;
  document.body.classList.add('timeline-modal-open');
  notificationsModal.querySelector('.timeline-modal-close')?.focus();
}

function closeNotifications() {
  if (!notificationsModal || notificationsModal.hidden) return;
  notificationsModal.hidden = true;
  document.body.classList.remove('timeline-modal-open');
  notificationTrigger?.focus();
  notificationTrigger = null;
}

function renderRegistrationGuide() {
  const guidance = getRegistrationGuidance(state.registrationStep);
  const registrationCopy = getLocalizedCopy(state.language).registration[state.registrationStep];
  setText('#guide-modal-eyebrow', registrationCopy?.eyebrow || guidance.eyebrow);
  setText('#guide-modal-title', registrationCopy?.heading || guidance.title);
  setText('#guide-modal-intro', registrationCopy?.intro || guidance.intro);
  setText('#guide-modal-footer-copy', registrationCopy?.note || guidance.footer);
  const list = document.querySelector('#guide-modal-list');
  if (!list) return;

  const guideItems = registrationCopy?.items || guidance.items;
  list.innerHTML = guideItems.map((item, index) => `<div class="guide-item">
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
  syncAccountMenuState(true);
  accountPopover.querySelector('[data-action="reset-demo"]')?.focus();
}

function closeAccountMenu() {
  if (!accountPopover || accountPopover.hidden) return;
  accountPopover.hidden = true;
  syncAccountMenuState(false);
  accountMenuTrigger?.focus();
  accountMenuTrigger = null;
}

function syncAccountMenuState(open) {
  document.querySelectorAll('[data-action="account-menu"]').forEach((button) => {
    button.setAttribute('aria-expanded', String(open));
  });
}

function getFocusableElements(container) {
  return [...container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.disabled && element.getClientRects().length > 0);
}

function trapDialogFocus(container, event) {
  if (!container || container.hidden || event.key !== 'Tab') return;

  const focusable = getFocusableElements(container);
  if (!focusable.length) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!container.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function trapOpenDialogFocus(event) {
  const openDialog = [accountPopover, brandModal, timelineModal, guideModal, notificationsModal]
    .find((dialog) => dialog && !dialog.hidden);
  trapDialogFocus(openDialog, event);
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
    appendChatMessage(getRegulAIReply(question, state.language));
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
  appendChatMessage(getRegulAIReply(message, state.language));
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
  if (['dashboard', 'admin'].includes(targetRoute) && !state.user) {
    if (window.location.hash !== '#login') history.replaceState(null, '', '#login');
    navigate('login', false);
    showToast('Sign in to open your workspace.');
    return;
  }
  if (accountPopover && !accountPopover.hidden) closeAccountMenu();
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
  if (targetRoute === 'admin') renderAdmin();
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
  const copy = getLocalizedCopy(state.language).registration.data;
  const nameCheck = draft.nameCheck;
  const nameCheckMarkup = nameCheck
    ? `<div class="name-check-result is-${escapeHtml(nameCheck.status)}" role="status"><span>${nameCheck.status === 'available' ? '✓' : '!'}</span><p>${escapeHtml(nameCheck.message)}</p></div>${nameCheck.suggestions?.length ? `<div class="name-suggestions"><span>Try one of these:</span>${nameCheck.suggestions.map((suggestion) => `<button type="button" data-suggested-name="${escapeHtml(suggestion)}">${escapeHtml(suggestion)}</button>`).join('')}</div>` : ''}`
    : `<p class="field-hint">${escapeHtml(copy.checkPrompt)}</p>`;
  return `<div class="flow-stage-heading">
    <div class="eyebrow">${escapeHtml(copy.eyebrow)}</div>
    <h1>${escapeHtml(copy.heading)}</h1>
    <p>${escapeHtml(copy.intro)}</p>
  </div>
  <div class="guide-message"><span class="mini-avatar">R</span><p><strong>RegulAI guide</strong><br />${escapeHtml(copy.guide)}</p></div>
  <form class="flow-form-card" id="business-form" novalidate>
    <div class="form-grid">
      <label class="form-field form-field-wide"><span>${escapeHtml(copy.nameLabel)}</span><div class="input-action-wrap"><input id="business-name" name="businessName" type="text" value="${escapeHtml(draft.businessName || '')}" placeholder="${escapeHtml(copy.namePlaceholder)}" required maxlength="70" /><button type="button" class="field-action" data-action="check-name">${escapeHtml(copy.checkName)}</button></div>${nameCheckMarkup}</label>
      <label class="form-field"><span>${escapeHtml(copy.typeLabel)}</span><select id="business-type" name="businessType"><option${businessType === 'Business Name' ? ' selected' : ''}>Business Name</option><option${businessType === 'Limited Company (Ltd)' ? ' selected' : ''}>Limited Company (Ltd)</option><option${businessType === 'Incorporated Trustee' ? ' selected' : ''}>Incorporated Trustee</option></select></label>
    </div>
    <div class="eyebrow" style="margin-top: 1px;">${escapeHtml(copy.inspiration)}</div>
    <div class="suggestion-row"><button type="button" data-suggested-name="Ayo’s Table">Ayo’s Table</button><button type="button" data-suggested-name="Lush &amp; Local">Lush &amp; Local</button><button type="button" data-suggested-name="Northstar Repairs">Northstar Repairs</button></div>
    <label class="form-field"><span>${escapeHtml(copy.descriptionLabel)}</span><textarea name="description" rows="3" placeholder="${escapeHtml(copy.descriptionPlaceholder)}">${escapeHtml(draft.description || '')}</textarea></label>
    <label class="form-field"><span>${escapeHtml(copy.servicesLabel)}</span><input name="serviceList" type="text" value="${escapeHtml(draft.serviceList || '')}" placeholder="${escapeHtml(copy.servicesPlaceholder)}" /></label>
    <div class="form-grid form-grid-contact"><label class="form-field"><span>${escapeHtml(copy.emailLabel)}</span><input name="contactEmail" type="email" value="${escapeHtml(draft.contactEmail || '')}" placeholder="hello@yourbusiness.com" /></label><label class="form-field"><span>${escapeHtml(copy.phoneLabel)}</span><input name="contactPhone" type="tel" value="${escapeHtml(draft.contactPhone || '')}" placeholder="+234 800 000 0000" /></label></div>
    <p class="field-hint">${escapeHtml(copy.contactHint)}</p>
    <p class="form-error" id="business-error" role="alert"></p>
    <div class="flow-form-actions"><span class="flow-note"><span>✦</span> ${escapeHtml(copy.note)}</span><button class="button button-dark" type="submit">${escapeHtml(copy.continue)} <span aria-hidden="true">↗</span></button></div>
  </form>`;
}

function renderDocumentsStep() {
  const draft = state.draft || createRegistrationDraft();
  const copy = getLocalizedCopy(state.language).registration.documents;
  const documents = draft.documents || {};
  const documentFiles = draft.documentFiles || {};
  const documentErrors = draft.documentErrors || {};
  const documentResults = draft.documentResults || {};
  return `<div class="flow-stage-heading">
    <div class="eyebrow">${escapeHtml(copy.eyebrow)}</div>
    <h1>${escapeHtml(copy.heading)}</h1>
    <p>${escapeHtml(copy.intro)}</p>
  </div>
  <div class="guide-message"><span class="mini-avatar">R</span><p><strong>RegulAI guide</strong><br />${escapeHtml(copy.guide)}</p></div>
  <form class="flow-form-card" id="document-form">
    <div class="document-list">
      ${renderDocumentRow('identity', '▤', copy.identityTitle, copy.identityDescription, documents.identity, documentFiles.identity, documentErrors.identity, documentResults.identity, 'application/pdf,image/jpeg,image/png', copy)}
      ${renderDocumentRow('passport', '◉', copy.passportTitle, copy.passportDescription, documents.passport, documentFiles.passport, documentErrors.passport, documentResults.passport, 'image/jpeg,image/png', copy)}
    </div>
    <p class="form-error" id="document-error" role="alert"></p>
    <div class="flow-form-actions"><button class="button button-quiet" type="button" data-action="previous-step">← ${escapeHtml(copy.back)}</button><button class="button button-dark" type="submit">${escapeHtml(copy.continue)} <span aria-hidden="true">↗</span></button></div>
  </form>`;
}

function renderDocumentRow(id, icon, title, description, status = 'pending', file = null, error = '', result = null, accept = '', copy = {}) {
  const passed = status === 'passed';
  const flagged = status === 'flagged' || status === 'failed';
  const statusLabel = passed ? (copy.ready || 'Ready') : flagged ? (copy.flagged || 'Review needed') : (copy.pending || 'Pending');
  const fileLabel = file?.name
    ? `${escapeHtml(file.name)}${Number(file.size) > 0 ? ` · ${formatFileSize(file.size)}` : ''}`
    : escapeHtml(description);
  const resultLabel = result?.confidence ? `Demo OCR confidence ${Math.round(result.confidence * 100)}%` : '';
  return `<div class="document-row ${flagged ? 'has-error' : ''}">
    <span class="document-icon" aria-hidden="true">${icon}</span>
    <div class="document-copy"><strong>${title}</strong><span>${fileLabel}</span>${error ? `<small class="document-error" role="alert">${escapeHtml(error)}</small>` : ''}</div>
    <span class="document-status ${passed ? 'is-passed' : ''} ${flagged ? 'is-failed' : ''}"><i></i>${statusLabel}</span>
    ${resultLabel ? `<small class="document-result">${resultLabel}</small>` : ''}
    <div class="document-actions"><label class="upload-button" for="${id}-file">${file ? (copy.replace || 'Replace file') : (copy.choose || 'Choose file')}</label><input class="document-file-input" id="${id}-file" type="file" data-document-input="${id}" accept="${accept}" /><button class="demo-file-button" type="button" data-action="mock-upload" data-document="${id}">${copy.demo || 'Use demo file'}</button></div>
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
  state.draft.documentResults ||= {};
  state.draft.documentResults.identity ??= null;
  state.draft.documentResults.passport ??= null;
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
  const result = verifyDocumentReadiness({ documentType, ...metadata });
  state.draft.documentFiles[documentType] = metadata;
  state.draft.documents[documentType] = result.status;
  state.draft.documentErrors[documentType] = result.status === 'passed' ? '' : result.message;
  state.draft.documentResults[documentType] = result;
  saveState();
  renderRegistration();
  showToast(result.status === 'passed' ? `${metadata.name} checked and marked ready.` : result.message);
}

function renderPaymentStep() {
  const draft = state.draft || {};
  const copy = getLocalizedCopy(state.language).registration.payment;
  const paymentError = draft.paymentError ? `<div class="payment-error" role="alert"><strong>Payment was not completed.</strong><span>${escapeHtml(draft.paymentError)}</span></div>` : '';
  return `<div class="flow-stage-heading">
    <div class="eyebrow">${escapeHtml(copy.eyebrow)}</div>
    <h1>${escapeHtml(copy.heading)}</h1>
    <p>${escapeHtml(copy.intro)}</p>
  </div>
  <div class="guide-message"><span class="mini-avatar">R</span><p><strong>RegulAI guide</strong><br />${escapeHtml(copy.guide)}</p></div>
  <form class="flow-form-card" id="payment-form">
    <div class="review-grid"><div class="review-item"><span>Business name</span><strong>${escapeHtml(draft.businessName || 'Your business')}</strong></div><div class="review-item"><span>Registration type</span><strong>${escapeHtml(draft.businessType || 'Business Name')}</strong></div><div class="review-item review-item-wide"><span>What the business does</span><strong>${escapeHtml(draft.description || 'Description to be confirmed')}</strong></div><div class="review-item"><span>Documents</span><strong>2 files · quality checked</strong></div><div class="review-item"><span>Preferred language</span><strong>${languageLabel(state.language)}</strong></div></div>
    <div class="payment-summary"><div><span>${escapeHtml(copy.fee)}</span><strong>₦25,000</strong></div><small>${escapeHtml(copy.sandbox)}</small></div>
    ${paymentError}
    <div class="flow-form-actions"><button class="button button-quiet" type="button" data-action="previous-step">← ${escapeHtml(copy.back)}</button><div class="payment-actions"><button class="button button-quiet" type="submit" name="paymentOutcome" value="failed">${escapeHtml(copy.retry)}</button><button class="button button-dark" type="submit" name="paymentOutcome" value="success">${escapeHtml(copy.submit)} <span aria-hidden="true">↗</span></button></div></div>
  </form>`;
}

function languageLabel(language) {
  return ({ en: 'English', yo: 'Yorùbá', ha: 'Hausa', ig: 'Igbo' })[language] || 'English';
}

function trackerStage(stage) {
  if (stage === 'documents') return 'data';
  return stage || 'data';
}

function demoNumber(prefix, value) {
  const hash = String(value || 'regulai').split('').reduce((total, character) => ((total * 31) + character.charCodeAt(0)) % 10_000_000, 0);
  return `${prefix}-${String(hash).padStart(7, '0')}`;
}

function ensureRegisteredDetails() {
  if (!state.draft) return;
  state.draft.registrationNumber ||= demoNumber('BN', state.draft.businessName);
  state.draft.tinNumber ||= demoNumber('TIN', `${state.draft.businessName}-tin`);
  state.draft.registeredAt ||= new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderCertificateCard() {
  const card = document.querySelector('#certificate-card');
  const draft = state.draft;
  if (!card) return;
  const isRegistered = draft?.stage === 'registered';
  card.hidden = !isRegistered;
  if (!isRegistered) return;
  ensureRegisteredDetails();
  setText('#certificate-business-name', draft.businessName || 'Your business');
  setText('#certificate-number', draft.registrationNumber);
  setText('#certificate-tin', draft.tinNumber);
  setText('#certificate-date', draft.registeredAt);
}

function advanceDemoStatus() {
  if (!state.draft) return;
  const currentStage = trackerStage(state.draft.stage);
  const nextStage = getNextApplicationStage(currentStage);
  if (nextStage === currentStage || currentStage === 'data') {
    showToast('Complete the registration and mock payment before advancing the demo status.');
    return;
  }

  state.draft.stage = nextStage;
  if (nextStage === 'waiting') {
    addNotification('Application is waiting for CAC', 'The demo verification step is complete. Your application is now waiting for CAC.', 'info');
  }
  if (nextStage === 'registered') {
    ensureRegisteredDetails();
    addNotification('Registration marked complete', 'Your demo certificate and TIN are ready to view in the workspace.', 'success');
  }
  saveState();
  renderDashboard();
  showToast(nextStage === 'registered' ? 'Demo registration completed.' : 'Demo status advanced to Waiting for CAC.');
}

function downloadTextFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCertificate() {
  if (!state.draft) return;
  ensureRegisteredDetails();
  const content = [
    'REGULAI DEMO CERTIFICATE SUMMARY',
    '',
    `Business name: ${state.draft.businessName}`,
    `Registration number: ${state.draft.registrationNumber}`,
    `TIN: ${state.draft.tinNumber}`,
    `Date registered: ${state.draft.registeredAt}`,
    '',
    'This is a client-only demonstration record and not an official CAC certificate.',
  ].join('\n');
  downloadTextFile('regulai-demo-certificate.txt', content);
  showToast('Demo certificate summary downloaded.');
}

function downloadBrandProfile() {
  const assets = activeBrandAssets(brandPreviewThemeId);
  const content = [
    'COMPANY PROFILE · REGULAI DEMO',
    '',
    `Business name: ${assets.profile.businessName}`,
    `Registration number: ${assets.profile.registrationNumber}`,
    '',
    `About us: ${assets.profile.about}`,
    `Products / services: ${assets.profile.services.join(', ')}`,
    `Contact: ${assets.profile.contactEmail} · ${assets.profile.contactPhone}`,
    '',
    'Generated locally from the registration details in this prototype.',
  ].join('\n');
  downloadTextFile(`${assets.profile.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-company-profile.txt`, content);
  showToast('Company profile downloaded.');
}

function downloadBrandLandingPage() {
  const assets = activeBrandAssets(brandPreviewThemeId);
  const serviceMarkup = assets.landing.services.map((service) => `<li>${escapeHtml(service)}</li>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(assets.landing.businessName)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:48px;color:#132b29}header{border-bottom:3px solid ${assets.landing.theme.accent};padding-bottom:24px}h1{font-size:48px;margin:16px 0 8px}em{color:${assets.landing.theme.secondary}}section{padding:32px 0}li{margin:10px 0}footer{padding-top:24px;border-top:1px solid #d5ddd2;color:#526b62}</style></head><body><header><strong>${escapeHtml(assets.landing.businessName)}</strong><h1>${escapeHtml(assets.landing.tagline)}</h1><p>${escapeHtml(assets.landing.about)}</p></header><section><h2>What we offer</h2><ul>${serviceMarkup}</ul></section><footer>${escapeHtml(assets.landing.contactEmail)} · ${escapeHtml(assets.landing.contactPhone)}</footer></body></html>`;
  downloadTextFile(`${assets.landing.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-landing-page.html`, html, 'text/html');
  showToast('Landing-page template downloaded.');
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
  setText('#dashboard-status-label', draft?.stage === 'registered' ? copy.tracker.registered : copy.dashboard.applicationInProgress);
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
  const unreadNotifications = (state.notifications || []).filter((notification) => !notification.read).length;
  const notificationCount = document.querySelector('#notification-count');
  if (notificationCount) {
    notificationCount.textContent = String(unreadNotifications);
    notificationCount.hidden = unreadNotifications === 0;
  }
  const advanceStatusButton = document.querySelector('[data-action="advance-status"]');
  if (advanceStatusButton) {
    const canAdvance = ['verifying', 'waiting'].includes(draft?.stage);
    advanceStatusButton.hidden = !canAdvance;
    advanceStatusButton.querySelector('[data-advance-status-label]')?.replaceChildren(document.createTextNode(draft?.stage === 'waiting' ? 'Mark as registered' : 'Advance demo status'));
  }
  document.querySelector('#status-tracker').innerHTML = timeline.map((item, index) => {
    const done = item.status === 'complete';
    const active = item.status === 'current';
    return `<div class="tracker-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}"><span class="tracker-step-marker">${done ? '✓' : index + 1}</span><span>${copy.tracker[item.id] || item.label}</span></div>`;
  }).join('');
  renderDashboardBrandKit();
  renderCertificateCard();
  resetGuideChat();
}

function renderAdmin() {
  const draft = state.draft;
  const tableBody = document.querySelector('#admin-application-list');
  const status = draft?.adminStatus === 'query' ? 'Query raised' : draft?.adminStatus === 'resubmitted' ? 'Resubmitted' : draft?.stage === 'registered' ? 'Registered' : 'In progress';
  const documents = draft?.documents || {};
  const flagged = draft?.adminStatus === 'query' || Object.values(documents).includes('flagged');
  const documentsReady = ['identity', 'passport'].every((documentType) => documents[documentType] === 'passed');
  setText('#admin-applicant-name', state.user?.name || 'Demo applicant');
  setText('#admin-active-count', draft ? '1' : '0');
  setText('#admin-flagged-count', flagged ? '1' : '0');
  setText('#admin-status-count', status);
  setText('#admin-status-note', draft ? `${draft.businessName || 'Unnamed business'} · ${status}` : 'No demo application yet');
  if (!tableBody) return;

  if (!draft) {
    tableBody.innerHTML = '<tr><td colspan="5" class="empty-table">Open the demo account and start a registration to populate this view.</td></tr>';
    return;
  }

  const documentStatus = flagged ? 'Flagged for review' : documentsReady ? 'Passed' : 'Awaiting documents';
  const action = flagged
    ? '<button type="button" class="table-action" data-action="admin-mark-resubmitted">Mark resubmitted</button>'
    : documentsReady
      ? '<button type="button" class="table-action" data-action="admin-request-resubmission">Request resubmission</button>'
      : '<span class="table-action-muted">Waiting for both files</span>';
  tableBody.innerHTML = `<tr><td><strong>${escapeHtml(draft.businessName || 'Unnamed business')}</strong><small>${escapeHtml(state.user?.email || 'demo@regulai.local')}</small></td><td>${escapeHtml(status)}</td><td><span class="admin-document-state ${flagged ? 'is-flagged' : 'is-passed'}"><i></i>${documentStatus}</span></td><td>${draft.stage === 'registered' ? 'Ready' : 'Awaiting next step'}</td><td>${action}</td></tr>`;
}

function adminRequestResubmission() {
  if (!state.draft) return;
  ensureDocumentState();
  state.draft.adminStatus = 'query';
  state.draft.documents.passport = 'flagged';
  state.draft.documentErrors.passport = 'Admin demo query: upload a brighter passport photograph.';
  state.draft.documentResults.passport = { status: 'flagged', confidence: 0.42, extractedFields: {}, message: state.draft.documentErrors.passport };
  addNotification('Action needed: passport photo', 'The demo reviewer requested a clearer passport photograph before filing.', 'warning');
  saveState();
  renderAdmin();
  showToast('Demo resubmission request created.');
}

function adminMarkResubmitted() {
  if (!state.draft) return;
  ensureDocumentState();
  state.draft.adminStatus = 'resubmitted';
  state.draft.documents.passport = 'passed';
  state.draft.documentErrors.passport = '';
  state.draft.documentFiles.passport = demoDocumentFiles.passport;
  state.draft.documentResults.passport = verifyDocumentReadiness({ documentType: 'passport', ...demoDocumentFiles.passport });
  addNotification('Document resubmitted', 'The demo passport photograph passed the follow-up readiness check.', 'success');
  saveState();
  renderAdmin();
  showToast('Demo document marked as resubmitted.');
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

function readBusinessDetails(form) {
  const data = new FormData(form);
  return {
    businessName: normalizeBusinessName(data.get('businessName')),
    businessType: String(data.get('businessType') || ''),
    description: String(data.get('description') || '').trim(),
    serviceList: String(data.get('serviceList') || '').trim(),
    contactEmail: String(data.get('contactEmail') || '').trim(),
    contactPhone: String(data.get('contactPhone') || '').trim(),
  };
}

function updateBusinessDraft(details, nameCheck) {
  const previousName = state.draft?.businessName;
  const existingDraft = state.draft || createRegistrationDraft({ ...details, language: state.language });
  state.draft = {
    ...existingDraft,
    ...details,
    businessName: normalizeBusinessName(details.businessName),
    businessType: normalizeBusinessName(details.businessType) || 'Business Name',
    description: normalizeBusinessName(details.description),
    serviceList: normalizeBusinessName(details.serviceList),
    contactEmail: normalizeBusinessName(details.contactEmail),
    contactPhone: normalizeBusinessName(details.contactPhone),
    language: state.language,
    nameCheck,
  };
  if (previousName && previousName !== state.draft.businessName) {
    state.draft.registrationNumber = '';
    state.draft.tinNumber = '';
    state.draft.registeredAt = '';
  }
  return state.draft;
}

function handleBusinessSubmit(form) {
  const details = readBusinessDetails(form);
  const { businessName, businessType } = details;
  const errors = validateRegistrationDetails({ businessName, businessType });
  if (Object.keys(errors).length > 0) {
    setError('#business-error', Object.values(errors)[0]);
    document.querySelector(errors.businessName ? '#business-name' : '#business-type')?.focus();
    showToast(Object.values(errors)[0]);
    return;
  }

  const nameCheck = checkBusinessNameAvailability(businessName);
  if (nameCheck.status !== 'available') {
    setError('#business-error', nameCheck.message);
    updateBusinessDraft(details, nameCheck);
    saveState();
    renderRegistration();
    document.querySelector('#business-name')?.focus();
    showToast(nameCheck.message);
    return;
  }

  updateBusinessDraft(details, nameCheck);
  state.draft.stage = 'documents';
  state.registrationStep = 'documents';
  ensureUser();
  saveState();
  renderRegistration();
  showToast('Business details saved. Next: document readiness.');
}

function handleNameCheck() {
  const form = document.querySelector('#business-form');
  const input = document.querySelector('#business-name');
  const details = form ? readBusinessDetails(form) : { businessName: normalizeBusinessName(input?.value || '') };
  const result = checkBusinessNameAvailability(details.businessName);
  updateBusinessDraft(details, result);
  saveState();
  renderRegistration();
  document.querySelector('#business-name')?.focus();
}

function handleDocumentSubmit() {
  const documents = state.draft?.documents || {};
  if (documents.identity !== 'passed' || documents.passport !== 'passed') {
    setError('#document-error', 'Choose a valid file or use a demo file for both documents before continuing.');
    return;
  }

  state.draft.stage = 'payment';
  state.registrationStep = 'payment';
  addNotification('Documents passed the demo check', 'Both uploaded files are ready for the sandbox payment step.', 'success');
  saveState();
  renderRegistration();
  showToast('Documents checked. Review the filing step.');
}

function handlePaymentSubmit(outcome = 'success') {
  ensureUser();
  if (outcome === 'failed') {
    state.draft.payment = 'failed';
    state.draft.paymentError = 'The sandbox declined this demo attempt. Choose Pay & queue application to retry.';
    addNotification('Payment needs another try', 'The simulated payment was declined. Your application is still saved.', 'warning');
    saveState();
    renderRegistration();
    showToast('Sandbox payment declined. You can retry.');
    return;
  }
  state.draft.payment = 'paid';
  state.draft.paymentError = '';
  state.draft.stage = 'verifying';
  state.registrationStep = 'data';
  addNotification('Verification started', 'Your mock payment was accepted and the application is now in verification.', 'success');
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
  seedDemoNotifications();
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
  seedDemoNotifications();
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
    const suggestedName = normalizeBusinessName(suggestion.dataset.suggestedName);
    const form = document.querySelector('#business-form');
    const details = form ? readBusinessDetails(form) : { businessName: suggestedName };
    details.businessName = suggestedName;
    updateBusinessDraft(details, checkBusinessNameAvailability(suggestedName));
    saveState();
    renderRegistration();
    document.querySelector('#business-name')?.focus();
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const action = actionButton.dataset.action;

  if (action === 'mock-upload') {
    applyDocumentFile(actionButton.dataset.document, demoDocumentFiles[actionButton.dataset.document]);
    return;
  }

  if (action === 'check-name') {
    handleNameCheck();
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
  if (action === 'notifications') {
    showNotifications(actionButton);
    return;
  }
  if (action === 'close-notifications') {
    closeNotifications();
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
  if (action === 'open-brand-output') {
    showBrandPreview(actionButton, actionButton.dataset.brandOutput || 'logo');
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
  if (action === 'select-brand-output') {
    brandPreviewOutput = actionButton.dataset.brandOutput || 'logo';
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
  if (action === 'download-certificate') downloadCertificate();
  if (action === 'download-brand-profile') downloadBrandProfile();
  if (action === 'download-brand-landing') downloadBrandLandingPage();
  if (action === 'advance-status') advanceDemoStatus();
  if (action === 'admin-request-resubmission') adminRequestResubmission();
  if (action === 'admin-mark-resubmitted') adminMarkResubmitted();
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
  if (event.target.id === 'payment-form') handlePaymentSubmit(event.submitter?.value || 'success');
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
  if (event.key === 'Tab') {
    trapOpenDialogFocus(event);
    return;
  }
  if (event.key !== 'Escape') return;
  if (timelineModal && !timelineModal.hidden) closeApplicationTimeline();
  if (notificationsModal && !notificationsModal.hidden) closeNotifications();
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

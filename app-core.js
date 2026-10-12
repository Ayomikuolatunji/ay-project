export function normalizeBusinessName(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const brandKitThemes = {
  meadow: {
    id: 'meadow',
    label: 'Meadow studio',
    background: '#132b29',
    accent: '#d2f26b',
    secondary: '#f18e66',
    surface: '#f4f5ef',
    muted: '#6c8d83',
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset studio',
    background: '#3b2630',
    accent: '#ffd089',
    secondary: '#ee785e',
    surface: '#fff0e7',
    muted: '#a46d72',
  },
  indigo: {
    id: 'indigo',
    label: 'Indigo studio',
    background: '#27254e',
    accent: '#d9d4ff',
    secondary: '#f0a06d',
    surface: '#f4f2ff',
    muted: '#8b86bc',
  },
};

function getBrandKitTheme(themeId = 'meadow') {
  return brandKitThemes[themeId] || brandKitThemes.meadow;
}

export function createBrandKit({ businessName = '', description = '', themeId = 'meadow' } = {}) {
  const normalizedName = normalizeBusinessName(businessName) || 'Your business';
  const nameWords = normalizedName
    .replace(/[^A-Za-z0-9À-ÿ'\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
  const initials = (nameWords.slice(0, 2).map((word) => word[0]).join('') || 'YB').toUpperCase();
  const firstSentence = normalizeBusinessName(description).split(/[.!?]/)[0].trim();
  const descriptor = firstSentence.slice(0, 72).trim() || 'Made to move your business forward';

  return {
    businessName: normalizedName,
    initials,
    descriptor,
    theme: getBrandKitTheme(themeId),
  };
}

export function createRegistrationDraft({
  businessName = '',
  businessType = 'Business Name',
  description = '',
  language = 'en',
} = {}) {
  return {
    id: `reg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    businessName: normalizeBusinessName(businessName),
    businessType: normalizeBusinessName(businessType) || 'Business Name',
    description: normalizeBusinessName(description),
    language,
    stage: 'data',
    documents: {
      identity: 'pending',
      passport: 'pending',
    },
    documentFiles: {
      identity: null,
      passport: null,
    },
    documentErrors: {
      identity: '',
      passport: '',
    },
    brandKit: {
      themeId: 'meadow',
    },
    payment: 'pending',
  };
}

export function validateDocumentFile({
  documentType = 'identity',
  name = '',
  mimeType = '',
  size = 0,
} = {}) {
  const normalizedName = String(name ?? '').toLowerCase();
  const normalizedMimeType = String(mimeType ?? '').toLowerCase();
  const isPassport = documentType === 'passport';
  const allowedMimeTypes = isPassport
    ? new Set(['image/jpeg', 'image/png'])
    : new Set(['application/pdf', 'image/jpeg', 'image/png']);
  const allowedExtensions = isPassport ? /\.(jpe?g|png)$/ : /\.(pdf|jpe?g|png)$/;

  if (!name || !allowedMimeTypes.has(normalizedMimeType) || !allowedExtensions.test(normalizedName)) {
    return {
      valid: false,
      message: isPassport
        ? 'Use a JPG or PNG image for the passport photograph.'
        : 'Use a PDF, JPG, or PNG file for the identity document.',
    };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { valid: false, message: 'Choose a non-empty file before continuing.' };
  }
  if (size > 5 * 1024 * 1024) {
    return { valid: false, message: 'Keep each document under 5 MB.' };
  }

  return { valid: true, message: 'File looks ready.' };
}

export function validateRegistrationDetails({ businessName = '', businessType = '' } = {}) {
  const errors = {};
  const validBusinessTypes = new Set(['Business Name', 'Limited Company (Ltd)', 'Incorporated Trustee']);

  if (!normalizeBusinessName(businessName)) {
    errors.businessName = 'Add a business name or idea to continue.';
  }
  if (!validBusinessTypes.has(businessType)) {
    errors.businessType = 'Choose a valid registration type to continue.';
  }

  return errors;
}

export function getRegistrationProgress(stage = 'data') {
  const progressByStage = {
    data: 20,
    documents: 50,
    payment: 75,
    verifying: 85,
    waiting: 92,
    registered: 100,
  };

  return progressByStage[stage] ?? progressByStage.data;
}

export function getRegulAIReply(question = '') {
  const normalizedQuestion = String(question ?? '').toLowerCase();

  if (/(document|identity|passport|upload)/.test(normalizedQuestion)) {
    return 'For this demo, prepare a government-issued identity document and a passport photograph. Use the mock checks to mark both ready.';
  }
  if (/(long|time|when|soon|turnaround)/.test(normalizedQuestion)) {
    return 'Your application moves from business details to document check, payment, and verification. The dashboard shows each stage as it changes.';
  }
  if (/(pay|fee|cost|price|charge)/.test(normalizedQuestion)) {
    return 'This prototype uses a ₦25,000 sandbox filing fee. No real payment is taken.';
  }
  if (/(status|progress|application|where)/.test(normalizedQuestion)) {
    return 'Your workspace tracks data, payment, verification, CAC waiting, and registration in one view.';
  }

  return 'I can help with documents, timing, payment, or your current application status. Try one of those questions.';
}

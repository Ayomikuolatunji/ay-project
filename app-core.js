export function normalizeBusinessName(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

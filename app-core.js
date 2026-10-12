export function normalizeBusinessName(value = '') {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function createRegistrationDraft({ businessName = '', language = 'en' } = {}) {
  return {
    id: `reg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    businessName: normalizeBusinessName(businessName),
    language,
    stage: 'data',
    documents: {
      identity: 'pending',
      passport: 'pending',
    },
    payment: 'pending',
  };
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

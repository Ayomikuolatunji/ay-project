export function normalizeBusinessName(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const localizedCopy = {
  en: {
    dashboard: {
      breadcrumb: 'Workspace / Overview',
      greeting: 'Good morning',
      progressEyebrow: 'Your progress',
      heading: 'Let’s keep things moving.',
      subheading: 'Here’s where your business stands today.',
      continueRegistration: 'Continue registration',
      applicationInProgress: 'Application in progress',
      currentProgress: 'Current progress',
      viewTimeline: 'View application timeline',
      alwaysAvailable: 'Always available',
      askRegulai: 'Ask RegulAI',
      online: 'Online',
      afterRegistration: 'After registration',
      brandKit: 'Your brand kit',
      preview: 'Preview',
      startConversation: 'Start a conversation',
      quickDocuments: 'What documents do I need?',
      quickTiming: 'How long does registration take?',
    },
    steps: {
      data: 'Business details',
      documents: 'Document check',
      payment: 'Payment & filing',
    },
    tracker: {
      data: 'Data pending',
      payment: 'Payment',
      verifying: 'Verifying',
      waiting: 'Waiting for CAC',
      registered: 'Registered',
    },
    timeline: {
      current: 'Current stage',
      complete: 'Complete',
      upcoming: 'Up next',
    },
  },
  yo: {
    dashboard: {
      breadcrumb: 'Ibi iṣẹ́ / Àkótán',
      greeting: 'Ẹ káàárọ̀',
      progressEyebrow: 'Ìlọsíwájú rẹ',
      heading: 'Jẹ́ ká máa tẹ̀síwájú.',
      subheading: 'Eyi ni ibi tí iṣẹ́ rẹ wà lónìí.',
      continueRegistration: 'Tẹ̀síwájú ìforúkọsílẹ̀',
      applicationInProgress: 'Ìforúkọsílẹ̀ ń lọ lọwọ',
      currentProgress: 'Ìlọsíwájú báyìí',
      viewTimeline: 'Wo ìtòlẹ́sẹẹsẹ ìforúkọsílẹ̀',
      alwaysAvailable: 'Ó wà nígbà gbogbo',
      askRegulai: 'Béèrè lọ́wọ́ RegulAI',
      online: 'Lórí ayélujára',
      afterRegistration: 'Lẹ́yìn ìforúkọsílẹ̀',
      brandKit: 'Àpò ìdánimọ̀ rẹ',
      preview: 'Àkọ́wò',
      startConversation: 'Bẹ̀rẹ̀ ìjíròrò',
      quickDocuments: 'Àwọn ìwé wo ni mo nílò?',
      quickTiming: 'Igba melo ni ìforúkọsílẹ̀ máa gba?',
    },
    steps: {
      data: 'Àlàyé iṣẹ́',
      documents: 'Àyẹ̀wò ìwé',
      payment: 'Ìsanwó àti fífilẹ̀',
    },
    tracker: {
      data: 'A ń dúró de àlàyé',
      payment: 'Ìsanwó',
      verifying: 'A ń ṣàyẹ̀wò',
      waiting: 'A ń dúró de CAC',
      registered: 'Forúkọsílẹ̀ ti parí',
    },
    timeline: {
      current: 'Ipele lọwọlọwọ',
      complete: 'Ti parí',
      upcoming: 'Ohun tó ń bọ̀',
    },
  },
  ha: {
    dashboard: {
      breadcrumb: 'Wurin aiki / Bayani',
      greeting: 'Ina kwana',
      progressEyebrow: 'Ci gaban ku',
      heading: 'Mu ci gaba da tafiya.',
      subheading: 'Ga inda kasuwancin ku yake a yau.',
      continueRegistration: 'Ci gaba da rajista',
      applicationInProgress: 'Ana kan rajista',
      currentProgress: 'Ci gaba na yanzu',
      viewTimeline: 'Duba jadawalin rajista',
      alwaysAvailable: 'Koyaushe a nan',
      askRegulai: 'Tambayi RegulAI',
      online: 'A kan layi',
      afterRegistration: 'Bayan rajista',
      brandKit: 'Kunshin alamar ku',
      preview: 'Duba',
      startConversation: 'Fara tattaunawa',
      quickDocuments: 'Wadanne takardu nake bukata?',
      quickTiming: 'Yaya tsawon lokacin rajista?',
    },
    steps: {
      data: 'Bayanan kasuwanci',
      documents: 'Duba takardu',
      payment: 'Biya da shigarwa',
    },
    tracker: {
      data: 'Ana jiran bayanai',
      payment: 'Biya',
      verifying: 'Ana tantancewa',
      waiting: 'Ana jiran CAC',
      registered: 'An yi rajista',
    },
    timeline: {
      current: 'Mataki na yanzu',
      complete: 'An kammala',
      upcoming: 'Na gaba',
    },
  },
  ig: {
    dashboard: {
      breadcrumb: 'Ebe ọrụ / Nchịkọta',
      greeting: 'Ụtụtụ ọma',
      progressEyebrow: 'Ọganihu gị',
      heading: 'Ka anyị gaa n’ihu.',
      subheading: 'Nke a bụ ebe azụmahịa gị dị taa.',
      continueRegistration: 'Gaa n’ihu na ndebanye aha',
      applicationInProgress: 'Ndebanye aha na-aga n’ihu',
      currentProgress: 'Ọganihu ugbu a',
      viewTimeline: 'Lee usoro ndebanye aha',
      alwaysAvailable: 'Ọ dị mgbe niile',
      askRegulai: 'Jụọ RegulAI',
      online: 'Ọ nọ n’ịntanetị',
      afterRegistration: 'Mgbe ndebanye aha gachara',
      brandKit: 'Ngwugwu akara gị',
      preview: 'Lee ya',
      startConversation: 'Malite mkparịta ụka',
      quickDocuments: 'Kedu akwụkwọ m chọrọ?',
      quickTiming: 'Ogologo oge ole ka ndebanye aha ga-ewe?',
    },
    steps: {
      data: 'Nkọwa azụmahịa',
      documents: 'Nyocha akwụkwọ',
      payment: 'Ịkwụ ụgwọ na ntinye',
    },
    tracker: {
      data: 'A na-eche data',
      payment: 'Ịkwụ ụgwọ',
      verifying: 'A na-enyocha',
      waiting: 'A na-eche CAC',
      registered: 'E debanyela aha',
    },
    timeline: {
      current: 'Ọkwa ugbu a',
      complete: 'Emechala',
      upcoming: 'Na-abịa',
    },
  },
};

export function getLocalizedCopy(language = 'en') {
  return localizedCopy[language] || localizedCopy.en;
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

const applicationTimeline = [
  {
    id: 'data',
    label: 'Data pending',
    note: 'Your business details are saved. Next is a document check.',
  },
  {
    id: 'payment',
    label: 'Payment',
    note: 'Your documents passed the readiness check. Review the mock filing step next.',
  },
  {
    id: 'verifying',
    label: 'Verifying',
    note: 'Your document check is complete and the application is moving through verification.',
  },
  {
    id: 'waiting',
    label: 'Waiting for CAC',
    note: 'Verification is complete in this prototype. The next step is waiting for CAC.',
  },
  {
    id: 'registered',
    label: 'Registered',
    note: 'The prototype marks this application as registered.',
  },
];

export function getApplicationTimeline(stage = 'data') {
  const normalizedStage = stage === 'documents' ? 'data' : stage;
  const activeIndex = Math.max(0, applicationTimeline.findIndex((item) => item.id === normalizedStage));

  return applicationTimeline.map((item, index) => ({
    ...item,
    status: index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming',
  }));
}

const registrationGuidance = {
  data: {
    id: 'data',
    eyebrow: 'Step 1 of 3 · Business details',
    title: 'Start with the idea, not the paperwork.',
    intro: 'A working name is enough for this first step. You can refine the details before filing.',
    items: [
      { title: 'Name or idea', body: 'Use the name you are considering, even if it is not final yet.' },
      { title: 'Business type', body: 'Choose the structure that best matches how you plan to operate.' },
      { title: 'Plain-language description', body: 'Explain what you sell, make, or help people do.' },
    ],
    footer: 'Your details stay saved in this browser while you work.',
  },
  documents: {
    id: 'documents',
    eyebrow: 'Step 2 of 3 · Document check',
    title: 'Let’s get your documents ready.',
    intro: 'Clear files help avoid back-and-forth. This prototype checks the file type and size before you continue.',
    items: [
      { title: 'Identity document', body: 'Prepare a government-issued identity document such as a National ID, driver’s licence, or passport.' },
      { title: 'Passport photograph', body: 'Use a recent JPG or PNG photo with a plain background.' },
      { title: 'One file at a time', body: 'Choose a file or use a demo file, then wait for the Ready status before reviewing.' },
    ],
    footer: 'Keep each file clear and under 5 MB for this prototype.',
  },
  payment: {
    id: 'payment',
    eyebrow: 'Step 3 of 3 · Payment & filing',
    title: 'Review once, then queue the application.',
    intro: 'Check the summary, confirm the sandbox filing fee, and submit when the details look right.',
    items: [
      { title: 'Review your details', body: 'Make sure the business name, type, and description say what you mean.' },
      { title: 'Sandbox payment', body: 'This demo shows a ₦25,000 filing fee. No real payment is taken.' },
      { title: 'Track what happens next', body: 'After submission, your dashboard shows verification, CAC waiting, and registration stages.' },
    ],
    footer: 'You can return to earlier steps before submitting the mock application.',
  },
};

export function getRegistrationGuidance(step = 'data') {
  return registrationGuidance[step] || registrationGuidance.data;
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

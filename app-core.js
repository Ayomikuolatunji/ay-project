export function normalizeBusinessName(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function cleanPdfFieldValue(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[|]+$/g, '').trim();
}

function readPdfField(lines, labelPatterns = []) {
  const labels = labelPatterns.join('|');
  const inlinePattern = new RegExp(`^\\s*(?:${labels})\\s*(?::|-)\\s*(.+?)\\s*$`, 'i');
  const labelOnlyPattern = new RegExp(`^\\s*(?:${labels})\\s*$`, 'i');
  const labelWithValuePattern = new RegExp(`^\\s*(?:${labels})\\s+(.+?)\\s*$`, 'i');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const inlineMatch = line.match(inlinePattern);
    if (inlineMatch) return cleanPdfFieldValue(inlineMatch[1]);

    if (labelOnlyPattern.test(line)) {
      const nextLine = lines.slice(index + 1).find(Boolean);
      if (nextLine) return cleanPdfFieldValue(nextLine);
    }

    const valueMatch = line.match(labelWithValuePattern);
    if (valueMatch) return cleanPdfFieldValue(valueMatch[1]);
  }

  return '';
}

export function analyzePdfText({ text = '', pageCount = 1 } = {}) {
  const normalizedText = String(text ?? '').replace(/\u00a0/g, ' ').replace(/\r/g, '').trim();
  const parser = 'pdfjs-text';
  const format = 'pdf-text';
  const safePageCount = Number.isInteger(pageCount) && pageCount > 0 ? pageCount : 1;
  const baseResult = {
    parser,
    format,
    pageCount: safePageCount,
    biometricVerification: false,
  };

  if (normalizedText.replace(/\s/g, '').length < 12) {
    return {
      ...baseResult,
      status: 'unsupported',
      confidence: 0,
      extractedFields: {},
      legibility: 'no-text',
      completeness: 'unknown',
      message: 'No selectable text was found. Scanned or image-only PDFs are not supported.',
    };
  }

  const lines = normalizedText.split('\n').map((line) => cleanPdfFieldValue(line)).filter(Boolean);
  const extractedFields = {};
  const fullName = readPdfField(lines, ['full\\s+name', 'name']);
  const dateOfBirth = readPdfField(lines, ['date\\s+of\\s+birth', 'dob', 'birth\\s+date']);
  const documentNumber = readPdfField(lines, ['id\\s+number', 'id\\s+no\\.?', 'document\\s+number', 'nin']);

  if (fullName) extractedFields.fullName = fullName;
  if (dateOfBirth) extractedFields.dateOfBirth = dateOfBirth;
  if (documentNumber) extractedFields.documentNumber = documentNumber;

  const requiredFields = [
    ['fullName', 'full name'],
    ['dateOfBirth', 'date of birth'],
    ['documentNumber', 'ID number'],
  ];
  const missingFields = requiredFields.filter(([field]) => !extractedFields[field]);

  if (missingFields.length) {
    return {
      ...baseResult,
      status: 'flagged',
      confidence: Math.max(0.62, 0.98 - missingFields.length * 0.12),
      extractedFields,
      legibility: 'pass',
      completeness: 'incomplete',
      message: `PDF text was read, but ${missingFields.map(([, label]) => label).join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} missing. Upload a complete text-based PDF.`,
    };
  }

  return {
    ...baseResult,
    status: 'passed',
    confidence: 0.98,
    extractedFields,
    legibility: 'pass',
    completeness: 'complete',
    message: 'PDF text parsed. The required identity fields are ready for review.',
  };
}

const demoBusinessNames = {
  'dangote ventures': {
    status: 'unavailable',
    message: 'This demo name is already registered. Try one of the suggested alternatives.',
    suggestions: ['Dangoti Ventures', 'Dangote Reach Ventures'],
  },
  'zenith traders': {
    status: 'unavailable',
    message: 'This demo name is already registered. Try one of the suggested alternatives.',
    suggestions: ['Zenith Trade Hub', 'Zenith Point Traders'],
  },
  'first bank supplies': {
    status: 'restricted',
    message: 'This demo name contains a restricted word and needs a different direction.',
    suggestions: ['Prime Bank-Street Supplies', 'First Choice Supplies'],
  },
};

export function checkBusinessNameAvailability(value = '') {
  const name = normalizeBusinessName(value);
  if (!name) {
    return {
      status: 'empty',
      name,
      message: 'Enter a business name to check availability.',
      suggestions: [],
    };
  }

  const knownResult = demoBusinessNames[name.toLowerCase()];
  if (knownResult) return { ...knownResult, name };

  return {
    status: 'available',
    name,
    message: 'No conflict found in this demo checker. The name is available to continue.',
    suggestions: [],
  };
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
    registration: {
      data: {
        eyebrow: 'Step 1 of 3 · Business details',
        heading: 'Tell us about the business you’re building.',
        intro: 'You don’t need to know the official language. Start with the idea in your own words and we’ll help shape the application.',
        guide: 'Welcome. What kind of business are you bringing to life?',
        nameLabel: 'Business name or idea',
        namePlaceholder: 'e.g. Ayo’s Table',
        typeLabel: 'Business type',
        inspiration: 'Need inspiration?',
        descriptionLabel: 'What does the business do?',
        descriptionPlaceholder: 'Tell us what you sell, make, or help people do.',
        servicesLabel: 'Products or services (comma-separated)',
        servicesPlaceholder: 'e.g. Natural skincare, wellness consultation',
        emailLabel: 'Business email (optional)',
        phoneLabel: 'Phone number (optional)',
        contactHint: 'Used to personalize your starter brand assets.',
        checkName: 'Check availability',
        checkPrompt: 'Check the demo name checker before continuing.',
        continue: 'Continue to documents',
        note: 'You can change these details later.',
        items: [
          { title: 'Name or idea', body: 'Use the name you are considering, even if it is not final yet.' },
          { title: 'Business type', body: 'Choose the structure that best matches how you plan to operate.' },
          { title: 'Plain-language description', body: 'Explain what you sell, make, or help people do.' },
        ],
      },
      documents: {
        eyebrow: 'Step 2 of 3 · Document check',
        heading: 'Let’s make sure your documents are ready.',
        intro: 'Upload a selectable-text identity PDF. This browser-only demo reads the PDF text directly; it does not scan images or call a backend.',
        guide: 'A text-based PDF keeps the check clear and local. Scanned or image-only PDFs are not supported.',
        verificationNote: 'This client demo parses selectable text from identity PDFs in your browser. Scanned/image-only PDFs are not supported. It does not perform government biometric identity verification.',
        identityTitle: 'Text-based identity PDF',
        identityDescription: 'A selectable-text PDF, not a scanned image',
        passportTitle: 'Passport photograph (separate quality check)',
        passportDescription: 'A recent, clear JPG or PNG photo; it is not parsed as OCR',
        ready: 'Ready',
        processing: 'Reading PDF text',
        flagged: 'Review needed',
        unsupported: 'PDF text required',
        pending: 'Pending',
        choose: 'Choose file',
        replace: 'Replace file',
        demo: 'Use demo file',
        back: 'Back',
        continue: 'Review application',
        note: 'Use a text-based PDF for identity data. Keep each file under 5 MB.',
        items: [
          { title: 'Identity document', body: 'Prepare a government-issued identity document such as a National ID, driver’s licence, or passport.' },
          { title: 'Passport photograph', body: 'Use a recent JPG or PNG photo with a plain background.' },
          { title: 'One file at a time', body: 'Choose a file or use a demo file, then wait for the Ready status before reviewing.' },
        ],
      },
      payment: {
        eyebrow: 'Step 3 of 3 · Payment & filing',
        heading: 'Your application is ready to move.',
        intro: 'Review the details below. In the full system this step connects to a sandbox payment flow before the application enters verification.',
        guide: 'Everything looks ready. Once payment is confirmed, your application moves to the verification queue.',
        fee: 'Mock filing fee',
        sandbox: 'Government charges included · Sandbox payment',
        back: 'Back',
        retry: 'Simulate failed payment',
        submit: 'Pay & queue application',
        note: 'You can return to earlier steps before submitting the mock application.',
        items: [
          { title: 'Review your details', body: 'Make sure the business name, type, and description say what you mean.' },
          { title: 'Sandbox payment', body: 'This demo shows a ₦25,000 filing fee. No real payment is taken.' },
          { title: 'Track what happens next', body: 'After submission, your dashboard shows verification, CAC waiting, and registration stages.' },
        ],
      },
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
    registration: {
      data: {
        eyebrow: 'Igbesẹ 1 ninu 3 · Àlàyé iṣẹ́',
        heading: 'Sọ fún wa nípa iṣẹ́ tí o ń kọ́.',
        intro: 'Bẹ̀rẹ̀ pẹ̀lú èrò rẹ ní àwọn ọ̀rọ̀ tirẹ; a ó ràn ọ́ lọ́wọ́ láti ṣètò ìforúkọsílẹ̀.',
        guide: 'Kí ni irú iṣẹ́ tí o fẹ́ bẹ̀rẹ̀?',
        nameLabel: 'Orúkọ iṣẹ́ tàbí èrò',
        namePlaceholder: 'àpẹẹrẹ Ayo’s Table',
        typeLabel: 'Irú ìforúkọsílẹ̀',
        inspiration: 'Ṣé o nílò àbá?',
        descriptionLabel: 'Kí ni iṣẹ́ náà ń ṣe?',
        descriptionPlaceholder: 'Sọ ohun tí o ń tà, ṣe, tàbí ran ènìyàn lọ́wọ́.',
        servicesLabel: 'Ọjà tàbí iṣẹ́ (pínyà pẹ̀lú koma)',
        servicesPlaceholder: 'àpẹẹrẹ itọju awọ, ìmọ̀ràn ìlera',
        emailLabel: 'Ímeèlì iṣẹ́ (àṣàyàn)',
        phoneLabel: 'Nọ́mbà fóònù (àṣàyàn)',
        contactHint: 'A ó lò ó láti ṣe àdáni àwọn ohun àmì rẹ.',
        checkName: 'Ṣàyẹ̀wò àyè orúkọ',
        checkPrompt: 'Ṣàyẹ̀wò orúkọ nínú àyẹ̀wò àpẹẹrẹ kí o tó tẹ̀síwájú.',
        continue: 'Tẹ̀síwájú sí àwọn ìwé',
        note: 'O lè yí àwọn àlàyé wọ̀nyí padà lẹ́yìn náà.',
        items: [
          { title: 'Orúkọ tàbí èrò', body: 'Lo orúkọ tí o ń ronú sí, bó tilẹ̀ jẹ́ pé kò tíì péye.' },
          { title: 'Irú iṣẹ́', body: 'Yan irú tó bá bí o ṣe fẹ́ ṣiṣẹ́ mu jù.' },
          { title: 'Àlàyé ní èdè rọrùn', body: 'Ṣàlàyé ohun tí o ń tà, ṣe, tàbí ran ènìyàn lọ́wọ́.' },
        ],
      },
      documents: {
        eyebrow: 'Igbesẹ 2 ninu 3 · Àyẹ̀wò ìwé',
        heading: 'Jẹ́ ká rí i pé àwọn ìwé rẹ ti ṣetán.',
        intro: 'Gbé àwọn ẹ̀dà tó mọ́kàn àwọn ìwé tí a nílò sókè. Àpẹẹrẹ yìí máa ṣàyẹ̀wò irú fáìlì, kíkà, àti OCR.',
        guide: 'Ìwé tó mọ́kàn máa dín ìdádúró kù. Yan fáìlì tàbí lo fáìlì àpẹẹrẹ.',
        identityTitle: 'Ìwé ìdánimọ̀ tí ìjọba fún',
        identityDescription: 'NIN, ìwé awakọ̀, tàbí passport',
        passportTitle: 'Fọ́tò passport',
        passportDescription: 'Fọ́tò tuntun tó mọ́kàn pẹ̀lú abẹ́lẹ̀ pẹ̀tẹ́lẹ̀',
        ready: 'Ṣetán',
        flagged: 'Nílò àyẹ̀wò',
        pending: 'Ń dúró',
        choose: 'Yan fáìlì',
        replace: 'Rọ́pò fáìlì',
        demo: 'Lo fáìlì àpẹẹrẹ',
        back: 'Padà',
        continue: 'Ṣàyẹ̀wò ìforúkọsílẹ̀',
        note: 'Jẹ́ kí fáìlì kọọkan mọ́kàn, kó sì kéré sí 5 MB nínú àpẹẹrẹ yìí.',
        items: [
          { title: 'Ìwé ìdánimọ̀ tí ìjọba fún', body: 'Pèsè ìwé ìdánimọ̀ tí ìjọba fún bí NIN, ìwé awakọ̀, tàbí passport.' },
          { title: 'Fọ́tò passport', body: 'Lo fọ́tò JPG tàbí PNG tuntun tó mọ́kàn pẹ̀lú abẹ́lẹ̀ pẹ̀tẹ́lẹ̀.' },
          { title: 'Fáìlì kan lẹ́ẹ̀kan', body: 'Yan fáìlì tàbí lo fáìlì àpẹẹrẹ, kí o dúró de àmì Ṣetán.' },
        ],
      },
      payment: {
        eyebrow: 'Igbesẹ 3 ninu 3 · Ìsanwó àti fífilẹ̀',
        heading: 'Ìforúkọsílẹ̀ rẹ ti ṣetán láti tẹ̀síwájú.',
        intro: 'Ṣàyẹ̀wò àwọn àlàyé. Nínú ètò kíkún, ìgbésẹ̀ yìí máa lo sandbox payment kí ìforúkọsílẹ̀ tó wọ̀ verification.',
        guide: 'Ohun gbogbo dára. Lẹ́yìn ìsanwó, ìforúkọsílẹ̀ rẹ máa wọ̀ àyẹ̀wò.',
        fee: 'Owó fífilẹ̀ àpẹẹrẹ',
        sandbox: 'Owó ìjọba wà nínú rẹ̀ · Sandbox payment',
        back: 'Padà',
        retry: 'Ṣàpẹẹrẹ ìsanwó tí kò ṣeé ṣe',
        submit: 'Sanwó kí o sì fi ìforúkọsílẹ̀ sí ìlà',
        note: 'O lè padà sí àwọn ìgbésẹ̀ àtẹ́lẹwọ́ kí o tó fi àpẹẹrẹ náà sílẹ̀.',
        items: [
          { title: 'Ṣàyẹ̀wò àlàyé rẹ', body: 'Rí i pé orúkọ, irú iṣẹ́, àti àlàyé sọ ohun tí o fẹ́ gan-an.' },
          { title: 'Ìsanwó sandbox', body: 'Àpẹẹrẹ yìí fi owó fífilẹ̀ ₦25,000 hàn. A kò gba owó gidi.' },
          { title: 'Tọ́pinpin ohun tó ń bọ̀', body: 'Lẹ́yìn fífilẹ̀, dashboard máa fi verification, dídúró de CAC, àti ìforúkọsílẹ̀ hàn.' },
        ],
      },
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
    registration: {
      data: {
        eyebrow: 'Mataki na 1 cikin 3 · Bayanan kasuwanci',
        heading: 'Faɗa mana game da kasuwancin da kuke ginawa.',
        intro: 'Fara da ra’ayin ku cikin kalmominku; za mu taimaka wajen tsara rajistar.',
        guide: 'Wane irin kasuwanci kuke son farawa?',
        nameLabel: 'Sunan kasuwanci ko ra’ayi',
        namePlaceholder: 'misali Ayo’s Table',
        typeLabel: 'Nau’in rajista',
        inspiration: 'Kuna bukatar shawara?',
        descriptionLabel: 'Me kasuwancin yake yi?',
        descriptionPlaceholder: 'Faɗi abin da kuke sayarwa, kerawa, ko taimakawa mutane da shi.',
        servicesLabel: 'Kayayyaki ko ayyuka (raba da waƙafi)',
        servicesPlaceholder: 'misali kula da fata, shawarwarin lafiya',
        emailLabel: 'Imel ɗin kasuwanci (zaɓi ne)',
        phoneLabel: 'Lambar waya (zaɓi ne)',
        contactHint: 'Za a yi amfani da su wajen tsara kayan alamar ku.',
        checkName: 'Duba samuwar suna',
        checkPrompt: 'Duba sunan a cikin gwajin kafin ci gaba.',
        continue: 'Ci gaba zuwa takardu',
        note: 'Kuna iya canza waɗannan bayanan daga baya.',
        items: [
          { title: 'Suna ko ra’ayi', body: 'Yi amfani da sunan da kuke tunani, ko da bai zama na ƙarshe ba.' },
          { title: 'Nau’in kasuwanci', body: 'Zaɓi tsarin da ya fi dacewa da yadda kuke son gudanarwa.' },
          { title: 'Bayani mai sauƙi', body: 'Bayyana abin da kuke sayarwa, kerawa, ko taimaka wa mutane da shi.' },
        ],
      },
      documents: {
        eyebrow: 'Mataki na 2 cikin 3 · Duba takardu',
        heading: 'Mu tabbatar takardunku sun shirya.',
        intro: 'Loda kwafe masu kyau na takardun rajista. Wannan gwaji yana duba tsari, karantawa, da samfurin OCR.',
        guide: 'Takarda mai kyau tana rage jinkiri. Zaɓi fayil ko yi amfani da samfurin.',
        identityTitle: 'Takardar shaidar da gwamnati ta bayar',
        identityDescription: 'NIN, lasisin tuƙi, ko fasfo',
        passportTitle: 'Hoton fasfo',
        passportDescription: 'Hoto na baya-bayan nan mai haske da bango mara cunkoso',
        ready: 'A shirye',
        flagged: 'Ana bukatar dubawa',
        pending: 'Ana jira',
        choose: 'Zaɓi fayil',
        replace: 'Sauya fayil',
        demo: 'Yi amfani da samfurin',
        back: 'Koma',
        continue: 'Duba rajista',
        note: 'A kiyaye kowane fayil ya kasance mai kyau kuma bai wuce 5 MB ba a wannan demo.',
        items: [
          { title: 'Takardar shaida', body: 'Shirya takardar da gwamnati ta bayar kamar NIN, lasisin tuƙi, ko fasfo.' },
          { title: 'Hoton fasfo', body: 'Yi amfani da sabon JPG ko PNG mai haske da bango mara cunkoso.' },
          { title: 'Fayil ɗaya a lokaci guda', body: 'Zaɓi fayil ko yi amfani da samfurin, sannan jira alamar A shirye.' },
        ],
      },
      payment: {
        eyebrow: 'Mataki na 3 cikin 3 · Biyan kuɗi da shigarwa',
        heading: 'A shirye rajistarku take ta ci gaba.',
        intro: 'Duba bayanan da ke ƙasa. A cikin cikakken tsari, wannan mataki yana amfani da sandbox kafin tantancewa.',
        guide: 'Komai ya shirya. Bayan an tabbatar da biyan kuɗi, aikace-aikacen zai shiga tantancewa.',
        fee: 'Kuɗin shigarwa na gwaji',
        sandbox: 'Kuɗin gwamnati na ciki · Sandbox payment',
        back: 'Koma',
        retry: 'Yi samfurin biyan da ya gaza',
        submit: 'Biya kuma saka aikace-aikacen',
        note: 'Kuna iya komawa matakan baya kafin aikawa da wannan demo.',
        items: [
          { title: 'Duba bayananku', body: 'Tabbatar sunan, nau’in kasuwanci, da bayanin sun bayyana abin da kuke nufi.' },
          { title: 'Biyan sandbox', body: 'Wannan demo yana nuna kuɗin shigarwa ₦25,000. Ba a karɓi kuɗi na gaske ba.' },
          { title: 'Bibiyi abin da zai biyo baya', body: 'Bayan aikawa, dashboard yana nuna tantancewa, jiran CAC, da rajista.' },
        ],
      },
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
    registration: {
      data: {
        eyebrow: 'Nzọụkwụ 1 n’ime 3 · Nkọwa azụmahịa',
        heading: 'Gwa anyị banyere azụmahịa ị na-ewu.',
        intro: 'Malite n’echiche gị n’okwu nke gị; anyị ga-enyere aka hazie ndebanye aha.',
        guide: 'Kedu ụdị azụmahịa ị chọrọ ịmalite?',
        nameLabel: 'Aha azụmahịa ma ọ bụ echiche',
        namePlaceholder: 'dịka Ayo’s Table',
        typeLabel: 'Ụdị ndebanye aha',
        inspiration: 'Ị chọrọ echiche?',
        descriptionLabel: 'Kedu ihe azụmahịa ahụ na-eme?',
        descriptionPlaceholder: 'Gwa anyị ihe ị na-ere, na-emepụta, ma ọ bụ na-enyere ndị mmadụ aka ime.',
        servicesLabel: 'Ngwaahịa ma ọ bụ ọrụ (kewaa na rikoma)',
        servicesPlaceholder: 'dịka nlekọta akpụkpọ ahụ, ndụmọdụ ahụike',
        emailLabel: 'Email azụmahịa (nhọrọ)',
        phoneLabel: 'Nọmba ekwentị (nhọrọ)',
        contactHint: 'A ga-eji ha hazie ihe nkwado akara gị.',
        checkName: 'Lelee nnweta aha',
        checkPrompt: 'Lelee aha n’ime nnwale tupu ịga n’ihu.',
        continue: 'Gaa n’ihu na akwụkwọ',
        note: 'Ị nwere ike ịgbanwe nkọwa ndị a ma emechaa.',
        items: [
          { title: 'Aha ma ọ bụ echiche', body: 'Jiri aha ị na-atụle, ọbụna ma ọ bụrụ na ọ bụghị nke ikpeazụ.' },
          { title: 'Ụdị azụmahịa', body: 'Họrọ usoro dabara nke ọma n’otú ị chọrọ isi rụọ ọrụ.' },
          { title: 'Nkọwa dị mfe', body: 'Kọwaa ihe ị na-ere, na-emepụta, ma ọ bụ na-enyere ndị mmadụ aka.' },
        ],
      },
      documents: {
        eyebrow: 'Nzọụkwụ 2 n’ime 3 · Nyocha akwụkwọ',
        heading: 'Ka anyị hụ na akwụkwọ gị dị njikere.',
        intro: 'Bulite akwụkwọ ndị doro anya. Nnwale a na-enyocha ụdị faịlụ, ịdị ọcha, na OCR atụ.',
        guide: 'Akwụkwọ doro anya na-ebelata igbu oge. Họrọ faịlụ ma ọ bụ jiri faịlụ atụ.',
        identityTitle: 'Akwụkwọ njirimara gọọmentị nyere',
        identityDescription: 'NIN, akwụkwọ ikike ịnya ụgbọ, ma ọ bụ paspọtụ',
        passportTitle: 'Foto paspọtụ',
        passportDescription: 'Foto ọhụrụ doro anya nke nwere ndabere dị larịị',
        ready: 'Njikere',
        flagged: 'Achọrọ nyocha',
        pending: 'Na-eche',
        choose: 'Họrọ faịlụ',
        replace: 'Dochie faịlụ',
        demo: 'Jiri faịlụ atụ',
        back: 'Laghachi',
        continue: 'Nyochaa ndebanye aha',
        note: 'Debe faịlụ ọ bụla doro anya ma ghara ịgafe 5 MB n’ime ihe atụ a.',
        items: [
          { title: 'Akwụkwọ njirimara', body: 'Kwadebe akwụkwọ gọọmentị nyere dịka NIN, akwụkwọ ikike ịnya ụgbọ, ma ọ bụ paspọtụ.' },
          { title: 'Foto paspọtụ', body: 'Jiri foto JPG ma ọ bụ PNG ọhụrụ doro anya nke nwere ndabere dị larịị.' },
          { title: 'Otu faịlụ n’otu oge', body: 'Họrọ faịlụ ma ọ bụ jiri faịlụ atụ, chere ruo mgbe ọ ga-egosi Njikere.' },
        ],
      },
      payment: {
        eyebrow: 'Nzọụkwụ 3 n’ime 3 · Ịkwụ ụgwọ na ntinye',
        heading: 'Ndebanye aha gị dị njikere ịga n’ihu.',
        intro: 'Nyochaa nkọwa dị n’okpuru. N’usoro zuru ezu, nzọụkwụ a na-eji sandbox tupu nyocha.',
        guide: 'Ihe niile dị mma. Mgbe akwụchara ụgwọ, ngwa gị ga-abanye na nyocha.',
        fee: 'Ụgwọ ntinye nnwale',
        sandbox: 'Ụgwọ gọọmentị gụnyere · Sandbox payment',
        back: 'Laghachi',
        retry: 'Nwalee ịkwụ ụgwọ dara',
        submit: 'Kwụọ ma tinye ngwa',
        note: 'Ị nwere ike ịlaghachi na nzọụkwụ gara aga tupu itinye ngwa atụ a.',
        items: [
          { title: 'Nyochaa nkọwa gị', body: 'Jide n’aka na aha, ụdị azụmahịa, na nkọwa na-ekwu ihe ị chọrọ.' },
          { title: 'Ịkwụ ụgwọ sandbox', body: 'Ihe atụ a na-egosi ụgwọ ntinye ₦25,000. A naghị ewere ezigbo ego.' },
          { title: 'Soro ihe na-abịa', body: 'Mgbe i tinyere ya, dashboard na-egosi nyocha, ichere CAC, na ndebanye aha.' },
        ],
      },
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

function normalizeServiceList(value = '') {
  return String(value ?? '')
    .split(',')
    .map((service) => normalizeBusinessName(service))
    .filter(Boolean)
    .slice(0, 5);
}

export function createBrandAssets({
  businessName = '',
  description = '',
  serviceList = '',
  contactEmail = '',
  contactPhone = '',
  registrationNumber = '',
  themeId = 'meadow',
} = {}) {
  const brand = createBrandKit({ businessName, description, themeId });
  const about = normalizeBusinessName(description) || `${brand.businessName} is building a clearer way to serve its customers.`;
  const services = normalizeServiceList(serviceList);
  const fallbackServices = services.length > 0 ? services : ['Products and services', 'Customer support', 'Local delivery'];
  const profile = {
    businessName: brand.businessName,
    registrationNumber: normalizeBusinessName(registrationNumber) || 'BN-XXXXXXX (demo)',
    about,
    services: fallbackServices,
    contactEmail: normalizeBusinessName(contactEmail) || 'hello@yourbusiness.example',
    contactPhone: normalizeBusinessName(contactPhone) || '+234 800 000 0000',
    theme: brand.theme,
  };

  return {
    brand,
    profile,
    landing: {
      businessName: profile.businessName,
      tagline: brand.descriptor,
      about: profile.about,
      services: profile.services,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      theme: profile.theme,
    },
  };
}

export function createRegistrationDraft({
  businessName = '',
  businessType = 'Business Name',
  description = '',
  serviceList = '',
  contactEmail = '',
  contactPhone = '',
  language = 'en',
} = {}) {
  return {
    id: `reg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    businessName: normalizeBusinessName(businessName),
    businessType: normalizeBusinessName(businessType) || 'Business Name',
    description: normalizeBusinessName(description),
    serviceList: normalizeBusinessName(serviceList),
    contactEmail: normalizeBusinessName(contactEmail),
    contactPhone: normalizeBusinessName(contactPhone),
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
    documentResults: {
      identity: null,
      passport: null,
    },
    nameCheck: null,
    brandKit: {
      themeId: 'meadow',
    },
    payment: 'pending',
    paymentError: '',
    stageHistory: {
      data: new Date().toISOString(),
    },
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
  const allowedMimeTypes = isPassport ? new Set(['image/jpeg', 'image/png']) : new Set(['application/pdf']);
  const allowedExtensions = isPassport ? /\.(jpe?g|png)$/ : /\.pdf$/;

  if (!name || !allowedMimeTypes.has(normalizedMimeType) || !allowedExtensions.test(normalizedName)) {
    return {
      valid: false,
      message: isPassport
        ? 'Use a JPG or PNG image for the passport photograph.'
        : 'Use a selectable-text PDF for the identity document. Scanned image files are not supported.',
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

export function verifyDocumentReadiness({
  documentType = 'identity',
  name = '',
  mimeType = '',
  size = 0,
} = {}) {
  const fileCheck = validateDocumentFile({ documentType, name, mimeType, size });
  if (!fileCheck.valid) {
    return {
      status: documentType === 'identity' ? 'unsupported' : 'flagged',
      confidence: 0,
      extractedFields: {},
      legibility: 'unknown',
      completeness: 'unknown',
      format: 'invalid',
      biometricVerification: false,
      message: fileCheck.message,
    };
  }

  if (documentType === 'identity') {
    return {
      status: 'unsupported',
      confidence: 0,
      extractedFields: {},
      legibility: 'not-parsed',
      completeness: 'unknown',
      format: 'pdf-text',
      parser: 'pdfjs-text',
      biometricVerification: false,
      message: 'Identity PDF text must be parsed in the browser before it can continue.',
    };
  }

  const normalizedName = String(name).toLowerCase();
  if (/(blurry|blur|low[- ]?res|cropped|dark|unclear)/.test(normalizedName)) {
    return {
      status: 'flagged',
      confidence: 0.42,
      extractedFields: {},
      legibility: 'flagged',
      completeness: 'unknown',
      format: 'valid',
      biometricVerification: false,
      message: 'The demo OCR check could not read this clearly. Re-upload a brighter, uncropped file.',
    };
  }

  if (/(ocr[- ]?fail|failed[- ]?ocr|unreadable)/.test(normalizedName)) {
    return {
      status: 'failed',
      confidence: 0.18,
      extractedFields: {},
      legibility: 'failed',
      completeness: 'unknown',
      format: 'valid',
      biometricVerification: false,
      message: 'The demo OCR check failed. Re-upload the document or choose a clearer file.',
    };
  }

  if (/(incomplete|partial|missing)/.test(normalizedName)) {
    return {
      status: 'flagged',
      confidence: 0.61,
      extractedFields: { fullName: 'Ayo Olatunji' },
      legibility: 'pass',
      completeness: 'incomplete',
      format: 'valid',
      biometricVerification: false,
      message: 'The document is readable, but the demo OCR check found incomplete identity fields. Re-upload the complete document.',
    };
  }

  if (documentType === 'passport') {
    return {
      status: 'passed',
      confidence: 0.94,
      extractedFields: { photoQuality: 'Clear passport photograph' },
      legibility: 'pass',
      completeness: 'complete',
      format: 'valid',
      biometricVerification: false,
      message: 'Photo quality check passed. The image is clear enough for the next step.',
    };
  }

  return {
    status: 'passed',
    confidence: 0.96,
    extractedFields: {
      fullName: 'Ayo Olatunji',
      documentNumber: '•••• 4821',
    },
    legibility: 'pass',
    completeness: 'complete',
    format: 'valid',
    biometricVerification: false,
    message: 'Demo OCR check passed. Key identity fields look complete.',
  };
}

export function canAdvanceToPayment(documents = {}) {
  return documents.identity === 'passed' && documents.passport === 'passed';
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
    payment: 75,
    verifying: 85,
    waiting: 92,
    registered: 100,
  };

  const normalizedStage = stage === 'documents' ? 'data' : stage;
  return progressByStage[normalizedStage] ?? progressByStage.data;
}

export function getNextApplicationStage(stage = 'data') {
  const stages = ['data', 'payment', 'verifying', 'waiting', 'registered'];
  const normalizedStage = stage === 'documents' ? 'data' : stage;
  const currentIndex = stages.indexOf(normalizedStage);
  if (currentIndex < 0) return 'data';
  return stages[Math.min(currentIndex + 1, stages.length - 1)];
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

export function getApplicationTimeline(stage = 'data', stageHistory = {}) {
  const normalizedStage = stage === 'documents' ? 'data' : stage;
  const activeIndex = Math.max(0, applicationTimeline.findIndex((item) => item.id === normalizedStage));

  return applicationTimeline.map((item, index) => ({
    ...item,
    status: index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming',
    timestamp: stageHistory[item.id] || '',
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

export function getRegulAIReply(question = '', language = 'en') {
  const normalizedQuestion = String(question ?? '').toLowerCase();
  const replies = {
    en: {
      documents: 'For this demo, prepare a government-issued identity document and a passport photograph. Use the mock checks to mark both ready.',
      timing: 'Your application moves from business details to document check, payment, and verification. The dashboard shows each stage as it changes.',
      payment: 'This prototype uses a ₦25,000 sandbox filing fee. No real payment is taken.',
      status: 'Your workspace tracks data, payment, verification, CAC waiting, and registration in one view.',
      fallback: 'I can help with documents, timing, payment, or your current application status. Try one of those questions.',
    },
    yo: {
      documents: 'Fún àpẹẹrẹ yìí, pèsè ìwé ìdánimọ̀ tí ìjọba fún àti fọ́tò passport. Lo àyẹ̀wò àpẹẹrẹ láti mú méjèèjì ṣetán.',
      timing: 'Ìforúkọsílẹ̀ rẹ máa lọ láti àlàyé iṣẹ́ sí àyẹ̀wò ìwé, ìsanwó, àti ìdánwò. Dashboard máa fi ipele kọ̀ọ̀kan hàn.',
      payment: 'Àpẹẹrẹ yìí lo ₦25,000 gẹ́gẹ́ bí owó sandbox. A kò gba owó gidi.',
      status: 'Workspace rẹ máa tọ́pinpin àlàyé, ìsanwó, ìdánwò, dídúró de CAC, àti ìforúkọsílẹ̀.',
      fallback: 'Mo lè ràn ọ́ lọ́wọ́ pẹ̀lú ìwé, àkókò, ìsanwó, tàbí ipò ìforúkọsílẹ̀ rẹ. Gbìyànjú ọ̀kan nínú wọn.',
    },
    ha: {
      documents: 'Don wannan demo, shirya takardar shaidar gwamnati da hoton fasfo. Yi amfani da gwajin samfurin don shirya su.',
      timing: 'Rajistarku tana wucewa daga bayanan kasuwanci zuwa duba takardu, biyan kuɗi, da tantancewa. Dashboard yana nuna kowane mataki.',
      payment: 'Wannan samfurin yana amfani da kuɗin sandbox ₦25,000. Ba a karɓi kuɗi na gaske ba.',
      status: 'Workspace ɗinku yana bin bayanai, biyan kuɗi, tantancewa, jiran CAC, da rajista a wuri ɗaya.',
      fallback: 'Zan iya taimakawa da takardu, lokaci, biyan kuɗi, ko matsayin rajista. Gwada ɗaya daga cikinsu.',
    },
    ig: {
      documents: 'Maka ngosi aịza a gọọmentị nyere na foto paspọtụ. Jiri nyocha atụ mee ka ha abụọ dị njikere.',
      timing: 'Ndebanye aha gị na-aga site na nkọwa azụmahịa gaa na nyocha akwụkwọ, ịkwụ ụgwọ, na nyocha. Dashboard na-egosi ọkwa ọ bụla.',
      payment: 'Ihe atụ a na-eji ụgwọ sandbox ₦25,000. A naghị ewere ezigbo ego.',
      status: 'Workspace gị na-edobe nkọwa, ịkwụ ụgwọ, nyocha, ichere CAC, na ndebanye aha n’otu ebe.',
      fallback: 'Enwere m ike inyere gị aka na akwụkwọ, oge, ịkwụ ụgwọ, ma ọ bụ ọnọdụ ndebanye aha. Gbalịa otu n’ime ha.',
    },
  };
  const copy = replies[language] || replies.en;

  if (/(document|identity|passport|upload|ìwé|ìdánimọ̀|fọ́tò|takardu|takarda|fasfo|hoto|shaidar|akwụkwọ|akwukwo|paspọtụ|foto|njirimara)/.test(normalizedQuestion)) {
    return copy.documents;
  }
  if (/(long|time|when|soon|turnaround|àkókò|ìgbà|melo|lokaci|yaushe|tsawon|oge|mgbe|ogologo)/.test(normalizedQuestion)) {
    return copy.timing;
  }
  if (/(pay|fee|cost|price|charge|ìsanwó|owó|ìye|biya|kuɗi|kudi|farashi|ịkwụ|ego|ụgwọ|ugwo)/.test(normalizedQuestion)) {
    return copy.payment;
  }
  if (/(status|progress|application|where|ipò|ìforúkọsílẹ̀|ìlọsíwájú|matsayi|rajista|aikace|ci gaba|ọnọdụ|ndebanye|ngwa|ọkwa)/.test(normalizedQuestion)) {
    return copy.status;
  }

  return copy.fallback;
}

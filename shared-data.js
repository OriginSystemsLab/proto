/**
 * Спільне нормалізоване сховище даних для iOS-прототипів «МоєСтадо» та «CyberFarm»
 * - Усі власні атрибути вівці (Token, VerificationStatus, Purpose, 3 фото) — виключно у Catalogs.Sheep.
 * - Farmers.Herd та Investors.InvestorSheep зберігають лише посилання { Sheep: Code }.
 * - Суми інвестицій та доходу не зберігаються у довідниках, а обчислюються з облікових операцій.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'sheep_ios_normalized_db_v5';
  const CHANNEL_NAME = 'sheep_ios_sync_v5';

  const LOCAL_SHEEP_PHOTOS = Object.freeze([
    './images/sheep-1.webp',
    './images/sheep-2.jpg',
    './images/sheep-3.jpg',
    './images/sheep-4.jpg',
    './images/sheep-5.jpg'
  ]);

  const Enums = Object.freeze({
    SheepPurpose: Object.freeze({
      ForMeat: {
        name: 'ForMeat',
        label: "На м'ясо",
        shortLabel: "М'ясний напрям",
        apr: '18% річних'
      },
      ForBreeding: {
        name: 'ForBreeding',
        label: 'На розмноження',
        shortLabel: 'Розмноження',
        apr: '24% річних'
      }
    }),
    SheepVerificationStatuses: Object.freeze({
      PendingVerification: {
        name: 'PendingVerification',
        label: 'На верифікації'
      },
      Verified: {
        name: 'Verified',
        label: 'Верифікована'
      },
      Rejected: {
        name: 'Rejected',
        label: 'Відхилена'
      }
    })
  });

  function escapeXml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function svgToDataUri(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
  }

  function generateEarTagPhoto(earTagNumber, sheepName, hue = 145) {
    const safeTag = escapeXml(earTagNumber || 'UA-0000000000');
    const shortDigits = escapeXml(safeTag.slice(-6));
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" width="480" height="320">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="hsl(${hue}, 24%, 24%)"/>
            <stop offset="100%" stop-color="hsl(${hue + 16}, 20%, 36%)"/>
          </linearGradient>
          <linearGradient id="tagGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFE359"/>
            <stop offset="100%" stop-color="#F5B800"/>
          </linearGradient>
        </defs>
        <rect width="480" height="320" fill="url(#bg)"/>
        <g transform="translate(34, 34)">
          <circle cx="72" cy="95" r="56" fill="#F5F3EE"/>
          <circle cx="118" cy="66" r="48" fill="#FAF9F6"/>
          <circle cx="56" cy="154" r="52" fill="#ECE7DC"/>
          <path d="M95,88 C175,62 278,86 302,126 C315,148 272,188 188,186 C132,185 95,152 95,120 Z" fill="#E8D5CC"/>
          <path d="M122,110 C178,96 250,110 270,132 C258,152 205,164 138,154 Z" fill="#DFB4B0"/>
          <circle cx="208" cy="132" r="10" fill="#3A3A3C"/>
        </g>
        <g transform="translate(182, 122) rotate(-3)">
          <path d="M45,0 L165,0 L195,34 L195,148 C195,158 187,166 177,166 L33,166 C23,166 15,158 15,148 L15,34 Z" fill="url(#tagGrad)" stroke="#C99300" stroke-width="2"/>
          <circle cx="105" cy="24" r="8" fill="#2C2C2E"/>
          <rect x="36" y="45" width="24" height="8" rx="1.5" fill="#0057B7"/>
          <rect x="36" y="53" width="24" height="8" rx="1.5" fill="#FFD700"/>
          <text x="68" y="57" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="700" fill="#1C1C1E">UA РЕЄСТР</text>
          <text x="105" y="92" text-anchor="middle" font-family="ui-monospace, monospace" font-size="14" font-weight="700" fill="#1C1C1E">${safeTag}</text>
          <text x="105" y="128" text-anchor="middle" font-family="ui-monospace, monospace" font-size="27" font-weight="800" letter-spacing="1.5" fill="#000000">${shortDigits}</text>
        </g>
      </svg>`;
    return svgToDataUri(svg);
  }

  function generateFullBodyPhoto(sheepName, purpose, hue = 145) {
    const skyHue = (hue + 58) % 360;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" width="480" height="320">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="hsl(${skyHue}, 58%, 87%)"/>
            <stop offset="68%" stop-color="#F5FAF7"/>
          </linearGradient>
          <linearGradient id="meadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="hsl(${hue}, 40%, 46%)"/>
            <stop offset="100%" stop-color="hsl(${hue}, 45%, 30%)"/>
          </linearGradient>
        </defs>
        <rect width="480" height="320" fill="url(#sky)"/>
        <path d="M0,208 Q135,164 275,200 T480,188 L480,320 L0,320 Z" fill="hsl(${hue}, 30%, 62%)" opacity="0.6"/>
        <path d="M0,224 Q190,196 350,220 T480,214 L480,320 L0,320 Z" fill="url(#meadow)"/>
        <g stroke="#2C2C2E" stroke-width="11" stroke-linecap="round">
          <line x1="176" y1="205" x2="173" y2="270"/>
          <line x1="206" y1="208" x2="210" y2="266"/>
          <line x1="280" y1="208" x2="276" y2="270"/>
          <line x1="310" y1="205" x2="315" y2="266"/>
        </g>
        <g fill="#FAF8F5" stroke="#E5E0D5" stroke-width="1.5">
          <circle cx="166" cy="162" r="38"/>
          <circle cx="206" cy="138" r="44"/>
          <circle cx="256" cy="136" r="46"/>
          <circle cx="300" cy="154" r="40"/>
          <circle cx="282" cy="186" r="36"/>
          <circle cx="232" cy="190" r="40"/>
          <circle cx="188" cy="188" r="36"/>
          <circle cx="140" cy="172" r="17"/>
        </g>
        <g transform="translate(312, 108)">
          <ellipse cx="14" cy="24" rx="22" ry="10" transform="rotate(-22 14 24)" fill="#3A3A3C"/>
          <rect x="-2" y="26" width="13" height="17" rx="3" fill="#FFD60A"/>
          <ellipse cx="42" cy="36" rx="25" ry="31" transform="rotate(14 42 36)" fill="#3A3A3C"/>
          <circle cx="34" cy="10" r="15" fill="#FAF8F5"/>
          <circle cx="48" cy="12" r="13" fill="#FAF8F5"/>
          <circle cx="50" cy="32" r="3.5" fill="#FFFFFF"/>
          <circle cx="51" cy="32" r="1.8" fill="#1C1C1E"/>
        </g>
      </svg>`;
    return svgToDataUri(svg);
  }

  function generateStateCertificatePhoto(earTagNumber, sheepName, farmerName, regDate, isBlurry = false) {
    const safeTag = escapeXml(earTagNumber || 'UA-0000000000');
    const safeName = escapeXml(sheepName || 'Вівця');
    const safeFarmer = escapeXml((farmerName || 'Господарство').slice(0, 32));
    const safeDate = escapeXml((regDate || '2026-11-12').slice(0, 10));
    const blurFilter = isBlurry ? '<filter id="stampBlur"><feGaussianBlur stdDeviation="3.4"/></filter>' : '';
    const stampAttr = isBlurry ? 'filter="url(#stampBlur)" opacity="0.4"' : 'opacity="0.85"';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" width="480" height="320">
        <defs>
          ${blurFilter}
          <linearGradient id="pinkPaper" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FFE0EB"/>
            <stop offset="100%" stop-color="#FFC2D6"/>
          </linearGradient>
        </defs>
        <rect width="480" height="320" fill="#3A3330"/>
        <g transform="translate(42, 20) rotate(-1)">
          <rect width="396" height="278" rx="6" fill="url(#pinkPaper)" stroke="#E598B4" stroke-width="1.5"/>
          <rect x="12" y="12" width="372" height="254" rx="3" fill="none" stroke="#C96A8E" stroke-width="1" stroke-dasharray="5 3"/>
          <text x="198" y="38" text-anchor="middle" font-family="Georgia, serif" font-size="10.5" font-weight="700" letter-spacing="1.2" fill="#7A1C42">ДЕРЖАВНИЙ РЕЄСТР ТВАРИН УКРАЇНИ</text>
          <text x="198" y="58" text-anchor="middle" font-family="Georgia, serif" font-size="15.5" font-weight="700" fill="#54102B">СВІДОЦТВО РЕЄСТРАЦІЇ ВІВЦІ</text>
          <text x="198" y="74" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" font-weight="700" fill="#8F244F">РОЖЕВИЙ БЛАНК • СЕРІЯ РВ № ${escapeXml(safeTag.replace(/\D/g, '').slice(-6) || '482910')}</text>
          <line x1="28" y1="84" x2="368" y2="84" stroke="#C96A8E" stroke-width="1"/>
          <text x="30" y="112" font-family="-apple-system, system-ui, sans-serif" font-size="11" fill="#6E1D3F">Номер бирки:</text>
          <text x="150" y="112" font-family="ui-monospace, monospace" font-size="13" font-weight="700" fill="#2E0717">${safeTag}</text>
          <text x="30" y="140" font-family="-apple-system, system-ui, sans-serif" font-size="11" fill="#6E1D3F">Кличка:</text>
          <text x="150" y="140" font-family="Georgia, serif" font-size="14" font-weight="700" fill="#2E0717">${safeName}</text>
          <text x="30" y="168" font-family="-apple-system, system-ui, sans-serif" font-size="11" fill="#6E1D3F">Власник:</text>
          <text x="150" y="168" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="600" fill="#2E0717">${safeFarmer}</text>
          <text x="30" y="196" font-family="-apple-system, system-ui, sans-serif" font-size="11" fill="#6E1D3F">Дата видачі:</text>
          <text x="150" y="196" font-family="ui-monospace, monospace" font-size="12" font-weight="600" fill="#2E0717">${safeDate}</text>
          <path d="M44,244 C66,224 82,252 102,232 C116,220 128,244 148,236" fill="none" stroke="#0057B7" stroke-width="2"/>
          <g transform="translate(310, 212) rotate(-12)" ${stampAttr}>
            <circle r="38" fill="none" stroke="#0057B7" stroke-width="2"/>
            <circle r="32" fill="none" stroke="#0057B7" stroke-width="0.8"/>
            <text y="3" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="8.5" font-weight="800" fill="#0057B7">ДЕРЖРЕЄСТР</text>
          </g>
        </g>
      </svg>`;
    return svgToDataUri(svg);
  }

  function generateHexToken(seedStr) {
    let h1 = 0xdeadbeef ^ seedStr.length;
    let h2 = 0x41c6ce57 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      const ch = seedStr.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    const randPart = Array.from({ length: 20 }, (_, idx) => {
      const n = Math.abs(Math.imul(h1 + idx * 31, 1664525) ^ (h2 + Date.now() + idx * 97)) % 16;
      return n.toString(16);
    }).join('');
    const prefix = ((h1 >>> 0).toString(16).padStart(8, '0')) + ((h2 >>> 0).toString(16).padStart(8, '0'));
    return 'tk_cyberfarm_' + prefix + randPart;
  }

  function createInitialSeedData() {
    const farmers = [
      {
        Code: 'FRM-00001',
        Description: 'Петренко Іван Васильович',
        FarmName: 'ФГ «Карпатська Отара»',
        TaxId: '3145829104',
        Phone: '+380 67 451 22 90',
        Email: 'petrenko@otara.ua',
        FarmAddress: 'Івано-Франківська обл., с. Криворівня',
        IsActive: true,
        Herd: [
          { Sheep: 'SHP-00101' },
          { Sheep: 'SHP-00102' },
          { Sheep: 'SHP-00103' },
          { Sheep: 'SHP-00104' }
        ]
      },
      {
        Code: 'FRM-00002',
        Description: 'Ковальчук Оксана Ігорівна',
        FarmName: 'ФГ «Подільські Луки»',
        TaxId: '42891054',
        Phone: '+380 50 918 33 41',
        Email: 'oksana@podillia.ua',
        FarmAddress: 'Хмельницька обл., с. Бакота',
        IsActive: true,
        Herd: [
          { Sheep: 'SHP-00105' },
          { Sheep: 'SHP-00106' }
        ]
      }
    ];

    const investors = [
      {
        Code: 'INV-00001',
        Description: 'Савчук Олександр Михайлович',
        Phone: '+380 63 120 99 88',
        Email: 'o.savchuk@cyberfarm.ua',
        TaxId: '3391048271',
        PayoutDetails: 'UA213223130000026007233566001',
        IsActive: true,
        InvestorSheep: [
          { Sheep: 'SHP-00101' },
          { Sheep: 'SHP-00105' }
        ]
      },
      {
        Code: 'INV-00002',
        Description: 'Мельник Марина Сергіївна',
        Phone: '+380 97 554 12 09',
        Email: 'marina.melnyk@ukr.net',
        TaxId: '3510928374',
        PayoutDetails: 'UA653052990000026204819201144',
        IsActive: true,
        InvestorSheep: [
          { Sheep: 'SHP-00102' }
        ]
      }
    ];

    const sheep = [
      {
        Code: 'SHP-00101',
        Description: 'Зірка',
        EarTagNumber: 'UA-2600418901',
        GpsTrackerId: 'GPS-UA-4101',
        Farmer: 'FRM-00001',
        EarTagPhoto: './images/ear-tag-demo.jpg',
        FullBodyPhoto: './images/sheep-1.webp',
        StateCertificatePhoto: generateStateCertificatePhoto('UA-2600418901', 'Зірка', 'ФГ «Карпатська Отара»', '2026-10-14'),
        Token: 'tk_cyberfarm_9f8a21c4e7b031d6a58290f41c8e',
        VerificationStatus: 'Verified',
        Purpose: 'ForBreeding',
        RegistrationDate: '2026-10-14T09:20:00+02:00',
        VerificationComment: 'Усі 3 фотографії підтверджено.'
      },
      {
        Code: 'SHP-00102',
        Description: 'Буковель',
        EarTagNumber: 'UA-2600418902',
        GpsTrackerId: 'GPS-UA-4102',
        Farmer: 'FRM-00001',
        EarTagPhoto: './images/ear-tag-demo.jpg',
        FullBodyPhoto: './images/sheep-3.jpg',
        StateCertificatePhoto: generateStateCertificatePhoto('UA-2600418902', 'Буковель', 'ФГ «Карпатська Отара»', '2026-10-19'),
        Token: 'tk_cyberfarm_4d12e8b903a7f6c1e55928d0b4a6',
        VerificationStatus: 'Verified',
        Purpose: 'ForMeat',
        RegistrationDate: '2026-10-19T11:45:00+02:00',
        VerificationComment: 'Дані верифіковано.'
      },
      {
        Code: 'SHP-00103',
        Description: 'Черемош',
        EarTagNumber: 'UA-2600418903',
        GpsTrackerId: 'GPS-UA-4103',
        Farmer: 'FRM-00001',
        EarTagPhoto: './images/ear-tag-demo.jpg',
        FullBodyPhoto: './images/sheep-5.jpg',
        StateCertificatePhoto: generateStateCertificatePhoto('UA-2600418903', 'Черемош', 'ФГ «Карпатська Отара»', '2026-11-11'),
        Token: 'tk_cyberfarm_7c31f0a8d5e249b6c17309e8a4f2',
        VerificationStatus: 'PendingVerification',
        Purpose: 'ForBreeding',
        RegistrationDate: '2026-11-11T16:10:00+02:00',
        VerificationComment: ''
      },
      {
        Code: 'SHP-00104',
        Description: 'Марічка',
        EarTagNumber: 'UA-2600418904',
        GpsTrackerId: 'GPS-UA-4104',
        Farmer: 'FRM-00001',
        EarTagPhoto: './images/ear-tag-demo.jpg',
        FullBodyPhoto: './images/sheep-2.jpg',
        StateCertificatePhoto: generateStateCertificatePhoto('UA-2600418904', 'Марічка', 'ФГ «Карпатська Отара»', '2026-11-08', true),
        Token: 'tk_cyberfarm_2a95b7d4c1e863f0941275b8d3c6',
        VerificationStatus: 'Rejected',
        Purpose: 'ForBreeding',
        RegistrationDate: '2026-11-08T14:05:00+02:00',
        VerificationComment: 'Фото рожевого свідоцтва розмите у зоні печатки.'
      },
      {
        Code: 'SHP-00105',
        Description: 'Квітка',
        EarTagNumber: 'UA-6800192301',
        GpsTrackerId: 'GPS-UA-6801',
        Farmer: 'FRM-00002',
        EarTagPhoto: './images/ear-tag-demo.jpg',
        FullBodyPhoto: './images/sheep-4.jpg',
        StateCertificatePhoto: generateStateCertificatePhoto('UA-6800192301', 'Квітка', 'ФГ «Подільські Луки»', '2026-10-22'),
        Token: 'tk_cyberfarm_8e40c2f7a1b953d6e28410c7b5a3',
        VerificationStatus: 'Verified',
        Purpose: 'ForBreeding',
        RegistrationDate: '2026-10-22T10:30:00+02:00',
        VerificationComment: 'Підтверджено.'
      },
      {
        Code: 'SHP-00106',
        Description: 'Дністер',
        EarTagNumber: 'UA-6800192302',
        GpsTrackerId: 'GPS-UA-6802',
        Farmer: 'FRM-00002',
        EarTagPhoto: './images/ear-tag-demo.jpg',
        FullBodyPhoto: './images/sheep-5.jpg',
        StateCertificatePhoto: generateStateCertificatePhoto('UA-6800192302', 'Дністер', 'ФГ «Подільські Луки»', '2026-11-02'),
        Token: 'tk_cyberfarm_5b73d9e1c4a082f6b39104e7d2c8',
        VerificationStatus: 'Verified',
        Purpose: 'ForMeat',
        RegistrationDate: '2026-11-02T13:15:00+02:00',
        VerificationComment: 'Підтверджено.'
      }
    ];

    const investmentDocuments = [
      {
        DocNumber: 'DOC-0001',
        Date: '2026-10-16T12:00:00+02:00',
        Investor: 'INV-00001',
        Sheep: 'SHP-00101',
        OperationType: 'Investment',
        Amount: 12500,
        Note: 'Інвестиція у вівцю «Зірка»'
      },
      {
        DocNumber: 'DOC-0002',
        Date: '2026-10-25T15:40:00+02:00',
        Investor: 'INV-00001',
        Sheep: 'SHP-00105',
        OperationType: 'Investment',
        Amount: 15000,
        Note: 'Інвестиція у вівцю «Квітка»'
      },
      {
        DocNumber: 'DOC-0003',
        Date: '2026-11-05T10:00:00+02:00',
        Investor: 'INV-00001',
        Sheep: 'SHP-00101',
        OperationType: 'YieldAccrual',
        Amount: 2150,
        Note: 'Дохід за реалізацію вовни та приплоду'
      },
      {
        DocNumber: 'DOC-0004',
        Date: '2026-10-28T17:15:00+02:00',
        Investor: 'INV-00002',
        Sheep: 'SHP-00102',
        OperationType: 'Investment',
        Amount: 9800,
        Note: 'Інвестиція у вівцю «Буковель»'
      }
    ];

    const events = [
      {
        EventId: 'EVT-0001',
        Timestamp: '2026-11-11T16:10:02+02:00',
        Title: 'Створено токен для «Черемош»',
        Subtitle: 'Записано у картку вівці • Передано на верифікацію'
      }
    ];

    return {
      Catalogs: { Farmers: farmers, Investors: investors, Sheep: sheep },
      Documents: { InvestmentOperations: investmentDocuments },
      EventLog: events
    };
  }

  let channel = null;
  try {
    if ('BroadcastChannel' in global) channel = new BroadcastChannel(CHANNEL_NAME);
  } catch (_) {}

  const listeners = new Set();

  function loadDb() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = createInitialSeedData();
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(raw);
    } catch (_) {
      return createInitialSeedData();
    }
  }

  function saveDb(db, reason = 'updated') {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    if (channel) {
      try {
        channel.postMessage({ type: 'db_changed', reason });
      } catch (_) {}
    }
    listeners.forEach((fn) => fn(db, reason));
  }

  if (channel) {
    channel.addEventListener('message', (ev) => {
      if (ev.data && ev.data.type === 'db_changed') {
        const fresh = loadDb();
        listeners.forEach((fn) => fn(fresh, ev.data.reason));
      }
    });
  }

  global.addEventListener('storage', (ev) => {
    if (ev.key === STORAGE_KEY) {
      const fresh = loadDb();
      listeners.forEach((fn) => fn(fresh, 'storage'));
    }
  });

  function nextCode(prefix, list, field = 'Code', padLen = 5) {
    let maxNum = 0;
    for (const item of list) {
      const m = String(item[field] || '').match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    return `${prefix}-${String(maxNum + 1).padStart(padLen, '0')}`;
  }

  const Store = {
    Enums,
    LOCAL_SHEEP_PHOTOS,
    generateEarTagPhoto,
    generateFullBodyPhoto,
    generateStateCertificatePhoto,

    getState: loadDb,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    resetToDemoData() {
      const seed = createInitialSeedData();
      saveDb(seed, 'reset');
      return seed;
    },

    getFarmerByCode(code, db = loadDb()) {
      return db.Catalogs.Farmers.find((f) => f.Code === code) || null;
    },
    getInvestorByCode(code, db = loadDb()) {
      return db.Catalogs.Investors.find((i) => i.Code === code) || null;
    },
    getSheepByCode(code, db = loadDb()) {
      return db.Catalogs.Sheep.find((s) => s.Code === code) || null;
    },

    getFarmerHerdResolved(farmerCode, db = loadDb()) {
      const farmer = this.getFarmerByCode(farmerCode, db);
      if (!farmer) return [];
      return farmer.Herd.map((r) => this.getSheepByCode(r.Sheep, db)).filter(Boolean);
    },

    getInvestorPortfolioResolved(investorCode, db = loadDb()) {
      const investor = this.getInvestorByCode(investorCode, db);
      if (!investor) return [];
      return investor.InvestorSheep
        .map((r) => {
          const sheep = this.getSheepByCode(r.Sheep, db);
          if (!sheep) return null;
          const farmer = this.getFarmerByCode(sheep.Farmer, db);
          const accounting = this.calculateInvestorSheepTotals(investorCode, sheep.Code, db);
          return { sheep, farmer, accounting };
        })
        .filter(Boolean);
    },

    calculateSheepTotalInvestments(sheepCode, db = loadDb()) {
      let invested = 0;
      const investorsSet = new Set();
      for (const doc of db.Documents.InvestmentOperations) {
        if (doc.Sheep === sheepCode && doc.OperationType === 'Investment') {
          invested += Number(doc.Amount) || 0;
          investorsSet.add(doc.Investor);
        }
      }
      return { invested, investorsCount: investorsSet.size };
    },

    calculateInvestorSheepTotals(investorCode, sheepCode, db = loadDb()) {
      let invested = 0;
      let yieldAccrued = 0;
      let operationsCount = 0;
      for (const doc of db.Documents.InvestmentOperations) {
        if (doc.Investor === investorCode && doc.Sheep === sheepCode) {
          operationsCount += 1;
          if (doc.OperationType === 'Investment') invested += Number(doc.Amount) || 0;
          else if (doc.OperationType === 'YieldAccrual') yieldAccrued += Number(doc.Amount) || 0;
        }
      }
      return { invested, yieldAccrued, totalValue: invested + yieldAccrued, operationsCount };
    },

    calculateInvestorSummary(investorCode, db = loadDb()) {
      let totalInvested = 0;
      let totalYield = 0;
      let docsCount = 0;
      for (const doc of db.Documents.InvestmentOperations) {
        if (doc.Investor === investorCode) {
          docsCount += 1;
          if (doc.OperationType === 'Investment') totalInvested += Number(doc.Amount) || 0;
          else if (doc.OperationType === 'YieldAccrual') totalYield += Number(doc.Amount) || 0;
        }
      }
      const investor = this.getInvestorByCode(investorCode, db);
      return {
        totalInvested,
        totalYield,
        netWorth: totalInvested + totalYield,
        docsCount,
        sheepCount: investor ? investor.InvestorSheep.length : 0
      };
    },

    registerSheep({ farmerCode, name, earTagNumber, purpose, gpsTrackerId, earTagPhoto, fullBodyPhoto, stateCertificatePhoto }) {
      const db = loadDb();
      const farmer = this.getFarmerByCode(farmerCode, db);
      if (!farmer) throw new Error('Фермера не знайдено');

      const newCode = nextCode('SHP', db.Catalogs.Sheep, 'Code', 5);
      const nowIso = new Date().toISOString();
      const mintedToken = generateHexToken(`${newCode}:${earTagNumber}:${name}:${nowIso}`);

      const cleanName = name.trim();
      const cleanTag = earTagNumber.trim();
      const cleanGps = String(gpsTrackerId || '').trim();
      const fallbackBody = LOCAL_SHEEP_PHOTOS[db.Catalogs.Sheep.length % LOCAL_SHEEP_PHOTOS.length] || './images/sheep-2.jpg';
      const fallbackEar = './images/ear-tag-demo.jpg';
      const fallbackCert = generateStateCertificatePhoto(cleanTag, cleanName, farmer.FarmName, nowIso.slice(0, 10));

      const sheepRecord = {
        Code: newCode,
        Description: cleanName,
        EarTagNumber: cleanTag,
        GpsTrackerId: cleanGps,
        Farmer: farmer.Code,
        EarTagPhoto: earTagPhoto || fallbackEar,
        FullBodyPhoto: fullBodyPhoto || fallbackBody,
        StateCertificatePhoto: stateCertificatePhoto || fallbackCert,
        Token: mintedToken,
        VerificationStatus: 'PendingVerification',
        Purpose: purpose === 'ForMeat' ? 'ForMeat' : 'ForBreeding',
        RegistrationDate: nowIso,
        VerificationComment: ''
      };

      db.Catalogs.Sheep.unshift(sheepRecord);
      farmer.Herd.unshift({ Sheep: newCode });
      db.EventLog.unshift({
        EventId: nextCode('EVT', db.EventLog, 'EventId', 4),
        Timestamp: nowIso,
        Title: `Створено токен для «${sheepRecord.Description}»`,
        Subtitle: `${mintedToken.slice(0, 22)}… • Статус: На верифікації`
      });

      saveDb(db, 'sheep_registered');
      return sheepRecord;
    },

    updateSheepPurpose(sheepCode, newPurpose) {
      const db = loadDb();
      const sheep = this.getSheepByCode(sheepCode, db);
      if (!sheep) return null;
      sheep.Purpose = newPurpose === 'ForMeat' ? 'ForMeat' : 'ForBreeding';
      db.EventLog.unshift({
        EventId: nextCode('EVT', db.EventLog, 'EventId', 4),
        Timestamp: new Date().toISOString(),
        Title: `Змінено призначення «${sheep.Description}»`,
        Subtitle: Enums.SheepPurpose[sheep.Purpose].label
      });
      saveDb(db, 'purpose_updated');
      return sheep;
    },

    resubmitSheepPhotos(sheepCode, { stateCertificatePhoto }) {
      const db = loadDb();
      const sheep = this.getSheepByCode(sheepCode, db);
      if (!sheep) return null;
      if (stateCertificatePhoto) sheep.StateCertificatePhoto = stateCertificatePhoto;
      sheep.VerificationStatus = 'PendingVerification';
      sheep.VerificationComment = '';
      db.EventLog.unshift({
        EventId: nextCode('EVT', db.EventLog, 'EventId', 4),
        Timestamp: new Date().toISOString(),
        Title: `Оновлено свідоцтво «${sheep.Description}»`,
        Subtitle: 'Повторно передано на верифікацію'
      });
      saveDb(db, 'sheep_resubmitted');
      return sheep;
    },

    setSheepVerificationStatus(sheepCode, status, comment = '') {
      const db = loadDb();
      const sheep = this.getSheepByCode(sheepCode, db);
      if (!sheep) return null;
      sheep.VerificationStatus = status;
      sheep.VerificationComment = comment.trim();
      db.EventLog.unshift({
        EventId: nextCode('EVT', db.EventLog, 'EventId', 4),
        Timestamp: new Date().toISOString(),
        Title: `Верифікація «${sheep.Description}»: ${Enums.SheepVerificationStatuses[status].label}`,
        Subtitle: sheep.VerificationComment || 'Доступна в каталозі «CyberFarm»'
      });
      saveDb(db, 'verification_changed');
      return sheep;
    },

    deleteSheep(sheepCode, reason = '') {
      const db = loadDb();
      const idx = db.Catalogs.Sheep.findIndex((s) => s.Code === sheepCode);
      if (idx === -1) return null;
      const [removed] = db.Catalogs.Sheep.splice(idx, 1);

      for (const farmer of db.Catalogs.Farmers) {
        farmer.Herd = farmer.Herd.filter((r) => r.Sheep !== sheepCode);
      }
      for (const inv of db.Catalogs.Investors) {
        inv.InvestorSheep = inv.InvestorSheep.filter((r) => r.Sheep !== sheepCode);
      }

      const cleanReason = String(reason || 'Не вказано').trim();
      db.EventLog.unshift({
        EventId: nextCode('EVT', db.EventLog, 'EventId', 4),
        Timestamp: new Date().toISOString(),
        Title: `Видалено вівцю «${removed.Description}»`,
        Subtitle: `Причина: ${cleanReason} • Бирка ${removed.EarTagNumber}`
      });

      saveDb(db, 'sheep_deleted');
      return removed;
    },

    investInSheepBatch({ investorCode, items }) {
      const db = loadDb();
      const investor = this.getInvestorByCode(investorCode, db);
      if (!investor) throw new Error('Інвестора не знайдено');
      const nowIso = new Date().toISOString();
      const createdDocs = [];

      for (const item of items) {
        const sheep = this.getSheepByCode(item.sheepCode, db);
        if (!sheep || sheep.VerificationStatus !== 'Verified') continue;
        const amount = Math.round(Number(item.amount) || 0);
        if (amount <= 0) continue;

        if (!investor.InvestorSheep.some((r) => r.Sheep === sheep.Code)) {
          investor.InvestorSheep.unshift({ Sheep: sheep.Code });
        }

        const doc = {
          DocNumber: nextCode('DOC', db.Documents.InvestmentOperations, 'DocNumber', 4),
          Date: nowIso,
          Investor: investor.Code,
          Sheep: sheep.Code,
          OperationType: 'Investment',
          Amount: amount,
          Note: `Інвестиція у вівцю «${sheep.Description}»`
        };
        db.Documents.InvestmentOperations.unshift(doc);
        createdDocs.push(doc);
      }

      saveDb(db, 'investment_posted');
      return createdDocs;
    },

    accrueInvestorYield({ investorCode, sheepCode, amount }) {
      const db = loadDb();
      const sheep = this.getSheepByCode(sheepCode, db);
      if (!sheep) return null;
      const doc = {
        DocNumber: nextCode('DOC', db.Documents.InvestmentOperations, 'DocNumber', 4),
        Date: new Date().toISOString(),
        Investor: investorCode,
        Sheep: sheep.Code,
        OperationType: 'YieldAccrual',
        Amount: Math.round(Number(amount) || 0),
        Note: `Нарахування доходу («${sheep.Description}»)`
      };
      db.Documents.InvestmentOperations.unshift(doc);
      saveDb(db, 'yield_accrued');
      return doc;
    },

    updateFarmerProfile(code, updates) {
      const db = loadDb();
      const farmer = this.getFarmerByCode(code, db);
      if (!farmer) return null;
      Object.assign(farmer, updates);
      saveDb(db, 'farmer_updated');
      return farmer;
    },

    updateInvestorProfile(code, updates) {
      const db = loadDb();
      const inv = this.getInvestorByCode(code, db);
      if (!inv) return null;
      Object.assign(inv, updates);
      saveDb(db, 'investor_updated');
      return inv;
    }
  };

  const UI = {
    formatMoney(n) {
      return new Intl.NumberFormat('uk-UA').format(Math.round(Number(n) || 0)) + ' ₴';
    },
    formatDate(iso) {
      if (!iso) return '';
      try {
        return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(new Date(iso));
      } catch (_) {
        return '';
      }
    },
    readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Помилка читання фото'));
        reader.readAsDataURL(file);
      });
    },
    showBanner(title, subtitle = '') {
      const banner = document.getElementById('ios-banner');
      const sr = document.getElementById('sr-live');
      if (sr) sr.textContent = subtitle ? `${title}. ${subtitle}` : title;
      if (!banner) return;
      banner.querySelector('.ios-banner-title').textContent = title;
      banner.querySelector('.ios-banner-sub').textContent = subtitle;
      banner.classList.add('visible');
      clearTimeout(banner._timer);
      banner._timer = setTimeout(() => banner.classList.remove('visible'), 3000);
    },
    openSheet(sheetEl, mainWrapEl) {
      if (!sheetEl) return;
      if (mainWrapEl) {
        mainWrapEl.setAttribute('inert', '');
        mainWrapEl.classList.add('scaled-back');
      }
      sheetEl.hidden = false;
      requestAnimationFrame(() => {
        sheetEl.classList.add('open');
        const focusTarget = sheetEl.querySelector('[data-autofocus], input, button');
        if (focusTarget) focusTarget.focus();
      });
    },
    closeSheet(sheetEl, mainWrapEl, invokerEl) {
      if (!sheetEl) return;
      sheetEl.classList.remove('open');
      if (mainWrapEl) {
        mainWrapEl.removeAttribute('inert');
        mainWrapEl.classList.remove('scaled-back');
      }
      setTimeout(() => {
        if (!sheetEl.classList.contains('open')) sheetEl.hidden = true;
        if (invokerEl && typeof invokerEl.focus === 'function') invokerEl.focus();
      }, 280);
    }
  };

  // МоєСтадо: режим «Великий шрифт» (увімкнений за замовчуванням)
  UI.BIG_UI_KEY = 'farmer_big_ui';
  UI.isBigUi = function () {
    try { return localStorage.getItem(UI.BIG_UI_KEY) !== '0'; } catch (_) { return true; }
  };
  UI.setBigUi = function (on) {
    try { localStorage.setItem(UI.BIG_UI_KEY, on ? '1' : '0'); } catch (_) {}
    if (document.body) document.body.classList.toggle('big-ui', !!on && document.body.classList.contains('app-farmer'));
  };
  if (global.document && document.body && document.body.classList.contains('app-farmer')) {
    document.body.classList.toggle('big-ui', UI.isBigUi());
  }

  global.SheepSystemStore = Store;
  global.SheepSystemUI = UI;
})(window);

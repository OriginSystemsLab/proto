/**
 * CyberFarm (B2C, додаток інвестора) — локальне демо-сховище кабінету.
 *
 * Що тут зберігається (localStorage `cyberfarm_b2c_v1`):
 *  - accounts   — облікові записи CyberFarm ID (реєстрація, телефон, верифікація особи, реквізити);
 *  - contracts  — підписані договори (один рамковий договір на акаунт, інвестиційний період 3 роки);
 *  - holdings   — оплачені місця «одна оплата = одна вівця». Вівця призначається фермою ПІЗНІШЕ:
 *                 status: 'awaiting' (оплачено, вівцю ще не призначено) → 'assigned' (вівцю закріплено).
 *                 Час володіння рахується від paidAt, а не від дня призначення.
 *                 Ім'я вівці (name) дає сам інвестор, а не каталог.
 *
 * Самі тварини (фото, бирка, GPS, господарство, токен) читаються лише для читання
 * з довідника Sheep у shared-data.js (window.SheepSystemStore). Цей файл його не змінює.
 */
(function (global) {
  'use strict';

  const KEY = 'cyberfarm_b2c_v1';
  const PRICE_PER_SHEEP = 12000; // демо-сума внеску за одну вівцю
  const PERIOD_YEARS = 3;
  const ASSIGN_DAYS = 14; // орієнтовний строк, за який ферма призначає вівцю

  // Дані про стан тварин (демо): порода, вага, локація, огляд ветеринара
  const ANIMAL_INFO = {
    'SHP-00101': { breed: 'Карпатська гірська', birth: '2025-03-02', weight: 48.5, pasture: 'Полонина Боржава', alt: 1450, x: 0.34, y: 0.42, health: 'healthy', check: '2026-11-08', mood: 86, fed: 74 },
    'SHP-00102': { breed: 'Карпатська гірська', birth: '2025-04-11', weight: 51.2, pasture: 'Полонина Свидовець', alt: 1600, x: 0.62, y: 0.30, health: 'healthy', check: '2026-11-06', mood: 92, fed: 63 },
    'SHP-00105': { breed: 'Цигайська', birth: '2025-02-20', weight: 45.0, pasture: 'Пасовище над Дністром', alt: 240, x: 0.48, y: 0.64, health: 'healthy', check: '2026-11-09', mood: 78, fed: 81 },
    'SHP-00106': { breed: 'Цигайська', birth: '2025-05-14', weight: 43.7, pasture: 'Пасовище над Дністром', alt: 260, x: 0.55, y: 0.58, health: 'check', check: '2026-11-10', mood: 70, fed: 58 },
    'SHP-00103': { breed: 'Карпатська гірська', birth: '2025-06-01', weight: 40.1, pasture: 'Полонина Руна', alt: 1480, x: 0.27, y: 0.55, health: 'healthy', check: '2026-11-11', mood: 88, fed: 70 },
    'SHP-00104': { breed: 'Карпатська гірська', birth: '2025-03-28', weight: 46.3, pasture: 'Полонина Руна', alt: 1480, x: 0.30, y: 0.50, health: 'healthy', check: '2026-11-07', mood: 81, fed: 66 }
  };
  const DEFAULT_INFO = { breed: 'Карпатська гірська', birth: '2025-04-01', weight: 45, pasture: 'Полонина Боржава', alt: 1400, x: 0.5, y: 0.5, health: 'healthy', check: '2026-11-05', mood: 80, fed: 70 };

  function seed() {
    return {
      session: null,
      accounts: [
        {
          id: 'CF-000184',
          fullName: 'Савчук Олександр Михайлович',
          email: 'demo@cyberfarm.ua',
          phone: '+380 63 120 99 88',
          password: 'demo1234',
          createdAt: '2026-10-15T18:20:00+02:00',
          phoneVerified: true,
          kyc: 'verified',
          kycMethod: 'BankID',
          taxId: '3391048271',
          iban: 'UA213223130000026007233566001',
          notifyMarket: false
        }
      ],
      contracts: [
        { number: 'CF-2026-0184', accountId: 'CF-000184', signedAt: '2026-10-16T11:52:00+02:00', periodYears: PERIOD_YEARS }
      ],
      holdings: [
        { id: 'H-0001', accountId: 'CF-000184', contract: 'CF-2026-0184', paidAt: '2026-10-16T12:00:00+02:00', amount: PRICE_PER_SHEEP, status: 'assigned', sheep: 'SHP-00101', assignedAt: '2026-10-21T09:00:00+02:00', name: 'Білка', cert: 'CF-CERT-2026-000101' },
        { id: 'H-0002', accountId: 'CF-000184', contract: 'CF-2026-0184', paidAt: '2026-10-25T15:40:00+02:00', amount: PRICE_PER_SHEEP, status: 'assigned', sheep: 'SHP-00105', assignedAt: '2026-11-03T10:30:00+02:00', name: '', cert: 'CF-CERT-2026-000105' },
        { id: 'H-0003', accountId: 'CF-000184', contract: 'CF-2026-0184', paidAt: '2026-11-10T19:05:00+02:00', amount: PRICE_PER_SHEEP, status: 'awaiting', sheep: null, assignedAt: null, name: '', cert: null }
      ]
    };
  }

  // Окремий вхід для кожної версії: iOS-додаток (cyberfarm.html) і веб (cyberfarm-web.html)
  // мають власну сесію, тож вхід в одній версії не відкриває іншу.
  const APP = /cyberfarm-web/.test(global.location.pathname) ? 'web' : 'ios';
  const SESSION_KEY = 'cyberfarm_session_' + APP;
  function getSession() { try { return global.localStorage.getItem(SESSION_KEY); } catch (_) { return null; } }
  function setSession(id) { try { id ? global.localStorage.setItem(SESSION_KEY, id) : global.localStorage.removeItem(SESSION_KEY); } catch (_) {} }
  function load() {
    let s = null;
    try {
      const raw = global.localStorage.getItem(KEY);
      if (raw) s = JSON.parse(raw);
    } catch (_) {}
    if (!s) { s = seed(); save(s); }
    s.session = getSession();
    return s;
  }
  function save(s) {
    setSession(s.session);
    try { global.localStorage.setItem(KEY, JSON.stringify(Object.assign({}, s, { session: null }))); } catch (_) {}
  }
  function mutate(fn) {
    const s = load();
    const out = fn(s);
    save(s);
    return out;
  }
  function pad(n, len) { return String(n).padStart(len, '0'); }

  const CF = {
    PRICE_PER_SHEEP,
    PERIOD_YEARS,
    ASSIGN_DAYS,

    state: load,
    reset() { const s = seed(); s.session = null; save(s); return s; },

    // ---------- Сесія та акаунт ----------
    me() {
      const s = load();
      return s.session ? s.accounts.find((a) => a.id === s.session) || null : null;
    },
    login(login, password) {
      const s = load();
      const l = String(login || '').trim().toLowerCase().replace(/\s+/g, '');
      const acc = s.accounts.find((a) => (a.email.toLowerCase() === l || a.phone.replace(/\s+/g, '') === l) && a.password === password);
      if (!acc) return null;
      s.session = acc.id;
      save(s);
      return acc;
    },
    logout() { mutate((s) => { s.session = null; }); },
    signup({ fullName, email, phone, password }) {
      return mutate((s) => {
        const exists = s.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
        if (exists) return { error: 'Акаунт із цією поштою вже існує. Увійдіть.' };
        const max = s.accounts.reduce((m, a) => Math.max(m, parseInt(a.id.replace(/\D/g, ''), 10) || 0), 0);
        const acc = {
          id: 'CF-' + pad(max + 1, 6), fullName, email, phone, password,
          createdAt: new Date().toISOString(), phoneVerified: false, kyc: 'none', kycMethod: null,
          taxId: '', iban: '', notifyMarket: false
        };
        s.accounts.push(acc);
        s.session = acc.id;
        return { account: acc };
      });
    },
    updateMe(patch) {
      return mutate((s) => {
        const acc = s.accounts.find((a) => a.id === s.session);
        if (acc) Object.assign(acc, patch);
        return acc;
      });
    },

    // ---------- Договір ----------
    contract() {
      const s = load();
      return s.contracts.find((c) => c.accountId === s.session) || null;
    },
    signContract() {
      return mutate((s) => {
        let c = s.contracts.find((x) => x.accountId === s.session);
        if (c) return c;
        const num = parseInt(String(s.session).replace(/\D/g, ''), 10) || s.contracts.length + 1;
        c = { number: `CF-${new Date().getFullYear()}-${pad(num, 4)}`, accountId: s.session, signedAt: new Date().toISOString(), periodYears: PERIOD_YEARS };
        s.contracts.push(c);
        return c;
      });
    },

    // ---------- Оплата та вівці ----------
    holdings() {
      const s = load();
      return s.holdings.filter((h) => h.accountId === s.session).sort((a, b) => a.paidAt.localeCompare(b.paidAt));
    },
    holding(id) { return this.holdings().find((h) => h.id === id) || null; },
    pay(count) {
      return mutate((s) => {
        const c = s.contracts.find((x) => x.accountId === s.session);
        const now = new Date().toISOString();
        const made = [];
        for (let i = 0; i < count; i++) {
          const max = s.holdings.reduce((m, h) => Math.max(m, parseInt(h.id.replace(/\D/g, ''), 10) || 0), 0);
          const h = { id: 'H-' + pad(max + 1, 4), accountId: s.session, contract: c ? c.number : null, paidAt: now, amount: PRICE_PER_SHEEP, status: 'awaiting', sheep: null, assignedAt: null, name: '', cert: null };
          s.holdings.push(h);
          made.push(h);
        }
        return made;
      });
    },
    /** Демо: ферма закріплює конкретну вівцю за оплаченим місцем */
    assign(holdingId) {
      const Store = global.SheepSystemStore;
      const db = Store ? Store.getState() : null;
      return mutate((s) => {
        const h = s.holdings.find((x) => x.id === holdingId);
        if (!h || h.status === 'assigned') return h;
        const taken = new Set(s.holdings.filter((x) => x.sheep).map((x) => x.sheep));
        const verified = db ? db.Catalogs.Sheep.filter((x) => x.VerificationStatus === 'Verified') : [];
        const mine = new Set(s.holdings.filter((x) => x.accountId === s.session && x.sheep).map((x) => x.sheep));
        const pick = verified.find((x) => !taken.has(x.Code)) || verified.find((x) => !mine.has(x.Code)) || verified[0];
        h.sheep = pick ? pick.Code : 'SHP-00101';
        h.status = 'assigned';
        h.assignedAt = new Date().toISOString();
        h.cert = `CF-CERT-${new Date().getFullYear()}-${pad(String(h.sheep).replace(/\D/g, ''), 6)}`;
        return h;
      });
    },
    rename(holdingId, name) {
      return mutate((s) => {
        const h = s.holdings.find((x) => x.id === holdingId && x.accountId === s.session);
        if (h) h.name = String(name || '').trim().slice(0, 24);
        return h;
      });
    },

    // ---------- Допоміжне ----------
    animal(code) {
      const Store = global.SheepSystemStore;
      const db = Store ? Store.getState() : null;
      const sheep = db ? Store.getSheepByCode(code, db) : null;
      const farmer = sheep && db ? Store.getFarmerByCode(sheep.Farmer, db) : null;
      return { sheep, farmer, info: Object.assign({}, DEFAULT_INFO, ANIMAL_INFO[code] || {}) };
    },
    periodEnd(paidAt) {
      const d = new Date(paidAt);
      d.setFullYear(d.getFullYear() + PERIOD_YEARS);
      return d;
    },
    daysSince(iso) {
      const ms = Date.now() - new Date(iso).getTime();
      return Math.max(0, Math.floor(ms / 86400000));
    }
  };

  global.CyberFarm = CF;
})(window);

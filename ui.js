/* ui.js · briques communes : icônes, formats, dates, compteur à rouleaux, toasts, formulaires, thèmes.
   Tout vit dans window.NACRE (pas de bundler : ça se publie tel quel sur GitHub Pages). */
(function () {
  'use strict';
  const N = (window.NACRE = window.NACRE || {});
  N.state = N.state || { profile: null, accounts: [], cards: [], goals: [], beneficiaries: [], tx: [], accIdx: {}, view: 'overview' };
  const S = N.state;

  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  N.EASE = EASE;
  N.$ = (s, r) => (r || document).querySelector(s);
  N.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  N.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  N.el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  N.anim = () => !(S.profile && S.profile.animations === false) && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  N.acts = N.acts || {};

  /* ───────── icônes (24×24, trait 1.9) ───────── */
  const P = {
    drop: '<path d="M12 2.7s-6.5 7.1-6.5 11.6a6.5 6.5 0 0 0 13 0C18.5 9.8 12 2.7 12 2.7z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    chart: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
    recv: '<path d="M17 7 7 17"/><path d="M17 17H7V7"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5a14.5 14.5 0 0 1 4 9.5 14.5 14.5 0 0 1-4 9.5 14.5 14.5 0 0 1-4-9.5 14.5 14.5 0 0 1 4-9.5z"/>',
    radio: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
    euro: '<path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
    snow: '<path d="M12 2v20"/><path d="m4.9 6.5 14.2 11"/><path d="m4.9 17.5 14.2-11"/><path d="m9 3.5 3 2.5 3-2.5"/><path d="m9 20.5 3-2.5 3 2.5"/>',
    laptop: '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    umbrella: '<path d="M22 12a10.06 10.06 0 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0"/><path d="M12 2v1"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.6 3.6 0 0 1 0 6.8"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    building: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M9 21.5v-4h6v4"/><path d="M8.5 7h.01M12 7h.01M15.5 7h.01M8.5 11h.01M12 11h.01M15.5 11h.01"/>',
    spark: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
    cal: '<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/><path d="M3.5 10h17"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    store: '<path d="m2 7 1.5-4h17L22 7"/><path d="M2 7v1a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V7"/><path d="M4 11v10h16V11"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    up: '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
    down: '<path d="M7 7l10 10"/><path d="M17 7v10H7"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M16 13.5h.01"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3C14.6 3 13 4 12 5.5 11 4 9.4 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V22h16"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.2"/>'
  };
  N.icon = (n, size, sw) => `<svg class="ic" width="${size || 18}" height="${size || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.tag}</svg>`;
  N.iconNames = Object.keys(P);
  N.goalIcons = ['laptop', 'plane', 'umbrella', 'car', 'gift', 'home', 'heart', 'bike', 'book', 'target', 'cart', 'wallet'];

  /* icône d'une opération selon son libellé / sa catégorie */
  N.txIcon = (t) => {
    const l = (t.label + ' ' + (t.category || '')).toLowerCase();
    if (t.kind === 'saving') return 'target';
    if (t.kind === 'transfer') return 'send';
    if (/spotify|deezer|music/.test(l)) return 'music';
    if (/uber|taxi|bolt|transport|essence|carbur/.test(l)) return 'car';
    if (/caf[eé]|resto|restaurant|d[eé]jeuner|dîner|diner|bar\b/.test(l)) return 'coffee';
    if (/vol|air |avion|voyage|hôtel|hotel|train/.test(l)) return 'plane';
    if (/apple|ordi|mac|laptop|matériel|materiel/.test(l)) return 'laptop';
    if (/vercel|figma|notion|github|adobe|logiciel|saas|abonnement/.test(l)) return 'receipt';
    if (/courses|supermarch|market|shopping/.test(l)) return 'cart';
    if (/loyer|bureau/.test(l)) return 'building';
    if (/équipe|equipe|salaire|freelance/.test(l)) return 'users';
    if (/client|paiement|facture|remboursement/.test(l) || t.kind === 'income') return t.kind === 'income' ? 'recv' : 'receipt';
    return t.kind === 'income' ? 'recv' : 'store';
  };

  /* ───────── formats ───────── */
  const F = (N.fmt = {});
  F.locale = () => (S.profile && S.profile.language) || 'fr-FR';
  F.main = () => (S.profile && S.profile.currency) || 'EUR';
  F.tz = () => (S.profile && S.profile.timezone) || 'UTC';
  F.symbol = (cur) => { try { const p = new Intl.NumberFormat(F.locale(), { style: 'currency', currency: cur || F.main() }).formatToParts(0).find((x) => x.type === 'currency'); return p ? p.value : cur; } catch (e) { return cur; } };
  F.money = (v, cur, o) => {
    o = o || {}; cur = cur || F.main();
    const r = Math.round((+v || 0) * 100) / 100;
    const dec = o.dec != null ? o.dec : Math.abs(r % 1) > 0.0001 ? 2 : 0;
    let s;
    try { s = new Intl.NumberFormat(F.locale(), { style: 'currency', currency: cur, minimumFractionDigits: dec, maximumFractionDigits: dec }).format(Math.abs(r)); }
    catch (e) { s = Math.abs(r).toFixed(dec) + ' ' + cur; }
    const sign = r < 0 ? '−' : o.plus && r > 0 ? '+' : '';
    return sign + s;
  };
  F.compact = (v, cur) => {
    cur = cur || F.main();
    if (Math.abs(v) < 10000) return F.money(v, cur);
    const n = new Intl.NumberFormat(F.locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(v) / 1000);
    return (v < 0 ? '−' : '') + n + ' k' + F.symbol(cur);
  };
  F.pct = (v, d) => new Intl.NumberFormat(F.locale(), { minimumFractionDigits: d == null ? 1 : d, maximumFractionDigits: d == null ? 1 : d }).format(v) + ' %';
  F.int = (v) => new Intl.NumberFormat(F.locale()).format(Math.round(v));

  /* ───────── dates (clés « AAAA-MM-JJ » dans le fuseau du profil) ───────── */
  const dkCache = {};
  N.dayKey = (d, tz) => {
    tz = tz || F.tz();
    const f = dkCache[tz] || (dkCache[tz] = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }));
    return f.format(d instanceof Date ? d : new Date(d));
  };
  N.today = () => N.dayKey(new Date());
  N.keyDate = (k) => new Date(k + 'T12:00:00Z');
  N.addDays = (k, n) => { const d = N.keyDate(k); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  N.diffDays = (a, b) => Math.round((N.keyDate(b) - N.keyDate(a)) / 864e5);
  N.addMonths = (k, n) => { const d = N.keyDate(k); d.setUTCMonth(d.getUTCMonth() + n, 1); return d.toISOString().slice(0, 10); };
  N.monthStart = (k) => k.slice(0, 8) + '01';
  N.daysInMonth = (k) => new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7), 0)).getUTCDate();
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  F.monthShort = (k) => cap(new Intl.DateTimeFormat(F.locale(), { month: 'short', timeZone: 'UTC' }).format(N.keyDate(k)).replace('.', ''));
  F.monthLong = (k) => cap(new Intl.DateTimeFormat(F.locale(), { month: 'long', timeZone: 'UTC' }).format(N.keyDate(k)));
  F.monthYear = (k) => cap(new Intl.DateTimeFormat(F.locale(), { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(N.keyDate(k)).replace('.', ''));
  F.wd = (k) => ['D', 'L', 'M', 'M', 'J', 'V', 'S'][N.keyDate(k).getUTCDay()];
  F.dayMonth = (k) => new Intl.DateTimeFormat(F.locale(), { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(N.keyDate(k));
  F.date = (k) => {
    if (!k) return '';
    if (k instanceof Date || k.length > 10) k = N.dayKey(k);
    const [y, m, d] = k.split('-');
    const fm = (S.profile && S.profile.date_format) || 'DD/MM/YYYY';
    if (fm === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
    if (fm === 'YYYY-MM-DD') return k;
    if (fm === 'D MMM YYYY') return `${+d} ${F.monthShort(k).toLowerCase()}. ${y}`;
    return `${d}/${m}/${y}`;
  };
  F.time = (iso) => new Intl.DateTimeFormat(F.locale(), { hour: '2-digit', minute: '2-digit', timeZone: F.tz() }).format(new Date(iso));
  F.groupLabel = (k) => {
    const t = N.today();
    if (k === t) return "Aujourd'hui";
    if (k === N.addDays(t, -1)) return 'Hier';
    return F.dayMonth(k);
  };
  F.dueChip = (d) => (d ? F.monthYear(d) : 'Sans date');

  /* ───────── taux de change : 1 unité de devise = x devise principale ───────── */
  const DEFAULT_EUR = { USD: 0.92, GBP: 1.17, CHF: 1.04, CAD: 0.67, MAD: 0.092, XOF: 0.001524, XAF: 0.001524, CDF: 0.00033 };
  N.fx = (cur) => {
    const main = F.main();
    if (!cur || cur === main) return 1;
    const r = S.profile && S.profile.fx_rates && S.profile.fx_rates[cur];
    if (r > 0) return +r;
    if (main === 'EUR' && DEFAULT_EUR[cur]) return DEFAULT_EUR[cur];
    return 1;
  };
  N.fxMissing = (cur) => cur !== F.main() && !(S.profile && S.profile.fx_rates && +S.profile.fx_rates[cur] > 0);
  N.CURRENCIES = { EUR: 'Euro — EUR (€)', USD: 'Dollar US — USD ($)', CDF: 'Franc congolais — CDF (FC)', GBP: 'Livre sterling — GBP (£)', CHF: 'Franc suisse — CHF', CAD: 'Dollar canadien — CAD', XOF: 'Franc CFA (BCEAO) — XOF', XAF: 'Franc CFA (BEAC) — XAF', MAD: 'Dirham marocain — MAD' };
  N.LANGS = { 'fr-FR': 'Français (France)', 'fr-BE': 'Français (Belgique)', 'fr-CA': 'Français (Canada)', 'fr-CH': 'Français (Suisse)' };
  N.TZ = ['Europe/Paris', 'Europe/Brussels', 'Europe/Zurich', 'Europe/London', 'Africa/Kinshasa', 'Africa/Lubumbashi', 'Africa/Abidjan', 'Africa/Dakar', 'Africa/Casablanca', 'Africa/Douala', 'America/Montreal', 'America/New_York', 'UTC'];
  N.DATEFMT = { 'DD/MM/YYYY': '18/11/2026', 'MM/DD/YYYY': '11/18/2026', 'YYYY-MM-DD': '2026-11-18', 'D MMM YYYY': '18 nov. 2026' };

  /* ───────── thèmes (couleur d'accent) ───────── */
  N.themes = {
    emeraude: { name: 'Émeraude', acc: '#1aa58a', acc2: '#58d0b4', soft: 'rgba(26,165,138,.14)', sw: 'linear-gradient(145deg,#6fe0c6,#17977c)' },
    corail: { name: 'Corail', acc: '#ee6a3e', acc2: '#f8a07e', soft: 'rgba(238,106,62,.15)', sw: 'linear-gradient(145deg,#ffa383,#e5572a)' },
    saphir: { name: 'Saphir', acc: '#3d6ff0', acc2: '#8aa9ff', soft: 'rgba(61,111,240,.14)', sw: 'linear-gradient(145deg,#8fb0ff,#2f5be0)' },
    ambre: { name: 'Ambre', acc: '#d9951a', acc2: '#f5c961', soft: 'rgba(217,149,26,.15)', sw: 'linear-gradient(145deg,#ffd878,#d18a0e)' }
  };
  N.applyTheme = (key) => {
    const t = N.themes[key] || N.themes.emeraude;
    const r = document.documentElement;
    r.style.setProperty('--acc', t.acc);
    r.style.setProperty('--acc2', t.acc2);
    r.style.setProperty('--accsoft', t.soft);
    r.dataset.acc = key;
  };
  N.applyPrefs = () => {
    const p = S.profile || {};
    N.applyTheme(p.accent || 'emeraude');
    document.documentElement.classList.toggle('glass-light', !!p.glass_light);
    document.documentElement.classList.toggle('no-anim', p.animations === false);
  };

  /* ───────── compteur à rouleaux (odomètre) ───────── */
  N.seen = {};
  N.roll = (el, text, key) => {
    if (!el) return;
    key = key || el.id || text;
    el.setAttribute('aria-label', text);
    if (!N.anim() || N.seen[key] === text) { el.textContent = text; N.seen[key] = text; return; }
    N.seen[key] = text;
    const frag = document.createDocumentFragment();
    let i = 0;
    for (const ch of text) {
      if (/[0-9]/.test(ch)) {
        const w = document.createElement('span'); w.className = 'dg'; w.setAttribute('aria-hidden', 'true');
        const s = document.createElement('span'); s.className = 'dg-in'; s.dataset.t = ch;
        s.innerHTML = '0123456789'.split('').map((d) => `<i>${d}</i>`).join('');
        s.style.transitionDelay = i * 45 + 'ms'; i++;
        w.appendChild(s); frag.appendChild(w);
      } else {
        const t = document.createElement('span'); t.className = 'ch'; t.setAttribute('aria-hidden', 'true'); t.textContent = ch; frag.appendChild(t);
      }
    }
    el.replaceChildren(frag);
    requestAnimationFrame(() => requestAnimationFrame(() => el.querySelectorAll('.dg-in').forEach((s) => { s.style.transform = `translateY(${-s.dataset.t}em)`; })));
  };
  N.rollAll = (root) => N.$$('[data-roll]', root).forEach((el) => N.roll(el, el.dataset.roll, el.dataset.key || el.dataset.roll + '|' + (el.id || '')));

  /* apparition en cascade : les éléments [data-in] se posent comme du verre */
  N.enter = (root) => {
    if (!N.anim()) return;
    N.$$('[data-in]', root).forEach((el, i) => {
      el.animate(
        [{ opacity: 0, transform: 'rotateX(18deg) translateY(14px)', filter: 'blur(18px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
        { duration: 1150, delay: i * 55, easing: EASE, fill: 'backwards' }
      );
    });
  };

  /* ───────── toast ───────── */
  N.toast = (msg, o) => {
    o = o || {};
    const host = N.$('#toasts');
    if (!host) return;
    const t = N.el(`<div class="toast ${o.err ? 'err' : ''}" role="status"><span class="toast-ic">${N.icon(o.err ? 'x' : o.icon || 'check', 15, 2.4)}</span><span>${N.esc(msg)}</span></div>`);
    host.appendChild(t);
    if (N.anim()) t.animate([{ opacity: 0, transform: 'translateY(16px) scale(.94)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 520, easing: EASE });
    setTimeout(() => {
      const out = N.anim() ? t.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(8px)' }], { duration: 320, fill: 'forwards' }).finished : Promise.resolve();
      out.then(() => t.remove());
    }, o.err ? 5200 : 3200);
  };
  N.fail = (e, ctx) => { console.error(e); N.toast((ctx ? ctx + ' : ' : '') + (e && e.message ? e.message : 'Erreur'), { err: true }); };

  /* ───────── fenêtre modale + formulaires ───────── */
  N.modal = (html, o) => {
    o = o || {};
    const host = N.$('#modals');
    const wrap = N.el(`<div class="modal-back"><div class="modal glass ${o.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`);
    host.appendChild(wrap);
    const box = wrap.firstElementChild;
    if (N.anim()) {
      wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      box.animate([{ opacity: 0, transform: 'rotateX(12deg) scale(.94)', filter: 'blur(16px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 650, easing: EASE });
    }
    const close = (v) => { document.removeEventListener('keydown', onKey); wrap.remove(); if (o.onClose) o.onClose(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(null); });
    N.$$('[data-close]', wrap).forEach((b) => b.addEventListener('click', () => close(null)));
    const first = N.$('input:not([type=hidden]),select,textarea', box);
    if (first && !o.noFocus) setTimeout(() => first.focus(), 60);
    return { wrap, box, close };
  };

  /* champs : {name,label,type:text|number|select|date|checkbox|textarea|email|password, options:[[v,l]], value, required, hint, step, min, span:2, placeholder, list:[...]} */
  N.form = (spec) => new Promise((resolve) => {
    const fields = spec.fields || [];
    const fid = (f) => 'f_' + f.name;
    const input = (f) => {
      const v = f.value == null ? '' : f.value;
      const req = f.required ? 'required' : '';
      if (f.type === 'select') return `<select id="${fid(f)}" name="${f.name}" ${req}>${f.options.map(([val, lab]) => `<option value="${N.esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${N.esc(lab)}</option>`).join('')}</select>`;
      if (f.type === 'textarea') return `<textarea id="${fid(f)}" name="${f.name}" rows="2" placeholder="${N.esc(f.placeholder || '')}">${N.esc(v)}</textarea>`;
      if (f.type === 'checkbox') return `<label class="chk"><input type="checkbox" id="${fid(f)}" name="${f.name}" ${v ? 'checked' : ''}><span class="chk-box">${N.icon('check', 13, 3)}</span><span>${N.esc(f.checkLabel || f.label)}</span></label>`;
      const list = f.list ? `list="dl_${f.name}"` : '';
      const dl = f.list ? `<datalist id="dl_${f.name}">${f.list.map((x) => `<option value="${N.esc(x)}">`).join('')}</datalist>` : '';
      return `<input id="${fid(f)}" name="${f.name}" type="${f.type || 'text'}" value="${N.esc(v)}" ${req} ${list} ${f.step ? `step="${f.step}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.maxlength ? `maxlength="${f.maxlength}"` : ''} ${f.pattern ? `pattern="${f.pattern}"` : ''} ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} placeholder="${N.esc(f.placeholder || '')}" autocomplete="${f.autocomplete || 'off'}">${dl}`;
    };
    const html = `<form class="mform" novalidate>
      <div class="mhead"><div><h3>${N.esc(spec.title)}</h3>${spec.sub ? `<p>${N.esc(spec.sub)}</p>` : ''}</div><button type="button" class="icon-btn" data-close aria-label="Fermer">${N.icon('x', 16, 2.2)}</button></div>
      ${spec.intro ? `<div class="mintro">${spec.intro}</div>` : ''}
      <div class="mgrid">${fields.map((f) => `<div class="fld ${f.span === 2 ? 'span2' : ''} ${f.type === 'checkbox' ? 'fld-chk' : ''}">${f.type === 'checkbox' ? '' : `<label for="${fid(f)}">${N.esc(f.label)}</label>`}${input(f)}${f.hint ? `<small>${N.esc(f.hint)}</small>` : ''}</div>`).join('')}</div>
      <p class="merr" hidden></p>
      <div class="mfoot">${spec.danger ? `<button type="button" class="btn danger" data-danger>${N.icon('trash', 15)} ${N.esc(spec.danger.label || 'Supprimer')}</button>` : '<span></span>'}
        <div class="mfoot-r"><button type="button" class="btn ghost" data-close>Annuler</button><button type="submit" class="btn dark">${N.esc(spec.submit || 'Enregistrer')}</button></div></div>
    </form>`;
    let done = false;
    const m = N.modal(html, { wide: spec.wide, onClose: (v) => { if (!done) { done = true; resolve(v == null ? null : v); } } });
    const form = N.$('form', m.box);
    const err = N.$('.merr', m.box);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = {};
      for (const f of fields) {
        const el = form.elements[f.name];
        let v = f.type === 'checkbox' ? el.checked : el.value.trim();
        if (f.required && f.type !== 'checkbox' && v === '') { err.hidden = false; err.textContent = `« ${f.label} » est obligatoire.`; el.focus(); return; }
        if (f.type === 'number') {
          if (v === '') v = null;
          else { v = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); if (Number.isNaN(v)) { err.hidden = false; err.textContent = `« ${f.label} » doit être un nombre.`; el.focus(); return; } if (f.min != null && v < f.min) { err.hidden = false; err.textContent = `« ${f.label} » doit être ≥ ${f.min}.`; el.focus(); return; } }
        }
        if (f.type === 'date' && v === '') v = null;
        out[f.name] = v;
      }
      if (spec.validate) { const msg = spec.validate(out); if (msg) { err.hidden = false; err.textContent = msg; return; } }
      const btn = N.$('button[type=submit]', form); btn.disabled = true;
      try { if (spec.onSubmit) await spec.onSubmit(out); done = true; m.close(out); resolve(out); }
      catch (ex) { btn.disabled = false; err.hidden = false; err.textContent = ex.message || 'Erreur'; }
    });
    const dg = N.$('[data-danger]', m.box);
    if (dg) dg.addEventListener('click', async () => {
      if (!dg.dataset.sure) { dg.dataset.sure = '1'; dg.innerHTML = `${N.icon('trash', 15)} Confirmer la suppression`; dg.classList.add('armed'); return; }
      dg.disabled = true;
      try { await spec.danger.run(); done = true; m.close({ deleted: true }); resolve({ deleted: true }); }
      catch (ex) { dg.disabled = false; err.hidden = false; err.textContent = ex.message || 'Erreur'; }
    });
  });

  /* confirmation simple */
  N.confirm = (title, text, label) => N.form({ title, intro: `<p>${text}</p>`, fields: [], submit: label || 'Confirmer' }).then((r) => !!r);

  /* ───────── utilitaires ───────── */
  N.download = (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type: type || 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  N.norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  N.initials = (s) => (String(s || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || '?').toUpperCase();
  N.uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Math.random().toString(16).slice(2));
})();

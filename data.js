/* data.js · tout ce qui parle à Supabase : connexion, lecture, écriture, import / export CSV, données d'exemple. */
(function () {
  'use strict';
  const N = window.NACRE, S = N.state;
  const C = window.NACRE_CONFIG || {};
  const T = (n) => (C.TABLE_PREFIX || '') + n;

  N.libMissing = !window.supabase;
  N.configured = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && !/À_REMPLIR/.test(C.SUPABASE_URL + C.SUPABASE_ANON_KEY));
  if (N.configured && !N.libMissing) {
    N.sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }

  const fail = (error) => { if (error) { const e = new Error(error.message || 'Erreur'); e.code = error.code; throw e; } };
  const num = (v) => (v == null ? v : Number(v));
  const api = (N.api = {});

  /* ───────── authentification ───────── */
  api.getSession = async () => { const { data, error } = await N.sb.auth.getSession(); fail(error); return data.session; };
  api.onAuth = (cb) => N.sb.auth.onAuthStateChange((ev, sess) => cb(ev, sess));
  api.signIn = async (email, password) => { const { data, error } = await N.sb.auth.signInWithPassword({ email, password }); fail(error); return data; };
  api.signUp = async (email, password, name) => {
    const { data, error } = await N.sb.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: location.origin + location.pathname } });
    fail(error); return data;
  };
  api.signOut = async () => { await N.sb.auth.signOut(); };
  api.resetPassword = async (email) => { const { error } = await N.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); fail(error); };
  api.setPassword = async (pw) => { const { error } = await N.sb.auth.updateUser({ password: pw }); fail(error); };

  /* ───────── profil ───────── */
  const normProfile = (p) => ({ ...p, annual_savings_goal: num(p.annual_savings_goal), auto_monthly_amount: num(p.auto_monthly_amount), fx_rates: p.fx_rates || {} });
  api.loadProfile = async (user) => {
    let { data, error } = await N.sb.from(T('profiles')).select('*').eq('user_id', user.id).maybeSingle();
    fail(error);
    if (!data) {
      let tz = 'Europe/Paris';
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) { /* ignore */ }
      const name = (user.user_metadata && user.user_metadata.name) || (user.email || '').split('@')[0] || '';
      const lang = /^fr-(BE|CA|CH)/.test(navigator.language || '') ? navigator.language.slice(0, 5) : 'fr-FR';
      const r = await N.sb.from(T('profiles')).insert({ user_id: user.id, display_name: name, timezone: tz, language: lang }).select().single();
      fail(r.error); data = r.data;
    }
    S.profile = normProfile(data);
  };
  api.saveProfile = async (patch) => {
    const { data, error } = await N.sb.from(T('profiles')).update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', S.user.id).select().single();
    fail(error); S.profile = normProfile(data); return S.profile;
  };

  /* ───────── lecture ───────── */
  api.loadMoney = async () => {
    const [a, g] = await Promise.all([
      N.sb.from(T('v_accounts')).select('*').order('position').order('created_at'),
      N.sb.from(T('v_goals')).select('*').order('position').order('created_at')
    ]);
    fail(a.error); fail(g.error);
    S.accounts = a.data.map((x) => ({ ...x, balance: num(x.balance), opening_balance: num(x.opening_balance) }));
    S.goals = g.data.map((x) => ({ ...x, target_amount: num(x.target_amount), initial_amount: num(x.initial_amount), saved_amount: num(x.saved_amount) }));
  };
  api.loadCore = async () => {
    const [c, b] = await Promise.all([
      N.sb.from(T('cards')).select('*').order('position').order('created_at'),
      N.sb.from(T('beneficiaries')).select('*').order('name')
    ]);
    fail(c.error); fail(b.error);
    S.cards = c.data.map((x) => ({ ...x, monthly_limit: num(x.monthly_limit) }));
    S.beneficiaries = b.data;
    await api.loadMoney();
  };
  api.loadTx = async (sinceKey) => {
    const out = []; const size = 1000; let from = 0;
    for (;;) {
      let q = N.sb.from(T('transactions')).select('*').order('occurred_at', { ascending: false }).order('id').range(from, from + size - 1);
      if (sinceKey) q = q.gte('occurred_at', sinceKey + 'T00:00:00Z');
      const { data, error } = await q; fail(error);
      out.push(...data);
      if (data.length < size || from > 60000) break;
      from += size;
    }
    S.tx = out.map((t) => ({ ...t, amount: num(t.amount) }));
    S.txSince = sinceKey || null;
  };

  /* index + champs calculés (jour dans le fuseau du profil, montant converti en devise principale) */
  api.prep = () => {
    S.accIdx = {}; S.accounts.forEach((a) => (S.accIdx[a.id] = a));
    S.cardIdx = {}; S.cards.forEach((c) => (S.cardIdx[c.id] = c));
    S.goalIdx = {}; S.goals.forEach((g) => (S.goalIdx[g.id] = g));
    S.tx.forEach((t) => {
      const a = S.accIdx[t.account_id];
      t._d = N.dayKey(t.occurred_at);
      t._cur = a ? a.currency : N.fmt.main();
      t._v = t.amount * N.fx(t._cur);
      t._in = t.kind === 'income';
      t._out = t.kind === 'expense' || t.kind === 'transfer';
      t._sav = t.kind === 'saving';
    });
    S.tx.sort((x, y) => (x.occurred_at < y.occurred_at ? 1 : x.occurred_at > y.occurred_at ? -1 : 0));
  };
  api.loadAll = async () => {
    await api.loadCore();
    const since = N.addMonths(N.monthStart(N.dayKey(new Date())), -24);
    await api.loadTx(since);
    api.prep();
  };

  /* ───────── écriture ───────── */
  api.insert = async (table, rows) => {
    const arr = Array.isArray(rows) ? rows : [rows];
    const { data, error } = await N.sb.from(T(table)).insert(arr).select(); fail(error);
    return Array.isArray(rows) ? data : data[0];
  };
  api.update = async (table, id, patch) => { const { data, error } = await N.sb.from(T(table)).update(patch).eq('id', id).select(); fail(error); return data[0]; };
  api.remove = async (table, id) => { const { error } = await N.sb.from(T(table)).delete().eq('id', id); fail(error); };
  api.removeWhere = async (table, col, val) => { const { error } = await N.sb.from(T(table)).delete().eq(col, val); fail(error); };
  api.removeAll = async (table) => { const { error } = await N.sb.from(T(table)).delete().not('id', 'is', null); fail(error); };
  api.rpc = async (name, args) => { const { data, error } = await N.sb.rpc(T(name), args || {}); fail(error); return data; };

  /* heure d'une opération : « maintenant » si c'est aujourd'hui, sinon midi UTC du jour choisi */
  N.at = (key, hh, mm) => {
    if (key === N.today() && hh == null) return new Date().toISOString();
    let d = new Date(`${key}T${String(hh == null ? 12 : hh).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}:00Z`);
    if (N.dayKey(d) !== key) d = new Date(`${key}T12:00:00Z`);
    return d.toISOString();
  };

  /* ───────── opérations métier ───────── */
  api.mainAccount = () => S.accounts.find((a) => a.is_main) || S.accounts[0] || null;

  api.addTx = async (row, opts) => {
    opts = opts || {};
    const t = await api.insert('transactions', row);
    S.tx.push({ ...t, amount: num(t.amount) });
    /* Arrondi : on arrondit chaque dépense à l'euro supérieur et on verse la différence sur le 1er objectif */
    if (!opts.skipRound && S.profile.auto_round && row.kind === 'expense' && S.goals.length) {
      const extra = Math.round((Math.ceil(row.amount) - row.amount) * 100) / 100;
      if (extra > 0 && extra < 1) {
        const r = await api.insert('transactions', { account_id: row.account_id, goal_id: S.goals[0].id, kind: 'saving', label: 'Arrondi · ' + row.label, category: 'Épargne', amount: extra, occurred_at: row.occurred_at });
        S.tx.push({ ...r, amount: num(r.amount) });
      }
    }
    await api.loadMoney(); api.prep();
    return t;
  };
  api.updateTx = async (id, patch) => { await api.update('transactions', id, patch); await api.reloadTx(); };
  api.deleteTx = async (id) => { await api.remove('transactions', id); await api.reloadTx(); };
  api.reloadTx = async () => { await api.loadTx(S.txSince); await api.loadMoney(); api.prep(); };

  /* virement : écrit dans TON registre NACRE (aucun argent ne bouge à ta banque) */
  api.sendTransfer = async ({ account, name, amount, label, note }) => {
    const benef = S.beneficiaries.find((b) => N.norm(b.name) === N.norm(name));
    return api.addTx({ account_id: account.id, kind: 'transfer', label: label || 'Virement à ' + (benef ? benef.name : name), category: 'Transfert', amount, counterparty: benef ? benef.name : name, note: note || null, occurred_at: new Date().toISOString() }, { skipRound: true });
  };

  /* épargne auto : virement mensuel (idempotent côté base) */
  api.runAutosave = async () => {
    const p = S.profile;
    if (!p.auto_monthly || !S.goals.length || !S.accounts.length) return 0;
    const n = await api.rpc('run_autosave', { p_amount: api.autosaveAmount() });
    if (n > 0) { await api.reloadTx(); const pr = await N.sb.from(T('profiles')).select('*').eq('user_id', S.user.id).single(); if (!pr.error) S.profile = normProfile(pr.data); }
    return n;
  };
  /* « Épargne intelligente » : règle simple, pas d'IA — 30 % du surplus moyen des 3 derniers mois, arrondi à 10 */
  api.autosaveAmount = () => {
    const p = S.profile; const base = p.auto_monthly_amount || 0;
    if (!p.auto_smart) return base;
    const cur = N.monthStart(N.today());
    let net = 0, n = 0;
    for (let i = 1; i <= 3; i++) {
      const m0 = N.addMonths(cur, -i), m1 = N.addDays(N.addMonths(cur, -i + 1), -1);
      let inc = 0, out = 0;
      S.tx.forEach((t) => { if (t._d >= m0 && t._d <= m1) { if (t._in) inc += t._v; else if (t._out) out += t._v; } });
      if (inc || out) { net += inc - out; n++; }
    }
    if (!n) return base;
    const smart = Math.floor((Math.max(0, net / n) * 0.3) / 10) * 10;
    return Math.max(base, smart);
  };

  /* ───────── CSV ───────── */
  api.exportCsv = () => {
    const rows = [['date', 'libelle', 'montant', 'categorie', 'compte', 'type', 'note']];
    S.tx.slice().sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : 1)).forEach((t) => {
      const a = S.accIdx[t.account_id];
      const signed = t._in ? t.amount : -t.amount;
      rows.push([t._d, t.label, String(signed).replace('.', ','), t.category, a ? a.name : '', t.kind, t.note || '']);
    });
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    N.download('nacre-operations-' + N.today() + '.csv', '﻿' + rows.map((r) => r.map(q).join(';')).join('\r\n'));
    return rows.length - 1;
  };
  api.csvTemplate = () => N.download('nacre-modele-import.csv', '﻿' + 'date;libelle;montant;categorie;compte;note\r\n2026-11-03;Paiement client — Exemple;2900,00;Clients;Compte courant;Facture 114\r\n2026-11-04;Café;-4,40;Restaurants;Compte courant;\r\n');

  const stripAcc = (s) => N.norm(s).replace(/ /g, '');
  const parseAmount = (s) => {
    let v = String(s == null ? '' : s).replace(/[\s  ]/g, '').replace(/[€$£]|eur|usd|cdf/gi, '').replace(/^\((.*)\)$/, '-$1');
    if (!v) return NaN;
    const lc = v.lastIndexOf(','), ld = v.lastIndexOf('.');
    if (lc > -1 && ld > -1) v = lc > ld ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '');
    else if (lc > -1) v = /,\d{1,2}$/.test(v) ? v.replace(',', '.') : v.replace(/,/g, '');
    return /^[-+]?\d*\.?\d+$/.test(v) ? parseFloat(v) : NaN;
  };
  api.parseAmount = parseAmount;
  const parseDate = (s) => {
    s = String(s || '').trim(); let m;
    const okYmd = (y, mo, d) => { const dt = new Date(Date.UTC(+y, +mo - 1, +d)); return dt.getUTCFullYear() === +y && dt.getUTCMonth() === +mo - 1 && dt.getUTCDate() === +d; };
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return okYmd(m[1], m[2], m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null;
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/))) {
      const us = (S.profile && S.profile.date_format) === 'MM/DD/YYYY';
      const d = us ? m[2] : m[1], mo = us ? m[1] : m[2];
      if (!okYmd(m[3], mo, d)) return null;
      return `${m[3]}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return null;
  };
  const splitCsv = (text) => {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = [';', '\t', ','].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x.trim() !== '')) rows.push(row); row = []; }
      else cur += ch;
    }
    row.push(cur); if (row.some((x) => x.trim() !== '')) rows.push(row);
    return rows;
  };
  api.parseCsv = (text) => {
    const rows = splitCsv(text); const errors = [];
    if (rows.length < 2) return { rows: [], errors: ['Le fichier est vide ou n\'a pas d\'en-tête.'] };
    const head = rows[0].map(stripAcc);
    const find = (...names) => head.findIndex((h) => names.includes(h));
    const ix = { date: find('date', 'jour', 'datedelaoperation'), label: find('libelle', 'label', 'description', 'intitule', 'objet'), amount: find('montant', 'amount', 'valeur', 'somme'), cat: find('categorie', 'category'), acc: find('compte', 'account'), note: find('note', 'notes', 'commentaire'), kind: find('type', 'kind', 'sens') };
    if (ix.date < 0 || ix.label < 0 || ix.amount < 0) return { rows: [], errors: ['Colonnes obligatoires introuvables : date, libelle, montant (voir le modèle).'] };
    const out = [];
    rows.slice(1).forEach((r, i) => {
      const line = i + 2;
      const d = parseDate(r[ix.date]); const amt = parseAmount(r[ix.amount]); const label = (r[ix.label] || '').trim();
      if (!d) { errors.push(`Ligne ${line} : date illisible « ${r[ix.date]} ».`); return; }
      if (Number.isNaN(amt) || amt === 0) { errors.push(`Ligne ${line} : montant illisible « ${r[ix.amount]} ».`); return; }
      if (!label) { errors.push(`Ligne ${line} : libellé vide.`); return; }
      let kind = amt > 0 ? 'income' : 'expense';
      if (ix.kind > -1) {
        const k = N.norm(r[ix.kind]);
        if (/^(income|entree|revenu|credit)/.test(k)) kind = 'income';
        else if (/^(transfer|virement)/.test(k)) kind = 'transfer';
        else if (/^(saving|epargne)/.test(k)) kind = 'saving';
        else if (/^(expense|sortie|depense|debit)/.test(k)) kind = 'expense';
      }
      out.push({ date: d, label: label.slice(0, 160), amount: Math.abs(amt), kind, category: ((ix.cat > -1 && r[ix.cat]) || (kind === 'income' ? 'Revenus' : 'Autre')).trim().slice(0, 60) || 'Autre', account: ix.acc > -1 ? (r[ix.acc] || '').trim() : '', note: ix.note > -1 ? (r[ix.note] || '').trim() || null : null });
    });
    return { rows: out, errors };
  };
  api.importRows = async (rows, onProgress) => {
    const main = api.mainAccount();
    if (!main) throw new Error('Crée d\'abord un compte (Paramètres → Comptes).');
    const byName = {}; S.accounts.forEach((a) => (byName[N.norm(a.name)] = a));
    const payload = rows.map((r) => ({ account_id: (byName[N.norm(r.account)] || main).id, occurred_at: N.at(r.date, 12, 0), label: r.label, category: r.category, kind: r.kind, amount: r.amount, note: r.note }));
    for (let i = 0; i < payload.length; i += 400) { await api.insert('transactions', payload.slice(i, i + 400)); if (onProgress) onProgress(Math.min(payload.length, i + 400), payload.length); }
    await api.loadTx(null); await api.loadMoney(); api.prep();
    return payload.length;
  };

  /* ───────── données d'exemple (marquées is_demo, supprimables d'un clic) ───────── */
  api.hasDemo = () => S.accounts.some((a) => a.is_demo) || S.goals.some((g) => g.is_demo) || S.tx.some((t) => t.is_demo);
  api.seedDemo = async () => {
    const rnd = (() => { let s = 20261122; return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    const main = F_main();
    const pos = S.accounts.length;
    const acc = await api.insert('accounts', [
      { name: 'Compte courant', currency: main, opening_balance: 28400, is_main: !S.accounts.length, position: pos, is_demo: true },
      { name: 'Compte USD', currency: 'USD', opening_balance: 4200, position: pos + 1, is_demo: true },
      { name: 'Réserve', currency: main, opening_balance: 9600, position: pos + 2, is_demo: true }
    ]);
    const ben = await api.insert('beneficiaries', [{ name: 'Clara Nguyen', note: 'Photographe', is_demo: true }, { name: 'Elsa Martin', note: 'Équipe', is_demo: true }]);
    const cp = S.cards.length;
    const cards = await api.insert('cards', [
      { account_id: acc[0].id, nickname: 'Andromis Studio', holder: (S.profile.display_name || 'Andromis').toUpperCase(), last4: '4821', expiry: '09/28', style: 'dark', monthly_limit: 5000, online_payments: true, contactless: true, atm_withdrawals: false, position: cp, is_demo: true },
      { account_id: acc[0].id, nickname: 'Voyages', holder: (S.profile.display_name || 'Andromis').toUpperCase(), last4: '9036', expiry: '03/29', style: 'emerald', monthly_limit: 1500, online_payments: true, contactless: true, atm_withdrawals: true, position: cp + 1, is_demo: true },
      { account_id: acc[0].id, nickname: 'Abonnements', holder: (S.profile.display_name || 'Andromis').toUpperCase(), last4: '1157', expiry: '12/27', style: 'light', monthly_limit: 600, online_payments: true, contactless: false, atm_withdrawals: false, position: cp + 2, is_demo: true }
    ]);
    const today = N.today(); const ym = N.monthStart(today);
    const gp = S.goals.length;
    const goalDefs = [
      ['MacBook Pro', 'laptop', 2800, 0.74, N.addMonths(ym, 7)], ['Voyage à Bali', 'plane', 3500, 0.64, N.addMonths(ym, 9)],
      ['Fonds d\'urgence', 'umbrella', 10000, 0.63, N.addMonths(ym, 13)], ['Nouvelle voiture', 'car', 15000, 0.26, N.addMonths(ym, 16)],
      ['Anniversaire de maman', 'gift', 600, 0.80, N.addMonths(ym, 2)]
    ];
    const savAmts = [420, 310, 260, 200, 150, 240, 180];
    const contrib = goalDefs.map(() => 0);
    const tx = [];
    const add = (key, label, amount, kind, category, o) => { if (key > today) return; o = o || {}; tx.push({ account_id: (o.acc || acc[0]).id, card_id: o.card ? o.card.id : null, occurred_at: N.at(key, o.hh || 10 + Math.floor(rnd() * 4), Math.floor(rnd() * 59)), label, category, kind, amount: Math.round(amount * 100) / 100, counterparty: o.cp || null, note: o.note || null, is_subscription: !!o.sub, is_demo: true, goal_id: o.goal || null }); };
    const lotdept = [2900, 3400, 2900, 4100, 3600, 3900, 4400, 3800], onixe = [4800, 4200, 3600, 4800, 3200, 3900, 4100, 4000];
    for (let m = 0; m < 8; m++) {
      const ms = N.addMonths(ym, -m); const dim = N.daysInMonth(ms); const D = (d) => N.addDays(ms, Math.min(d, dim) - 1);
      const old = (k) => k <= N.addDays(today, -5);
      if (m > 0) {
        if (old(D(4))) add(D(4), 'Paiement client — LOTDEPT', lotdept[m], 'income', 'Clients');
        if (old(D(12))) add(D(12), 'Paiement client — Onixe', onixe[m], 'income', 'Clients');
        if (m % 2 === 0) add(D(20), 'Paiement client — Studio Marée', 1800 + rnd() * 600, 'income', 'Clients');
      }
      if (old(D(2))) add(D(2), 'Hébergement Vercel', 21, 'expense', 'Logiciels', { sub: 1, card: cards[2] });
      if (old(D(5))) add(D(5), 'Abonnement Figma', 45, 'expense', 'Logiciels', { sub: 1, card: cards[2] });
      if (old(D(8))) add(D(8), 'Spotify Duo', 14.99, 'expense', 'Abonnements', { sub: 1, card: cards[2] });
      if (old(D(1))) add(D(1), 'Loyer bureau', 650, 'expense', 'Bureaux');
      if (old(D(27))) add(D(27), 'Salaire équipe — Elsa', 1200, 'expense', 'Équipe');
      if ([1, 4, 6].includes(m)) add(D(18), 'Air France — Lufthansa', 312, 'expense', 'Voyages', { card: cards[1] });
      if (m === 2) add(D(9), 'Apple Store', 1299, 'expense', 'Matériel', { card: cards[0] });
      for (let i = 0; i < 3; i++) { const d = D(6 + i * 7 + Math.floor(rnd() * 3)); if (old(d)) add(d, 'Café Kitsuné', 4.4, 'expense', 'Restaurants', { card: cards[0] }); }
      for (let i = 0; i < 2; i++) { const d = D(10 + i * 9); if (old(d)) add(d, 'Uber', 12 + rnd() * 14, 'expense', 'Transport', { card: cards[0] }); }
      if (m < 7) { const gi = m % goalDefs.length; contrib[gi] += savAmts[m]; add(D(6), 'Versement · ' + goalDefs[gi][0], savAmts[m], 'saving', 'Épargne', { acc: acc[0], hh: 11, goalIdx: gi }); }
    }
    /* les derniers jours, comme dans la vidéo */
    add(today, 'Hébergement Vercel', 21, 'expense', 'Logiciels', { sub: 1, card: cards[2], hh: 11 });
    add(today, 'Café Kitsuné', 4.4, 'expense', 'Restaurants', { card: cards[0], hh: 9 });
    add(today, 'Paiement client — LOTDEPT', 2900, 'income', 'Clients', { hh: 8 });
    add(N.addDays(today, -1), 'Paiement client — Onixe', 4800, 'income', 'Clients', { hh: 15 });
    add(N.addDays(today, -1), 'Virement à Clara Nguyen', 250, 'transfer', 'Transfert', { cp: 'Clara Nguyen', hh: 12 });
    add(N.addDays(today, -1), 'Spotify Duo', 14.99, 'expense', 'Abonnements', { sub: 1, card: cards[2], hh: 9 });
    add(N.addDays(today, -2), 'Apple Store', 129, 'expense', 'Matériel', { card: cards[0], hh: 14 });
    add(N.addDays(today, -3), 'Uber', 18.5, 'expense', 'Transport', { card: cards[0], hh: 19 });
    add(N.addDays(today, -4), 'Abonnement Figma', 45, 'expense', 'Logiciels', { sub: 1, card: cards[2], hh: 9 });
    add(N.addDays(today, -4), 'Air France — Lufthansa', 312, 'expense', 'Voyages', { card: cards[1], hh: 13 });
    add(N.addDays(today, -4), 'Remboursement d\'Elsa', 60, 'income', 'Équipe', { hh: 16 });
    /* objectifs : montant de départ calculé pour tomber sur les pourcentages voulus */
    const goals = await api.insert('goals', goalDefs.map((g, i) => ({ name: g[0], icon: g[1], target_amount: g[2], initial_amount: Math.max(0, Math.round(g[2] * g[3] - contrib[i])), due_date: g[4], position: gp + i, is_demo: true })));
    const goalIdxByLabel = {}; goalDefs.forEach((g, i) => (goalIdxByLabel['Versement · ' + g[0]] = goals[i].id));
    tx.forEach((t) => { if (t.kind === 'saving' && goalIdxByLabel[t.label]) t.goal_id = goalIdxByLabel[t.label]; });
    for (let i = 0; i < tx.length; i += 300) await api.insert('transactions', tx.slice(i, i + 300));
    await api.loadAll();
    return tx.length;
  };
  const F_main = () => N.fmt.main();
  api.deleteDemo = async () => {
    for (const t of ['transactions', 'goals', 'cards', 'beneficiaries', 'accounts']) await api.removeWhere(t, 'is_demo', true);
    await api.loadAll();
  };
  api.deleteEverything = async () => {
    for (const t of ['transactions', 'goals', 'cards', 'beneficiaries', 'accounts']) await api.removeAll(t);
    await api.loadAll();
  };
})();

/* views.js · Vue d'ensemble, Activité, Épargne & objectifs, Paramètres. */
(function () {
  'use strict';
  const N = window.NACRE, S = N.state, F = N.fmt, calc = N.calc, ch = N.charts;
  N.views = N.views || {};
  N.changes = N.changes || {};
  S.period = S.period || 'month'; S.actFilter = S.actFilter || 'all'; S.search = S.search || ''; S.actLimit = 80;

  const roll = (text, key, cls) => `<span class="${cls || ''}" data-roll="${N.esc(text)}" data-key="${key}">${N.esc(text)}</span>`;
  const seg = (act, items, cur) => `<div class="seg" role="group">${items.map(([k, l]) => `<button type="button" data-act="${act}" data-p="${k}" class="${cur === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const periodWord = { day: ['du jour', 'hier'], week: ['de la semaine', '7 j. précédents'], month: ['du mois', 'le mois dernier'] };
  const empty = (icon, title, text, btn) => `<div class="empty tile" data-in><div class="empty-ic">${N.icon(icon, 26)}</div><h3>${title}</h3><p>${text}</p>${btn || ''}</div>`;

  /* ═══════════════════════ VUE D'ENSEMBLE ═══════════════════════ */
  N.views.overview = {
    title: "Vue d'ensemble",
    html() {
      const name = S.profile.display_name || 'toi';
      const head = `<header class="page-head" data-in><div><h1>Bonjour, ${N.esc(name)}</h1><p class="sub">${S.accounts.length ? `Voici l'état de tes finances au ${F.date(N.today())}.` : 'Bienvenue sur NACRE. Commence par ajouter tes vraies données.'}</p></div>
        <div class="head-tools">${seg('ov-period', [['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois']], S.period)}<button type="button" class="btn ghost" data-act="export">${N.icon('download', 15)} Exporter</button></div></header>`;
      if (!S.accounts.length) {
        return head + `<div class="welcome tile" data-in><div class="welcome-ic">${N.icon('drop', 30)}</div><h2>Ton espace est vide, c'est normal.</h2><p>NACRE ne contient que tes propres données. Trois façons de démarrer :</p>
          <div class="welcome-steps">
            <button type="button" class="ws" data-act="acc-new"><span>1</span><b>Créer un compte</b><small>Ton compte bancaire, ta caisse ou ton portefeuille mobile, avec son solde actuel.</small></button>
            <button type="button" class="ws" data-act="csv-import"><span>2</span><b>Importer un CSV</b><small>Reprends ton historique depuis ta banque ou un tableur.</small></button>
            <button type="button" class="ws" data-act="demo-load"><span>3</span><b>Voir avec des exemples</b><small>Des données fictives pour tout essayer. Supprimables en un clic.</small></button>
          </div></div>`;
      }
      const per = S.period, r = calc.range(per), pw = periodWord[per];
      const dc = S.dispCur || F.main(), dfx = N.fx(dc);
      const total = calc.totalBalance();
      const inc = calc.inc(r.from, r.to), pinc = calc.inc(r.pf, r.pt), exp = calc.exp(r.from, r.to), pexp = calc.exp(r.pf, r.pt);
      const cl = calc.clients(r.from, r.to), pcl = calc.clients(r.pf, r.pt);
      const y0 = N.today().slice(0, 4) + '-01-01', py0 = (+N.today().slice(0, 4) - 1) + '-01-01', pyEnd = (+N.today().slice(0, 4) - 1) + N.today().slice(4);
      const ytd = calc.inc(y0, N.today()), pytd = calc.inc(py0, pyEnd);
      const flow = inc - exp - calc.sav(r.from, r.to);
      const prevBal = total - flow;
      const curs = Array.from(new Set([F.main()].concat(S.accounts.map((a) => a.currency))));
      const kpi = (cls, label, valKey, val, badge, sub, icon) => `<article class="tile kpi ${cls}" data-in><div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-ic">${N.icon(icon, 14, 2.2)}</span></div>${roll(val, valKey, 'kpi-val')}<div class="kpi-foot">${badge}<span>${sub}</span></div></article>`;
      /* profits & pertes : 7 mois */
      const t0 = N.today(), months = [];
      for (let j = 6; j >= 0; j--) { const m0 = N.addMonths(N.monthStart(t0), -j); const m1 = N.addDays(N.addMonths(m0, 1), -1); months.push({ m0, m1: m1 > t0 ? t0 : m1 }); }
      const mv = months.map((m) => ({ lab: F.monthShort(m.m0), i: calc.inc(m.m0, m.m1), o: calc.exp(m.m0, m.m1) }));
      const mmax = Math.max(1, ...mv.map((m) => Math.max(m.i, m.o)));
      const goal = S.goals[0];
      const recent = S.tx.slice(0, 6);
      const subs = S.accounts.slice(0, 3);
      return head + `<div class="ov-grid">
        <article class="tile balance" data-in>
          <div class="bal-top"><span class="kpi-label">Solde total</span><label class="pill-sel"><select data-change="disp-cur" aria-label="Devise d'affichage">${curs.map((c) => `<option ${c === dc ? 'selected' : ''}>${c}</option>`).join('')}</select>${N.icon('chev', 13, 2.4)}</label></div>
          ${roll(F.money(total / dfx, dc, { dec: 2 }), 'ov-bal', 'bal-val')}
          <div class="bal-sub">${ch.badge(calc.delta(total, prevBal))}<span>vs ${pw[1]}</span></div>
          <div class="bal-btns"><button type="button" class="btn dark lg" data-act="transfer">${N.icon('send', 16)} Virer</button><button type="button" class="btn light lg" data-act="receive">${N.icon('recv', 16)} Recevoir</button></div>
          <div class="subacc"><div class="subacc-h"><b>Sous-comptes</b><button type="button" class="link" data-go="settings">Gérer</button></div>
            <div class="subacc-row">${subs.map((a) => `<button type="button" class="subacc-t" data-act="acc-edit" data-id="${a.id}"><span class="sa-ic">${N.icon(a.currency === 'EUR' ? 'euro' : 'wallet', 15)}</span><b>${F.money(a.balance, a.currency, { dec: 0 })}</b><small>${N.esc(a.name)}</small></button>`).join('')}<button type="button" class="subacc-t add" data-act="acc-new" aria-label="Nouveau compte">${N.icon('plus', 18, 2.2)}</button></div></div>
        </article>
        ${kpi('accent', 'Revenus ' + pw[0], 'ov-inc', F.money(inc), ch.badge(calc.delta(inc, pinc)), 'vs ' + pw[1], 'up')}
        ${kpi('', 'Dépenses', 'ov-exp', F.money(exp), ch.badge(calc.delta(exp, pexp), { invert: true }), 'vs ' + pw[1], 'down')}
        <article class="tile pl" data-in><div class="tile-head"><h3>Profits &amp; pertes</h3><div class="legend"><span><i style="background:var(--acc)"></i>Gains</span><span><i style="background:var(--c4)"></i>Pertes</span></div></div>
          <div class="pl-bars">${mv.map((m, i) => `<div class="pl-col" tabindex="0"><div class="pl-tip"><b>${F.money(m.i - m.o, null, { plus: true, dec: 0 })}</b><small>${m.lab}</small></div><div class="pl-pair"><i class="pl-b g" style="--h:${Math.max(3, (m.i / mmax) * 100)}%;--d:${i * 70}ms"></i><i class="pl-b d" style="--h:${Math.max(3, (m.o / mmax) * 100)}%;--d:${i * 70 + 40}ms"></i></div><span>${m.lab}</span></div>`).join('')}</div></article>
        ${kpi('', 'Entrées', 'ov-cl', F.money(cl), ch.badge(calc.delta(cl, pcl)), 'paiements clients', 'recv')}
        ${kpi('', "Chiffre d'affaires", 'ov-ytd', F.money(ytd), ch.badge(calc.delta(ytd, pytd)), 'depuis janvier', 'chart')}
        <article class="tile goal-mini" data-in>${goal ? `<div class="tile-head"><h3>Objectif · ${N.esc(goal.name)}</h3><button type="button" class="link" data-go="savings">Tout voir</button></div>
          <div class="gm-row">${roll(F.money(goal.saved_amount), 'ov-goal', 'gm-val')}<small>sur ${F.money(goal.target_amount)}</small></div>
          <div class="bar"><i style="--w:${Math.min(100, (goal.saved_amount / goal.target_amount) * 100)}%"></i></div><div class="gm-foot"><b>${Math.round(Math.min(100, (goal.saved_amount / goal.target_amount) * 100))} %</b><span>${goal.due_date ? 'avant ' + F.dueChip(goal.due_date) : 'sans échéance'}</span></div>`
          : `<div class="tile-head"><h3>Objectif</h3></div><p class="muted">Aucun objectif pour l'instant.</p><button type="button" class="btn dark" data-act="goal-new">${N.icon('plus', 15, 2.4)} Créer un objectif</button>`}</article>
        <article class="tile cards-mini" data-in><div class="tile-head"><h3>Cartes</h3><button type="button" class="link" data-go="cards">Gérer</button></div>
          ${S.cards.length ? `<div class="cm-row">${S.cards.slice(0, 2).map((c, i) => `<button type="button" class="minicard lg bc-${c.style} ${c.frozen ? 'frozen' : ''}" data-act="card-open" data-i="${i}"><span class="mc-num">•••• ${c.last4}</span><span class="mc-name">${N.esc(c.nickname)}</span></button>`).join('')}</div>` : `<p class="muted">Aucune carte enregistrée.</p><button type="button" class="btn dark" data-act="card-new">${N.icon('plus', 15, 2.4)} Ajouter une carte</button>`}</article>
        <article class="tile ops" data-in><div class="tile-head"><h3>Dernières opérations</h3><button type="button" class="link" data-go="activity">Tout voir</button></div>
          ${recent.length ? `<ul class="oplist">${recent.map((t) => N.views.rowHtml(t, true)).join('')}</ul>` : `<p class="muted">Aucune opération.</p><button type="button" class="btn dark" data-act="tx-new">${N.icon('plus', 15, 2.4)} Ajouter une opération</button>`}</article>
      </div>`;
    },
    mount(root, o) { }
  };

  /* ligne d'opération (partagée entre l'accueil et l'activité) */
  N.views.rowHtml = (t, compact) => {
    const signed = t._in ? t._v : -t._v;
    const a = S.accIdx[t.account_id];
    const native = a && a.currency !== F.main() ? ` <small class="cur">${F.money(t._in ? t.amount : -t.amount, a.currency, { dec: 2 })}</small>` : '';
    return `<li><button type="button" class="op ${t._in ? 'in' : ''} ${t._sav ? 'sav' : ''}" data-act="tx-edit" data-id="${t.id}"><span class="op-ic">${N.icon(N.txIcon(t), 17)}</span><span class="op-t"><b>${N.esc(t.label)}</b><small>${N.esc(t.kind === 'saving' ? 'Épargne' : t.category || '')}${compact ? ' · ' + F.groupLabel(t._d) : t.card_id && S.cardIdx[t.card_id] ? ' · •••• ' + S.cardIdx[t.card_id].last4 : ''}${t.is_subscription ? ' · abonnement' : ''}</small></span><span class="op-a">${F.money(signed, null, { dec: 2, plus: true })}${native}</span></button></li>`;
  };

  /* ═══════════════════════ ACTIVITÉ ═══════════════════════ */
  const actFilter = (t) => {
    const f = S.actFilter;
    if (f === 'in' && !t._in) return false;
    if (f === 'out' && !(t._out || t._sav)) return false;
    if (f === 'sub' && !t.is_subscription) return false;
    if (S.search) { const q = N.norm(S.search); if (!N.norm(t.label + ' ' + (t.category || '') + ' ' + (t.note || '') + ' ' + (t.counterparty || '')).includes(q)) return false; }
    return true;
  };
  const actList = () => {
    const rows = S.tx.filter(actFilter);
    if (!rows.length) return `<div class="empty-in"><p>${S.tx.length ? 'Aucune opération ne correspond.' : 'Aucune opération pour l\'instant.'}</p>${S.tx.length ? '' : `<button type="button" class="btn dark" data-act="tx-new">${N.icon('plus', 15, 2.4)} Ajouter une opération</button> <button type="button" class="btn ghost" data-act="csv-import">${N.icon('upload', 15)} Importer un CSV</button>`}</div>`;
    let html = '', cur = '';
    rows.slice(0, S.actLimit).forEach((t) => {
      if (t._d !== cur) { if (cur) html += '</ul>'; cur = t._d; html += `<h4 class="grp">${F.groupLabel(t._d)}</h4><ul class="oplist">`; }
      html += N.views.rowHtml(t);
    });
    html += '</ul>';
    if (rows.length > S.actLimit) html += `<button type="button" class="btn ghost more" data-act="act-more">Afficher plus (${rows.length - S.actLimit})</button>`;
    if (S.txSince) html += `<button type="button" class="btn ghost more" data-act="tx-all">${N.icon('refresh', 14)} Charger tout l'historique</button>`;
    return html;
  };
  N.views.activity = {
    title: 'Activité',
    html() {
      const t = N.today(), days = [];
      for (let i = 6; i >= 0; i--) days.push(N.addDays(t, -i));
      let cum = 0; const cumv = days.map((d) => { cum += calc.inc(d, d) - calc.exp(d, d) - calc.sav(d, d); return cum; });
      const m30 = N.addDays(t, -29);
      const cats = calc.byCat(m30, t, (x) => x._in || x._out).slice(0, 4); const ctot = cats.reduce((s, c) => s + c.v, 0) || 1;
      const subs = calc.sum(m30, t, (x) => x._out && x.is_subscription);
      const inc30 = calc.inc(m30, t), exp30 = calc.exp(m30, t);
      let insight;
      if (!S.tx.length) insight = ['Commence ici', 'Ajoute ta première opération pour voir tes flux.', 'Ajouter', 'tx-new', ''];
      else if (subs > 0) insight = ['Tes abonnements', `Ils pèsent ${F.money(subs)} ces 30 derniers jours.`, 'Voir', 'act-subs', ''];
      else insight = ['Ton épargne du mois', inc30 > 0 ? `Tu gardes ${F.pct(Math.max(0, ((inc30 - exp30) / inc30) * 100), 0)} de tes revenus.` : 'Pas encore de revenus sur 30 jours.', 'Rapports', 'go-reports', ''];
      return `<header class="page-head" data-in><div><h1>Activité</h1><p class="sub">Suis tes paiements, tes encaissements et tes abonnements.</p></div>
        <div class="head-tools"><label class="search"><span>${N.icon('search', 15)}</span><input id="actSearch" data-input="act-search" type="search" placeholder="Rechercher" value="${N.esc(S.search)}" aria-label="Rechercher une opération"></label>${seg('act-filter', [['all', 'Tout'], ['in', 'Entrées'], ['out', 'Sorties'], ['sub', 'Abonnements']], S.actFilter)}<button type="button" class="btn dark" data-act="tx-new">${N.icon('plus', 15, 2.4)} Nouvelle</button></div></header>
        <div class="act-grid"><article class="tile act-list" data-in id="actList">${actList()}</article>
        <div class="act-side">
          <article class="tile flux" data-in><span class="kpi-label">Flux net de la semaine</span>${roll(F.money(cumv[cumv.length - 1], null, { plus: true, dec: 0 }), 'flux', 'flux-val')}${ch.spark(cumv, days.map((d) => F.wd(d)))}</article>
          <article class="tile cats" data-in><div class="tile-head"><h3>Par catégorie</h3><small class="muted">30 jours</small></div>${cats.length ? cats.map((c, i) => `<div class="cat-row"><span>${N.esc(c.cat)}</span><div class="bar sm"><i style="--w:${(c.v / ctot) * 100}%;background:${ch.catColor(i)}"></i></div><b>${F.pct((c.v / ctot) * 100, 0)}</b></div>`).join('') : '<p class="muted">Rien à afficher pour le moment.</p>'}</article>
          <article class="tile insight" data-in><span class="orb"></span><div><b>${insight[0]}</b><small>${insight[1]}</small></div><button type="button" class="btn dark sm" data-act="${insight[3]}">${insight[2]}</button></article>
        </div></div>`;
    }
  };
  N.acts['act-filter'] = (el) => { S.actFilter = el.dataset.p; S.actLimit = 80; N.refresh(); };
  N.acts['act-subs'] = () => { S.actFilter = 'sub'; N.refresh(); };
  N.acts['act-more'] = () => { S.actLimit += 100; N.$('#actList').innerHTML = actList(); };
  N.acts['tx-all'] = async () => { try { await N.api.loadTx(null); N.api.prep(); S.actLimit = 200; N.refresh(); } catch (e) { N.fail(e); } };
  N.acts['go-reports'] = () => N.go('reports');
  N.inputs = N.inputs || {};
  N.inputs['act-search'] = (el) => { S.search = el.value; S.actLimit = 80; const l = N.$('#actList'); if (l) l.innerHTML = actList(); };

  /* ═══════════════════════ ÉPARGNE & OBJECTIFS ═══════════════════════ */
  N.views.savings = {
    title: 'Épargne & objectifs',
    html() {
      const p = S.profile, t = N.today();
      const total = calc.totalSaved();
      const ms = N.monthStart(t), thisMonth = calc.sav(ms, t);
      const yStart = t.slice(0, 4) + '-01-01', yearSaved = calc.sav(yStart, t), yg = p.annual_savings_goal || 0;
      const ypct = yg > 0 ? Math.min(100, (yearSaved / yg) * 100) : 0;
      const bars = []; for (let j = 6; j >= 0; j--) { const m0 = N.addMonths(ms, -j), m1 = N.addDays(N.addMonths(m0, 1), -1); bars.push({ lab: F.monthShort(m0), v: calc.sav(m0, m1 > t ? t : m1) }); }
      const bmax = Math.max(1, ...bars.map((b) => b.v));
      const on = p.auto_round || p.auto_monthly || p.auto_smart;
      const sw = (k, on2) => `<button type="button" class="sw ${on2 ? 'on' : ''}" data-act="auto-toggle" data-k="${k}" role="switch" aria-checked="${!!on2}"><i></i></button>`;
      const smartAmt = N.api.autosaveAmount();
      return `<header class="page-head" data-in><div><h1>Épargne &amp; objectifs</h1><p class="sub">Mets de côté pour toi, un projet après l'autre.</p></div><div class="head-tools"><button type="button" class="btn dark" data-act="goal-new">${N.icon('plus', 15, 2.4)} Nouvel objectif</button></div></header>
      <div class="sv-top">
        <article class="tile sv-main" data-in><div class="sv-left"><span class="kpi-label">Total épargné</span>${roll(F.money(total, null, { dec: 2 }), 'sv-total', 'sv-total')}<div class="sv-badge">${ch.badge(calc.delta(thisMonth, calc.sav(N.addMonths(ms, -1), N.addDays(ms, -1))))}<span>${F.money(thisMonth)} versés ce mois-ci</span></div>
            <div class="bar"><i style="--w:${ypct}%;background:var(--acc)"></i></div><p class="sv-cap"><b>${F.pct(ypct, 0)}</b> de l'objectif annuel de ${F.money(yg)} <button type="button" class="icon-btn sm" data-act="year-goal" aria-label="Modifier l'objectif annuel">${N.icon('pencil', 12)}</button></p></div>
          <div class="sv-bars">${bars.map((b, i) => `<div class="sv-col ${i === bars.length - 1 ? 'cur' : ''}" title="${F.money(b.v)}"><i style="--h:${Math.max(6, (b.v / bmax) * 100)}%;--d:${i * 70}ms"></i><span>${b.lab}</span></div>`).join('')}</div></article>
        <article class="tile sv-auto" data-in><div class="tile-head"><h3>Épargne auto</h3><span class="badge ${on ? 'pos' : 'neu'}">${on ? 'Actif' : 'Inactif'}</span></div>
          <ul class="autos">
            <li><span class="ctl-ic">${N.icon('swap', 16)}</span><span class="ctl-l"><b>Arrondi</b><small>Arrondit chaque achat à l'euro</small></span>${sw('auto_round', p.auto_round)}</li>
            <li><span class="ctl-ic">${N.icon('cal', 16)}</span><span class="ctl-l"><b>Virement mensuel</b><small>${F.money(smartAmt)} le 1er du mois <button type="button" class="icon-btn sm" data-act="epargne-monthly" aria-label="Modifier le montant">${N.icon('pencil', 11)}</button></small></span>${sw('auto_monthly', p.auto_monthly)}</li>
            <li><span class="ctl-ic">${N.icon('spark', 16)}</span><span class="ctl-l"><b>Épargne intelligente</b><small>Ajuste selon tes dépenses</small></span>${sw('auto_smart', p.auto_smart)}</li>
          </ul></article>
      </div>
      <div class="goals">${S.goals.map((g) => {
        const pct = Math.min(100, (g.saved_amount / g.target_amount) * 100);
        return `<article class="tile goal" data-in data-act="goal-edit" data-id="${g.id}" tabindex="0" role="button" aria-label="Modifier ${N.esc(g.name)}"><div class="goal-top"><span class="goal-ic">${N.icon(g.icon, 16)}</span><span class="chip">${F.dueChip(g.due_date)}</span></div>
          <div class="goal-ring">${ch.ring(pct, { size: 104, stroke: 9 })}<b>${Math.round(pct)} %</b></div><h4>${N.esc(g.name)}</h4><small>${F.money(g.saved_amount, null, { dec: 0 })} / ${F.money(g.target_amount, null, { dec: 0 })}</small>
          <button type="button" class="btn light sm" data-act="goal-add" data-id="${g.id}">${N.icon('plus', 13, 2.6)} Ajouter</button></article>`;
      }).join('')}<button type="button" class="tile goal new" data-in data-act="goal-new"><span class="goal-plus">${N.icon('plus', 22, 2)}</span><b>Nouvel objectif</b></button></div>`;
    },
    mount(root, o) { ch.ringsGo(root, o && o.animate); }
  };
  N.acts['year-goal'] = async () => {
    await N.form({ title: 'Objectif annuel', sub: 'Combien veux-tu mettre de côté cette année ?', fields: [{ name: 'v', label: 'Montant', type: 'number', step: '1', min: 0, required: true, value: S.profile.annual_savings_goal, span: 2 }], submit: 'Enregistrer', onSubmit: async (v) => { await N.api.saveProfile({ annual_savings_goal: v.v }); N.toast('Objectif annuel mis à jour'); N.refresh(); } });
  };
  N.acts['auto-toggle'] = async (el) => {
    const k = el.dataset.k, v = !S.profile[k];
    try {
      const patch = { [k]: v };
      if (k === 'auto_monthly' && v) patch.last_autosave_month = N.monthStart(N.today());
      await N.api.saveProfile(patch);
      N.refresh();
      const lab = { auto_round: 'Arrondi', auto_monthly: 'Virement mensuel', auto_smart: 'Épargne intelligente' }[k];
      N.toast(`${lab} : ${v ? 'activé' : 'désactivé'}`);
      if (k === 'auto_monthly' && v) N.toast(`Premier versement le 1er ${F.monthLong(N.addMonths(N.monthStart(N.today()), 1)).toLowerCase()}`, { icon: 'cal' });
    } catch (e) { N.fail(e); }
  };

  /* ═══════════════════════ PARAMÈTRES ═══════════════════════ */
  N.views.settings = {
    title: 'Paramètres',
    html() {
      const p = S.profile;
      const sel = (id, label, opts, val) => `<div class="fld"><label for="${id}">${label}</label><select id="${id}">${opts.map(([v, l]) => `<option value="${N.esc(v)}" ${v === val ? 'selected' : ''}>${N.esc(l)}</option>`).join('')}</select></div>`;
      const tzs = Array.from(new Set(N.TZ.concat([p.timezone])));
      const sw = (k, on) => `<button type="button" class="sw ${on ? 'on' : ''}" data-act="pref-toggle" data-k="${k}" role="switch" aria-checked="${!!on}"><i></i></button>`;
      const fxCurs = Array.from(new Set(S.accounts.map((a) => a.currency))).filter((c) => c !== F.main());
      return `<header class="page-head" data-in><div><h1>Paramètres</h1><p class="sub">Personnalise ton espace NACRE.</p></div></header>
      <div class="set-grid">
        <article class="tile" data-in><div class="tile-head"><div><h3>Général</h3><small class="muted">Langue, devise et affichage de ton compte.</small></div></div>
          <div class="fgrid">
            <div class="fld"><label for="s_name">Nom affiché</label><input id="s_name" value="${N.esc(p.display_name)}" maxlength="40"></div>
            ${sel('s_lang', 'Langue', Object.entries(N.LANGS), p.language)}
            ${sel('s_cur', 'Devise principale', Object.entries(N.CURRENCIES), p.currency)}
            ${sel('s_tz', 'Fuseau horaire', tzs.map((z) => [z, z.replace('_', ' ')]), p.timezone)}
            ${sel('s_df', 'Format de date', Object.entries(N.DATEFMT), p.date_format)}
          </div><div class="tile-foot"><button type="button" class="btn dark" data-act="save-general">Enregistrer</button></div></article>
        <article class="tile" data-in><div class="tile-head"><div><h3>Couleur d'accent</h3><small class="muted">Elle glisse sur tout le tableau de bord.</small></div></div>
          <div class="acc-wrap"><div class="swatches">${Object.entries(N.themes).map(([k, t]) => `<button type="button" class="swatch ${p.accent === k ? 'on' : ''}" data-act="theme-pick" data-k="${k}" aria-label="${t.name}"><i style="background:${t.sw}"></i><span>${t.name}</span></button>`).join('')}</div>
            <div class="preview"><div class="pv-card"><small>Revenu du mois</small><b>6 090 €</b></div><div class="pv-bars"><i style="--h:40%"></i><i style="--h:62%"></i><i style="--h:48%"></i><i style="--h:80%"></i></div><span class="pv-ring"></span></div></div>
          <ul class="ctls tight"><li><span class="ctl-l"><b>Verre plus clair</b></span>${sw('glass_light', p.glass_light)}</li><li><span class="ctl-l"><b>Animations</b></span>${sw('animations', p.animations !== false)}</li></ul></article>
        <article class="tile" data-in><div class="tile-head"><div><h3>Comptes</h3><small class="muted">Tes vrais comptes et leurs soldes de départ.</small></div><button type="button" class="btn dark sm" data-act="acc-new">${N.icon('plus', 13, 2.6)} Nouveau</button></div>
          <ul class="rows">${S.accounts.length ? S.accounts.map((a) => `<li><button type="button" data-act="acc-edit" data-id="${a.id}"><span class="r-t"><b>${N.esc(a.name)}</b><small>${a.currency}${a.is_main ? ' · principal' : ''}${a.is_demo ? ' · exemple' : ''}</small></span><span class="r-v">${F.money(a.balance, a.currency)}</span></button></li>`).join('') : '<li class="muted">Aucun compte.</li>'}</ul>
          ${fxCurs.length ? `<h4 class="sub-h">Taux de change</h4><ul class="rows">${fxCurs.map((c) => `<li><button type="button" data-act="fx-edit" data-cur="${c}"><span class="r-t"><b>1 ${c}</b>${N.fxMissing(c) ? '<small class="warn">taux estimé, à ajuster</small>' : '<small>modifiable</small>'}</span><span class="r-v">${new Intl.NumberFormat(F.locale(), { maximumFractionDigits: 6 }).format(N.fx(c))} ${F.main()}</span></button></li>`).join('')}</ul>` : ''}</article>
        <article class="tile" data-in><div class="tile-head"><div><h3>Bénéficiaires</h3><small class="muted">Pour « Envoie 250 € à Clara ».</small></div><button type="button" class="btn dark sm" data-act="ben-new">${N.icon('plus', 13, 2.6)} Nouveau</button></div>
          <ul class="rows">${S.beneficiaries.length ? S.beneficiaries.map((b) => `<li><button type="button" data-act="ben-edit" data-id="${b.id}"><span class="r-t"><b>${N.esc(b.name)}</b><small>${N.esc(b.note || (b.is_demo ? 'exemple' : ''))}</small></span><span class="r-v">${N.icon('pencil', 14)}</span></button></li>`).join('') : '<li class="muted">Aucun bénéficiaire.</li>'}</ul></article>
        <article class="tile" data-in><div class="tile-head"><div><h3>Données</h3><small class="muted">Importe, exporte, nettoie.</small></div></div>
          <div class="data-btns"><button type="button" class="btn light" data-act="csv-import">${N.icon('upload', 15)} Importer un CSV</button><button type="button" class="btn light" data-act="export">${N.icon('download', 15)} Exporter en CSV</button>
            ${N.api.hasDemo() ? `<button type="button" class="btn light" data-act="demo-delete">${N.icon('trash', 15)} Supprimer les données d'exemple</button>` : `<button type="button" class="btn light" data-act="demo-load">${N.icon('spark', 15)} Charger des données d'exemple</button>`}
            <button type="button" class="btn danger" data-act="wipe">${N.icon('trash', 15)} Tout effacer</button></div></article>
        <article class="tile" data-in><div class="tile-head"><div><h3>Sécurité</h3><small class="muted">${N.esc((S.user && S.user.email) || '')}</small></div></div>
          <div class="data-btns"><button type="button" class="btn light" data-act="pw-change">${N.icon('lock', 15)} Changer le mot de passe</button><button type="button" class="btn light" data-act="logout">${N.icon('power', 15)} Se déconnecter</button></div>
          <p class="fineprint">Tes données sont isolées par compte (Row Level Security). NACRE n'enregistre jamais un numéro de carte complet ni un CVV.</p></article>
      </div>`;
    }
  };
  N.acts['save-general'] = async () => {
    const v = (id) => N.$('#' + id).value;
    try {
      await N.api.saveProfile({ display_name: v('s_name').trim(), language: v('s_lang'), currency: v('s_cur'), timezone: v('s_tz'), date_format: v('s_df') });
      N.api.prep(); N.toast('Paramètres enregistrés'); N.updateShell(); N.refresh();
    } catch (e) { N.fail(e); }
  };
  N.acts['theme-pick'] = async (el) => {
    const k = el.dataset.k;
    try { N.applyTheme(k); N.$$('.swatch').forEach((s) => s.classList.toggle('on', s === el)); await N.api.saveProfile({ accent: k }); N.toast(`Thème « ${N.themes[k].name} » appliqué`, { icon: 'spark' }); } catch (e) { N.fail(e); }
  };
  N.acts['pref-toggle'] = async (el) => {
    const k = el.dataset.k, v = k === 'animations' ? !(S.profile.animations !== false) : !S.profile[k];
    try { await N.api.saveProfile({ [k]: v }); N.applyPrefs(); el.classList.toggle('on', v); el.setAttribute('aria-checked', v); } catch (e) { N.fail(e); }
  };
  N.acts['demo-load'] = async () => {
    N.toast('Chargement des données d\'exemple…', { icon: 'spark' });
    try { const n = await N.api.seedDemo(); N.toast(`${n} opérations d'exemple ajoutées`); N.go('overview'); } catch (e) { N.fail(e, 'Données d\'exemple'); }
  };
  N.acts['demo-delete'] = async () => {
    if (!(await N.confirm('Supprimer les données d\'exemple ?', 'Seules les lignes marquées « exemple » sont supprimées. Tes vraies données restent intactes.', 'Supprimer'))) return;
    try { await N.api.deleteDemo(); N.toast('Données d\'exemple supprimées'); N.refresh(); } catch (e) { N.fail(e); }
  };
  N.acts['wipe'] = async () => {
    if (!(await N.confirm('Tout effacer ?', 'Tous tes comptes, opérations, cartes, objectifs et bénéficiaires seront supprimés définitivement. Ton compte et tes préférences restent.', 'Tout effacer'))) return;
    try { await N.api.deleteEverything(); N.toast('Toutes tes données ont été effacées'); N.go('overview'); } catch (e) { N.fail(e); }
  };
  N.acts['export'] = () => { if (!S.tx.length) { N.toast('Rien à exporter pour le moment.', { err: true }); return; } const n = N.api.exportCsv(); N.toast(`${n} opérations exportées`, { icon: 'download' }); };
  N.acts['ov-period'] = (el) => { S.period = el.dataset.p; N.refresh(); };
  N.acts['card-open'] = (el) => { N.cards.sel = +el.dataset.i; N.go('cards'); };
  N.changes['disp-cur'] = (el) => { S.dispCur = el.value; N.refresh(); };
})();

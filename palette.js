/* palette.js · « Un mot, un virement ».
   const cmd = { t: 'Envoyer 250 € à Clara Nguyen', ic: 'send', run: () => toast('Virement envoyé') }
   palIn.oninput = () => renderPal(norm(palIn.value))
   Chaque phrase est analysée, proposée sous forme de commande, puis exécutée pour de vrai (écrite en base). */
(function () {
  'use strict';
  const N = window.NACRE, S = N.state, F = N.fmt;
  const pal = (N.pal = { items: [], idx: 0, open: false });

  const VIEWS = [
    ['overview', /\b(vue|ensemble|accueil|tableau|dashboard)\b/], ['activity', /\b(activite|operations?|transactions?|mouvements?)\b/],
    ['cards', /\bcartes?\b/], ['savings', /\b(epargne|objectifs?)\b/], ['reports', /\b(rapports?|stats?|statistiques?)\b/], ['settings', /\b(parametres?|reglages?|reglage|options?)\b/]
  ];
  const VIEW_NAME = { overview: "Vue d'ensemble", activity: 'Activité', cards: 'Cartes', savings: 'Épargne', reports: 'Rapports', settings: 'Paramètres' };

  const amountOf = (q) => {
    const m = q.match(/(\d[\d\s  .,]*\d|\d)\s*(€|eur(?:os?)?\b|\$|usd\b|dollars?\b|cdf\b|fc\b)?/i);
    if (!m) return null;
    const v = N.api.parseAmount(m[1]); if (!(v > 0)) return null;
    const c = (m[2] || '').toLowerCase();
    const cur = /€|eur/.test(c) ? 'EUR' : /\$|usd|dollar/.test(c) ? 'USD' : /cdf|fc/.test(c) ? 'CDF' : null;
    return { v, cur, raw: m[0] };
  };
  const pickAccount = (cur) => (cur && S.accounts.find((a) => a.currency === cur)) || N.api.mainAccount();
  const nameAfter = (q) => { const m = q.match(/(?:^|\s)(?:(?:à|a|au|vers|de|du|chez)\s+|d['’]\s*)([\p{L}'’\- ]+?)(?=\s+(?:pour|motif|objet|car|avec)(?:\s|$)|\s*$)/iu); return m ? m[1].trim() : ''; };
  const noteAfter = (q) => { const m = q.match(/\b(?:pour|motif|objet)\s*:?\s+(.+)$/i); return m ? m[1].trim() : ''; };
  const findBenef = (name) => { const n = N.norm(name); if (!n) return []; return S.beneficiaries.filter((b) => { const bn = N.norm(b.name); return bn === n || bn.includes(n) || n.includes(bn) || bn.split(' ')[0] === n.split(' ')[0]; }); };
  const findGoal = (name) => { const n = N.norm(name); if (!n) return null; return S.goals.find((g) => { const gn = N.norm(g.name); return gn.includes(n) || n.includes(gn) || n.split(' ').some((w) => w.length > 3 && gn.includes(w)); }) || null; };
  const titleCase = (s) => s.replace(/(^|[\s'’\-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());

  pal.suggest = (q) => {
    const raw = q.trim(), n = N.norm(raw), out = [];
    if (!raw) {
      out.push({ ic: 'send', t: 'Envoyer 250 € à Clara Nguyen', hint: 'Essaie : « Envoie 250 € à Clara pour le shooting »', fill: 'Envoie 250 € à ' + (S.beneficiaries[0] ? S.beneficiaries[0].name : 'Clara Nguyen') });
      out.push({ ic: 'plus', t: 'Nouvelle opération', run: () => N.acts['tx-new']() });
      out.push({ ic: 'target', t: 'Ajouter 100 € à un objectif', fill: 'Ajoute 100 € à ' + (S.goals[0] ? S.goals[0].name : 'Bali') });
      out.push({ ic: 'snow', t: 'Geler ma carte', fill: 'Gèle ma carte' });
      out.push({ ic: 'chart', t: 'Ouvrir les rapports', run: () => N.go('reports') });
      return out;
    }
    const amt = amountOf(raw);
    const verb = (re) => re.test(n);
    const target = nameAfter(raw), note = noteAfter(raw);

    /* épargne : « ajoute 50 € à Bali » */
    if (amt && verb(/\b(ajoute|ajouter|mets|mettre|verse|verser|epargne|epargner)\b/)) {
      const g = findGoal(target);
      if (g) out.push({ ic: 'target', t: `Ajouter ${F.money(amt.v)} à « ${g.name} »`, run: () => N.doSaving(g, amt.v) });
    }
    /* virement : « envoie 250 € à Clara » */
    if (amt && verb(/\b(envoie|envoyer|vire|virer|transfere|transferer|paye|payer|verse|donne|rembourse|rembourser)\b/) && target) {
      const bs = findBenef(target);
      if (bs.length) bs.slice(0, 3).forEach((b) => out.push({ ic: 'send', t: `Envoyer ${F.money(amt.v, amt.cur)} à ${b.name}`, sub: note ? 'pour ' + note : '', run: () => N.doTransfer({ name: b.name, amount: amt.v, cur: amt.cur, note }) }));
      else if (!findGoal(target)) out.push({ ic: 'send', t: `Envoyer ${F.money(amt.v, amt.cur)} à ${titleCase(target)}`, sub: 'nouveau bénéficiaire' + (note ? ' · pour ' + note : ''), run: () => N.doTransfer({ name: titleCase(target), amount: amt.v, cur: amt.cur, note, create: true }) });
    }
    /* encaissement : « j'ai reçu 1 200 € de Onixe » */
    if (amt && verb(/\b(recu|recois|recevoir|encaisse|encaisser|rentre|rentrer)\b/)) {
      const who = target ? titleCase(target) : 'Client';
      out.push({ ic: 'recv', t: `Enregistrer ${F.money(amt.v, amt.cur)} reçus de ${who}`, sub: note ? 'pour ' + note : '', run: () => N.doIncome({ who, amount: amt.v, cur: amt.cur, note }) });
    }
    /* dépense : « dépense 12 € chez Café » */
    if (amt && verb(/\b(depense|depenser|achat|achete|acheter|paye|payer|paie|paiement|ai paye)\b/) && !out.some((o) => o.ic === 'send')) {
      const lab = target ? titleCase(target) : 'Dépense';
      out.push({ ic: 'store', t: `Dépense de ${F.money(amt.v, amt.cur)} · ${lab}`, run: () => N.doExpense({ label: lab, amount: amt.v, cur: amt.cur, note }) });
    }
    /* cartes */
    if (verb(/\b(gele|geler|bloque|bloquer|degele|degeler|debloque|debloquer)\b/) && verb(/\bcartes?\b|\b\d{4}\b/)) {
      const unfreeze = verb(/\b(degele|degeler|debloque|debloquer)\b/);
      const num = (raw.match(/\b(\d{4})\b/) || [])[1];
      const c = S.cards.find((x) => (num && x.last4 === num) || n.includes(N.norm(x.nickname))) || S.cards[N.cards.sel] || S.cards[0];
      if (c) out.push({ ic: 'snow', t: `${unfreeze ? 'Dégeler' : 'Geler'} la carte •••• ${c.last4} (${c.nickname})`, run: () => N.doFreeze(c, !unfreeze) });
    }
    /* thèmes */
    const th = Object.keys(N.themes).find((k) => n.includes(k) || n.includes(N.norm(N.themes[k].name)));
    if (th && verb(/\b(theme|couleur|accent|passe|mets|change)\b/)) out.push({ ic: 'spark', t: `Thème « ${N.themes[th].name} »`, run: () => N.doTheme(th) });
    /* navigation */
    const nv = VIEWS.find(([, re]) => re.test(n));
    if (nv && (verb(/\b(ouvre|ouvrir|va|aller|affiche|afficher|montre|montrer|voir|vers)\b/) || n.split(' ').length <= 2)) out.push({ ic: 'grid', t: `Ouvrir « ${VIEW_NAME[nv[0]]} »`, run: () => N.go(nv[0]) });
    /* recherche d'opérations */
    if (n.length >= 2) {
      const hits = S.tx.filter((t) => N.norm(t.label + ' ' + (t.category || '') + ' ' + (t.note || '') + ' ' + (t.counterparty || '')).includes(n)).slice(0, 4);
      hits.forEach((t) => out.push({ ic: N.txIcon(t), t: t.label, sub: `${F.date(t._d)} · ${t.kind === 'income' ? '+' : '−'}${F.money(t._v, null, { dec: 2 }).replace('−', '')}`, run: () => { S.search = raw; N.go('activity'); } }));
      if (hits.length) out.push({ ic: 'search', t: `Voir toutes les opérations contenant « ${raw} »`, run: () => { S.search = raw; N.go('activity'); } });
    }
    if (!out.length) out.push({ ic: 'info', t: 'Je n\'ai pas compris cette phrase', sub: 'Exemples : « Envoie 250 € à Clara », « Ajoute 100 € à Bali », « Gèle ma carte », « Thème corail »', disabled: true });
    return out;
  };

  pal.render = () => {
    const box = N.$('#pal'); if (!box) return;
    const q = N.$('#cmdIn').value;
    pal.items = pal.suggest(q); if (pal.idx >= pal.items.length) pal.idx = 0;
    box.innerHTML = pal.items.map((it, i) => `<button type="button" class="pal-it ${i === pal.idx ? 'on' : ''} ${it.disabled ? 'dis' : ''}" data-i="${i}"><span class="pal-ic">${N.icon(it.ic, 15, 2)}</span><span class="pal-t">${N.esc(it.t)}${it.sub ? `<small>${N.esc(it.sub)}</small>` : it.hint ? `<small>${N.esc(it.hint)}</small>` : ''}</span>${it.disabled ? '' : `<kbd>↵</kbd>`}</button>`).join('') + `<div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> choisir</span><span><kbd>↵</kbd> exécuter</span><span><kbd>esc</kbd> fermer</span></div>`;
  };
  pal.show = () => { const b = N.$('#pal'); if (!b) return; b.hidden = false; pal.open = true; pal.render(); if (N.anim()) b.animate([{ opacity: 0, transform: 'translateY(-8px) scale(.98)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 380, easing: N.EASE }); };
  pal.hide = () => { const b = N.$('#pal'); if (b) b.hidden = true; pal.open = false; };
  pal.run = async (it) => {
    if (!it || it.disabled) return;
    if (it.fill) { const i = N.$('#cmdIn'); i.value = it.fill; i.focus(); pal.render(); return; }
    pal.hide(); const i = N.$('#cmdIn'); i.value = ''; i.blur();
    try { await it.run(); } catch (e) { N.fail(e); }
  };

  pal.bind = () => {
    if (pal.bound) return; pal.bound = true;
    const i = N.$('#cmdIn');
    i.addEventListener('focus', pal.show);
    i.addEventListener('input', () => { pal.idx = 0; pal.render(); if (!pal.open) pal.show(); });
    i.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); pal.idx = (pal.idx + 1) % pal.items.length; pal.render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); pal.idx = (pal.idx - 1 + pal.items.length) % pal.items.length; pal.render(); }
      else if (e.key === 'Enter') { e.preventDefault(); pal.run(pal.items[pal.idx]); }
      else if (e.key === 'Escape') { pal.hide(); i.blur(); }
    });
    N.$('#pal').addEventListener('mousedown', (e) => { const b = e.target.closest('.pal-it'); if (b) { e.preventDefault(); pal.run(pal.items[+b.dataset.i]); } });
    document.addEventListener('mousedown', (e) => { if (pal.open && !e.target.closest('#cmd')) pal.hide(); });
    document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); i.focus(); i.select(); } });
  };

  /* ───── actions exécutées par l'assistant (elles écrivent vraiment en base) ───── */
  N.doTransfer = async ({ name, amount, cur, note, create }) => {
    const acc = pickAccount(cur);
    if (!acc) { N.toast("Crée d'abord un compte (Paramètres → Comptes).", { err: true }); return; }
    if (cur && acc.currency !== cur) { N.toast(`Aucun compte en ${cur} : ouvre-en un dans Paramètres → Comptes.`, { err: true }); return; }
    if (create) { const b = await N.api.insert('beneficiaries', { name }); S.beneficiaries.push(b); }
    await N.api.sendTransfer({ account: acc, name, amount, note });
    N.toast(`Virement envoyé · ${F.money(amount, acc.currency)} à ${name}`, { icon: 'send' });
    N.refresh();
  };
  N.doIncome = async ({ who, amount, cur, note }) => {
    const acc = pickAccount(cur); if (!acc) { N.toast("Crée d'abord un compte.", { err: true }); return; }
    await N.api.addTx({ account_id: acc.id, kind: 'income', label: 'Paiement client — ' + who, category: 'Clients', amount, counterparty: who, note: note || null, occurred_at: new Date().toISOString() });
    N.toast(`${F.money(amount, acc.currency)} reçus de ${who}`, { icon: 'recv' }); N.refresh();
  };
  N.doExpense = async ({ label, amount, cur, note }) => {
    const acc = pickAccount(cur); if (!acc) { N.toast("Crée d'abord un compte.", { err: true }); return; }
    await N.api.addTx({ account_id: acc.id, kind: 'expense', label, category: 'Autre', amount, note: note || null, occurred_at: new Date().toISOString() });
    N.toast(`Dépense enregistrée · ${F.money(amount, acc.currency)}`); N.refresh();
  };
  N.doSaving = async (goal, amount) => {
    const acc = S.accounts.find((a) => a.is_main && a.currency === F.main()) || S.accounts.find((a) => a.currency === F.main());
    if (!acc) { N.toast(`Il faut un compte en ${F.main()} pour alimenter un objectif.`, { err: true }); return; }
    await N.api.addTx({ account_id: acc.id, goal_id: goal.id, kind: 'saving', label: 'Versement · ' + goal.name, category: 'Épargne', amount, occurred_at: new Date().toISOString() }, { skipRound: true });
    N.toast(`${F.money(amount)} ajoutés à « ${goal.name} »`, { icon: 'target' }); N.refresh();
  };
  N.doFreeze = async (c, v) => {
    const row = await N.api.update('cards', c.id, { frozen: v }); Object.assign(c, row, { monthly_limit: Number(row.monthly_limit) });
    N.toast(v ? 'Carte gelée — paiements bloqués' : 'Carte dégelée', { icon: v ? 'snow' : 'check' }); N.refresh();
  };
  N.doTheme = async (key) => {
    N.applyTheme(key); await N.api.saveProfile({ accent: key }); N.toast(`Thème « ${N.themes[key].name} » appliqué`, { icon: 'spark' }); N.refresh();
  };
})();

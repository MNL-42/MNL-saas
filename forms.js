/* forms.js · tous les formulaires (opération, compte, objectif, carte, bénéficiaire, virement, import CSV).
   Chaque soumission écrit réellement dans Supabase puis rafraîchit l'écran. */
(function () {
  'use strict';
  const N = window.NACRE, S = N.state, F = N.fmt;

  const CATS = ['Clients', 'Abonnements', 'Logiciels', 'Voyages', 'Équipe', 'Bureaux', 'Restaurants', 'Transport', 'Courses', 'Matériel', 'Santé', 'Loisirs', 'Impôts', 'Transfert', 'Épargne', 'Autre'];
  N.cats = () => Array.from(new Set(CATS.concat(S.tx.map((t) => t.category).filter(Boolean))));
  const accOpts = (filter) => S.accounts.filter(filter || (() => true)).map((a) => [a.id, `${a.name} (${a.currency})`]);
  const needAccount = () => {
    if (S.accounts.length) return false;
    N.toast("Crée d'abord un compte : Paramètres → Comptes.", { err: true });
    N.acts['acc-new']();
    return true;
  };

  /* ───────── opérations ───────── */
  const txFields = (t) => {
    const cardOpts = [['', 'Aucune carte']].concat(S.cards.map((c) => [c.id, `${c.nickname} •••• ${c.last4}`]));
    const saving = t && t.kind === 'saving';
    const f = [];
    if (!saving) f.push({ name: 'kind', label: 'Type', type: 'select', options: [['expense', 'Dépense'], ['income', 'Entrée d\'argent'], ['transfer', 'Virement envoyé']], value: t ? t.kind : 'expense' });
    f.push({ name: 'amount', label: 'Montant', type: 'number', step: '0.01', min: 0.01, required: true, value: t ? t.amount : '', inputmode: 'decimal', placeholder: '0,00' });
    f.push({ name: 'label', label: 'Libellé', required: true, value: t ? t.label : '', maxlength: 160, span: 2, placeholder: 'Ex. Paiement client — Onixe' });
    if (!saving) f.push({ name: 'category', label: 'Catégorie', list: N.cats(), value: t ? t.category : 'Autre', required: true });
    f.push({ name: 'account_id', label: 'Compte', type: 'select', options: accOpts(), value: t ? t.account_id : (N.api.mainAccount() || {}).id });
    f.push({ name: 'date', label: 'Date', type: 'date', required: true, value: t ? t._d : N.today() });
    if (!saving) f.push({ name: 'card_id', label: 'Carte utilisée', type: 'select', options: cardOpts, value: t && t.card_id ? t.card_id : '' });
    if (!saving) f.push({ name: 'counterparty', label: 'Bénéficiaire / client', list: S.beneficiaries.map((b) => b.name), value: t ? t.counterparty || '' : '' });
    f.push({ name: 'note', label: 'Note', type: 'textarea', span: 2, value: t ? t.note || '' : '' });
    if (!saving) f.push({ name: 'is_subscription', label: 'Abonnement', type: 'checkbox', checkLabel: 'C\'est un abonnement récurrent', value: t ? t.is_subscription : false, span: 2 });
    return f;
  };
  const txRow = (v, kind) => ({
    account_id: v.account_id, card_id: v.card_id || null, kind: v.kind || kind, label: v.label, category: v.category || 'Épargne', amount: v.amount,
    counterparty: v.counterparty || null, note: v.note || null, is_subscription: !!v.is_subscription, occurred_at: N.at(v.date)
  });

  N.acts['tx-new'] = async (el, e, preset) => {
    if (needAccount()) return;
    const p = preset || {};
    const fields = txFields(null);
    if (p.kind) fields.find((f) => f.name === 'kind').value = p.kind;
    await N.form({
      title: p.title || 'Nouvelle opération', sub: 'Elle est enregistrée dans ta base et met tes soldes à jour.', fields, submit: 'Ajouter',
      onSubmit: async (v) => { await N.api.addTx(txRow(v)); N.toast(v.kind === 'income' ? 'Entrée enregistrée' : 'Opération ajoutée'); N.refresh(); }
    });
  };
  N.acts['tx-edit'] = async (el) => {
    const t = S.tx.find((x) => x.id === el.dataset.id); if (!t) return;
    await N.form({
      title: 'Modifier l\'opération', fields: txFields(t),
      danger: { label: 'Supprimer', run: async () => { await N.api.deleteTx(t.id); N.toast('Opération supprimée'); N.refresh(); } },
      onSubmit: async (v) => {
        const row = txRow(v, t.kind); if (t.kind === 'saving') { delete row.category; delete row.card_id; delete row.counterparty; delete row.is_subscription; row.kind = 'saving'; }
        await N.api.updateTx(t.id, row); N.toast('Opération mise à jour'); N.refresh();
      }
    });
  };

  /* ───────── Virer / Recevoir ───────── */
  N.acts['transfer'] = async () => {
    if (needAccount()) return;
    await N.form({
      title: 'Virer de l\'argent', sub: 'Le virement est inscrit dans ton registre NACRE. Il ne déplace pas d\'argent à ta banque.',
      fields: [
        { name: 'name', label: 'Bénéficiaire', required: true, list: S.beneficiaries.map((b) => b.name), span: 2, placeholder: 'Clara Nguyen' },
        { name: 'amount', label: 'Montant', type: 'number', step: '0.01', min: 0.01, required: true, inputmode: 'decimal' },
        { name: 'account_id', label: 'Depuis le compte', type: 'select', options: accOpts(), value: (N.api.mainAccount() || {}).id },
        { name: 'note', label: 'Motif', span: 2, placeholder: 'Shooting de vendredi' },
        { name: 'save', label: 'Enregistrer', type: 'checkbox', checkLabel: 'Garder ce bénéficiaire pour la prochaine fois', value: true, span: 2 }
      ],
      submit: 'Envoyer',
      onSubmit: async (v) => {
        const acc = S.accIdx[v.account_id];
        let b = S.beneficiaries.find((x) => N.norm(x.name) === N.norm(v.name));
        if (!b && v.save) { b = await N.api.insert('beneficiaries', { name: v.name }); S.beneficiaries.push(b); }
        await N.api.sendTransfer({ account: acc, name: b ? b.name : v.name, amount: v.amount, note: v.note });
        N.toast(`Virement envoyé · ${F.money(v.amount, acc.currency)} à ${b ? b.name : v.name}`, { icon: 'send' }); N.refresh();
      }
    });
  };
  N.acts['receive'] = async () => {
    if (needAccount()) return;
    await N.form({
      title: 'Recevoir de l\'argent', sub: 'Enregistre un paiement reçu.',
      fields: [
        { name: 'who', label: 'De la part de', required: true, span: 2, placeholder: 'Onixe' },
        { name: 'amount', label: 'Montant', type: 'number', step: '0.01', min: 0.01, required: true, inputmode: 'decimal' },
        { name: 'account_id', label: 'Sur le compte', type: 'select', options: accOpts(), value: (N.api.mainAccount() || {}).id },
        { name: 'category', label: 'Catégorie', list: N.cats(), value: 'Clients', required: true },
        { name: 'note', label: 'Note', placeholder: 'Facture 114' }
      ],
      submit: 'Enregistrer',
      onSubmit: async (v) => {
        await N.api.addTx({ account_id: v.account_id, kind: 'income', label: 'Paiement client — ' + v.who, category: v.category, amount: v.amount, counterparty: v.who, note: v.note || null, occurred_at: new Date().toISOString() });
        N.toast(`${F.money(v.amount, S.accIdx[v.account_id].currency)} reçus de ${v.who}`, { icon: 'recv' }); N.refresh();
      }
    });
  };

  /* ───────── comptes ───────── */
  const accFields = (a) => [
    { name: 'name', label: 'Nom du compte', required: true, span: 2, value: a ? a.name : '', maxlength: 80, placeholder: 'Compte courant' },
    { name: 'currency', label: 'Devise', type: 'select', options: Object.entries(N.CURRENCIES), value: a ? a.currency : F.main() },
    { name: 'opening_balance', label: 'Solde de départ', type: 'number', step: '0.01', value: a ? a.opening_balance : 0, hint: 'Ce que contenait le compte avant tes premières opérations.' },
    { name: 'is_main', label: 'Principal', type: 'checkbox', checkLabel: 'Compte principal (utilisé par défaut)', value: a ? a.is_main : !S.accounts.length, span: 2 }
  ];
  const saveMain = async (id) => { for (const x of S.accounts) if (x.id !== id && x.is_main) await N.api.update('accounts', x.id, { is_main: false }); };
  N.acts['acc-new'] = async () => {
    await N.form({
      title: 'Nouveau compte', sub: 'Un compte bancaire, une caisse, un portefeuille mobile…', fields: accFields(null), submit: 'Créer le compte',
      onSubmit: async (v) => {
        const row = await N.api.insert('accounts', { name: v.name, currency: v.currency, opening_balance: v.opening_balance || 0, is_main: v.is_main || !S.accounts.length, position: S.accounts.length });
        if (row.is_main) await saveMain(row.id);
        await N.api.loadMoney(); N.api.prep(); N.toast('Compte créé'); N.refresh();
      }
    });
  };
  N.acts['acc-edit'] = async (el) => {
    const a = S.accIdx[el.dataset.id]; if (!a) return;
    await N.form({
      title: 'Modifier le compte', fields: accFields(a),
      danger: { label: 'Supprimer le compte', run: async () => { await N.api.remove('accounts', a.id); await N.api.loadAll(); N.toast('Compte supprimé avec ses opérations'); N.refresh(); } },
      onSubmit: async (v) => {
        await N.api.update('accounts', a.id, { name: v.name, currency: v.currency, opening_balance: v.opening_balance || 0, is_main: v.is_main });
        if (v.is_main) await saveMain(a.id);
        await N.api.loadMoney(); N.api.prep(); N.toast('Compte mis à jour'); N.refresh();
      }
    });
  };

  /* ───────── objectifs ───────── */
  const goalFields = (g) => [
    { name: 'name', label: 'Nom de l\'objectif', required: true, span: 2, value: g ? g.name : '', maxlength: 80, placeholder: 'MacBook Pro' },
    { name: 'icon', label: 'Icône', type: 'select', options: [['laptop', 'Ordinateur'], ['plane', 'Voyage'], ['umbrella', 'Sécurité'], ['car', 'Voiture'], ['gift', 'Cadeau'], ['home', 'Maison'], ['heart', 'Famille'], ['bike', 'Loisir'], ['book', 'Études'], ['target', 'Autre'], ['cart', 'Achat'], ['wallet', 'Réserve']], value: g ? g.icon : 'target' },
    { name: 'due_date', label: 'Échéance', type: 'date', value: g ? g.due_date || '' : '' },
    { name: 'target_amount', label: 'Montant visé', type: 'number', step: '0.01', min: 0.01, required: true, value: g ? g.target_amount : '', inputmode: 'decimal' },
    { name: 'initial_amount', label: 'Déjà épargné', type: 'number', step: '0.01', min: 0, value: g ? g.initial_amount : 0, hint: 'Ce que tu avais déjà mis de côté avant NACRE.' }
  ];
  N.acts['goal-new'] = async () => {
    await N.form({
      title: 'Nouvel objectif', sub: 'Un projet pour lequel tu mets de l\'argent de côté.', fields: goalFields(null), submit: 'Créer l\'objectif',
      onSubmit: async (v) => { await N.api.insert('goals', { name: v.name, icon: v.icon, target_amount: v.target_amount, initial_amount: v.initial_amount || 0, due_date: v.due_date, position: S.goals.length }); await N.api.loadMoney(); N.api.prep(); N.toast('Objectif créé'); N.refresh(); }
    });
  };
  N.acts['goal-edit'] = async (el) => {
    const g = S.goalIdx[el.dataset.id]; if (!g) return;
    await N.form({
      title: 'Modifier l\'objectif', fields: goalFields(g),
      danger: { label: 'Supprimer', run: async () => { await N.api.remove('goals', g.id); await N.api.loadAll(); N.toast('Objectif supprimé'); N.refresh(); } },
      onSubmit: async (v) => { await N.api.update('goals', g.id, { name: v.name, icon: v.icon, target_amount: v.target_amount, initial_amount: v.initial_amount || 0, due_date: v.due_date }); await N.api.loadMoney(); N.api.prep(); N.toast('Objectif mis à jour'); N.refresh(); }
    });
  };
  N.acts['goal-add'] = async (el, e) => {
    if (e) e.stopPropagation();
    const g = S.goalIdx[el.dataset.id]; if (!g) return;
    const opts = accOpts((a) => a.currency === F.main());
    if (!opts.length) { N.toast(`Il faut un compte en ${F.main()} pour alimenter un objectif.`, { err: true }); return; }
    await N.form({
      title: `Ajouter à « ${g.name} »`, sub: `${F.money(g.saved_amount)} sur ${F.money(g.target_amount)}`,
      fields: [
        { name: 'amount', label: 'Montant à mettre de côté', type: 'number', step: '0.01', min: 0.01, required: true, inputmode: 'decimal', span: 2 },
        { name: 'account_id', label: 'Depuis le compte', type: 'select', options: opts, span: 2 }
      ],
      submit: 'Ajouter',
      onSubmit: async (v) => {
        await N.api.addTx({ account_id: v.account_id, goal_id: g.id, kind: 'saving', label: 'Versement · ' + g.name, category: 'Épargne', amount: v.amount, occurred_at: new Date().toISOString() }, { skipRound: true });
        N.toast(`${F.money(v.amount)} ajoutés à « ${g.name} »`, { icon: 'target' }); N.refresh();
      }
    });
  };

  /* ───────── cartes ───────── */
  const cardFields = (c) => [
    { name: 'nickname', label: 'Nom de la carte', required: true, value: c ? c.nickname : '', maxlength: 60, placeholder: 'Andromis Studio' },
    { name: 'holder', label: 'Titulaire', value: c ? c.holder : (S.profile.display_name || '').toUpperCase(), maxlength: 40 },
    { name: 'last4', label: '4 derniers chiffres', required: true, value: c ? c.last4 : '', maxlength: 4, pattern: '[0-9]{4}', inputmode: 'numeric', hint: 'On ne stocke jamais le numéro complet ni le CVV.' },
    { name: 'expiry', label: 'Expiration (MM/AA)', value: c ? c.expiry : '', maxlength: 5, placeholder: '09/28' },
    { name: 'account_id', label: 'Compte lié', type: 'select', options: [['', 'Aucun']].concat(accOpts()), value: c && c.account_id ? c.account_id : '' },
    { name: 'style', label: 'Style', type: 'select', options: [['dark', 'Noire'], ['emerald', 'Couleur d\'accent'], ['light', 'Claire']], value: c ? c.style : 'dark' },
    { name: 'monthly_limit', label: 'Plafond mensuel', type: 'number', step: '1', min: 0, value: c ? c.monthly_limit : 1500, span: 2 }
  ];
  const cardRow = (v) => ({ nickname: v.nickname, holder: v.holder || '', last4: v.last4, expiry: v.expiry || '', account_id: v.account_id || null, style: v.style, monthly_limit: v.monthly_limit == null ? 0 : v.monthly_limit });
  const cardValid = (v) => (!/^[0-9]{4}$/.test(v.last4) ? 'Entre exactement les 4 derniers chiffres.' : v.expiry && !/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(v.expiry) ? 'Expiration au format MM/AA, par exemple 09/28.' : '');
  N.acts['card-new'] = async () => {
    await N.form({
      title: 'Nouvelle carte', sub: 'Seuls les 4 derniers chiffres sont enregistrés.', fields: cardFields(null), submit: 'Ajouter la carte', validate: cardValid,
      onSubmit: async (v) => { const row = await N.api.insert('cards', Object.assign(cardRow(v), { position: S.cards.length })); S.cards.push({ ...row, monthly_limit: Number(row.monthly_limit) }); N.cards.sel = S.cards.length - 1; N.api.prep(); N.toast('Carte ajoutée'); N.go('cards'); }
    });
  };
  N.acts['card-edit'] = async () => {
    const c = S.cards[N.cards.sel]; if (!c) return;
    await N.form({
      title: 'Modifier la carte', fields: cardFields(c), validate: cardValid,
      danger: { label: 'Supprimer la carte', run: async () => { await N.api.remove('cards', c.id); await N.api.loadCore(); N.api.prep(); N.cards.sel = 0; N.toast('Carte supprimée'); N.refresh(); } },
      onSubmit: async (v) => { const row = await N.api.update('cards', c.id, cardRow(v)); Object.assign(c, row, { monthly_limit: Number(row.monthly_limit) }); N.toast('Carte mise à jour'); N.refresh(); }
    });
  };

  /* ───────── bénéficiaires ───────── */
  const benFields = (b) => [
    { name: 'name', label: 'Nom', required: true, value: b ? b.name : '', maxlength: 80, span: 2, placeholder: 'Clara Nguyen' },
    { name: 'iban', label: 'IBAN / numéro de compte', value: b ? b.iban || '' : '', span: 2, hint: 'Facultatif. Gardé uniquement pour toi.' },
    { name: 'note', label: 'Note', value: b ? b.note || '' : '', span: 2 }
  ];
  N.acts['ben-new'] = async () => {
    await N.form({ title: 'Nouveau bénéficiaire', fields: benFields(null), submit: 'Ajouter', onSubmit: async (v) => { const row = await N.api.insert('beneficiaries', { name: v.name, iban: v.iban || null, note: v.note || null }); S.beneficiaries.push(row); S.beneficiaries.sort((a, b) => a.name.localeCompare(b.name)); N.toast('Bénéficiaire ajouté'); N.refresh(); } });
  };
  N.acts['ben-edit'] = async (el) => {
    const b = S.beneficiaries.find((x) => x.id === el.dataset.id); if (!b) return;
    await N.form({
      title: 'Modifier le bénéficiaire', fields: benFields(b),
      danger: { label: 'Supprimer', run: async () => { await N.api.remove('beneficiaries', b.id); S.beneficiaries = S.beneficiaries.filter((x) => x.id !== b.id); N.toast('Bénéficiaire supprimé'); N.refresh(); } },
      onSubmit: async (v) => { const row = await N.api.update('beneficiaries', b.id, { name: v.name, iban: v.iban || null, note: v.note || null }); Object.assign(b, row); N.toast('Bénéficiaire mis à jour'); N.refresh(); }
    });
  };

  /* ───────── taux de change ───────── */
  N.acts['fx-edit'] = async (el) => {
    const cur = el.dataset.cur;
    await N.form({
      title: `Taux de change · ${cur}`, sub: `Combien vaut 1 ${cur} en ${F.main()} ? Sert à additionner tes comptes dans une seule devise.`,
      fields: [{ name: 'rate', label: `1 ${cur} =`, type: 'number', step: 'any', min: 0.0000001, required: true, value: N.fx(cur), inputmode: 'decimal', span: 2 }], submit: 'Enregistrer',
      onSubmit: async (v) => { const fx = Object.assign({}, S.profile.fx_rates, { [cur]: v.rate }); await N.api.saveProfile({ fx_rates: fx }); N.api.prep(); N.toast(`Taux ${cur} mis à jour`); N.refresh(); }
    });
  };

  /* ───────── mot de passe ───────── */
  N.acts['pw-change'] = async () => {
    await N.form({
      title: 'Changer le mot de passe', fields: [
        { name: 'pw', label: 'Nouveau mot de passe', type: 'password', required: true, autocomplete: 'new-password', span: 2, hint: '8 caractères minimum.' },
        { name: 'pw2', label: 'Confirmer', type: 'password', required: true, autocomplete: 'new-password', span: 2 }
      ], submit: 'Changer',
      validate: (v) => (v.pw.length < 8 ? 'Au moins 8 caractères.' : v.pw !== v.pw2 ? 'Les deux mots de passe sont différents.' : ''),
      onSubmit: async (v) => { await N.api.setPassword(v.pw); N.toast('Mot de passe changé'); }
    });
  };
  N.acts['epargne-monthly'] = async () => {
    await N.form({
      title: 'Virement mensuel', sub: 'Montant versé chaque 1er du mois sur ton premier objectif, depuis ton compte principal.',
      fields: [{ name: 'amt', label: 'Montant par mois', type: 'number', step: '1', min: 0, required: true, value: S.profile.auto_monthly_amount, span: 2 }], submit: 'Enregistrer',
      onSubmit: async (v) => { await N.api.saveProfile({ auto_monthly_amount: v.amt }); N.toast('Virement mensuel mis à jour'); N.refresh(); }
    });
  };

  /* ───────── import CSV ───────── */
  N.acts['csv-import'] = () => {
    if (!S.accounts.length) { N.toast("Crée d'abord un compte avant d'importer.", { err: true }); return; }
    const m = N.modal(`<div class="mform"><div class="mhead"><div><h3>Importer des opérations (CSV)</h3><p>Colonnes : date, libelle, montant (négatif = dépense), categorie, compte, note.</p></div><button type="button" class="icon-btn" data-close aria-label="Fermer">${N.icon('x', 16, 2.2)}</button></div>
      <div class="mintro"><button type="button" class="btn ghost" data-act="csv-template">${N.icon('download', 15)} Télécharger le modèle</button></div>
      <label class="drop" id="csvDrop"><input type="file" id="csvFile" accept=".csv,text/csv,text/plain" hidden>${N.icon('upload', 22)}<b>Choisis ton fichier .csv</b><small>ou glisse-le ici</small></label>
      <div id="csvOut" class="csv-out" hidden></div><p class="merr" id="csvErr" hidden></p>
      <div class="mfoot"><span></span><div class="mfoot-r"><button type="button" class="btn ghost" data-close>Fermer</button><button type="button" class="btn dark" id="csvGo" disabled>Importer</button></div></div></div>`, { wide: true, noFocus: true });
    let parsed = null;
    const out = N.$('#csvOut', m.box), err = N.$('#csvErr', m.box), go = N.$('#csvGo', m.box), file = N.$('#csvFile', m.box), drop = N.$('#csvDrop', m.box);
    const read = async (f) => {
      if (!f) return;
      const text = await f.text(); parsed = N.api.parseCsv(text);
      out.hidden = false; err.hidden = true;
      const ok = parsed.rows.length;
      out.innerHTML = `<b>${ok} opération${ok > 1 ? 's' : ''} prête${ok > 1 ? 's' : ''} à importer</b>` + (ok ? `<small>du ${F.date(parsed.rows.reduce((a, r) => (r.date < a ? r.date : a), '9999'))} au ${F.date(parsed.rows.reduce((a, r) => (r.date > a ? r.date : a), '0000'))}</small>` : '') + (parsed.errors.length ? `<ul>${parsed.errors.slice(0, 6).map((x) => `<li>${N.esc(x)}</li>`).join('')}${parsed.errors.length > 6 ? `<li>… et ${parsed.errors.length - 6} autre(s)</li>` : ''}</ul>` : '');
      go.disabled = !ok;
    };
    file.addEventListener('change', () => read(file.files[0]));
    ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => read(e.dataTransfer.files[0]));
    go.addEventListener('click', async () => {
      go.disabled = true; go.textContent = 'Import…';
      try { const n = await N.api.importRows(parsed.rows, (a, b) => { go.textContent = `Import ${a}/${b}`; }); m.close(); N.toast(`${n} opérations importées`, { icon: 'upload' }); N.refresh(); }
      catch (ex) { go.disabled = false; go.textContent = 'Importer'; err.hidden = false; err.textContent = ex.message; }
    });
  };
  N.acts['csv-template'] = () => N.api.csvTemplate();
})();

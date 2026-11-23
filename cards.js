/* cards.js · cartes en 3D.
   .bc-in { transform-style: preserve-3d; transition: transform .9s }
   .flip .bc-in { transform: rotateY(180deg) }      ← un clic retourne la carte */
(function () {
  'use strict';
  const N = window.NACRE, S = N.state, F = N.fmt;
  N.views = N.views || {};
  const cards = (N.cards = { sel: 0 });

  const last = (c) => '•••• ' + c.last4;

  /* grande carte : recto + verso. On ne stocke que les 4 derniers chiffres : le verso reste masqué. */
  cards.big = (c) => `<div class="bigcard bc-${c.style} ${c.frozen ? 'frozen' : ''}" data-card="${c.id}" data-act="card-flip" tabindex="0" role="button" aria-label="Carte ${N.esc(c.nickname)}, clique pour la retourner">
    <div class="bc-in">
      <div class="bc-face bc-front">
        <div class="bc-top"><span class="bc-brand">NACRE</span><span class="bc-nfc">${N.icon('radio', 20, 1.8)}</span></div>
        <div class="bc-chip"></div>
        <div class="bc-num">•••• •••• •••• ${N.esc(c.last4)}</div>
        <div class="bc-bot">
          <div><small>Titulaire</small><b>${N.esc(c.holder || c.nickname)}</b></div>
          <div><small>Expire</small><b>${N.esc(c.expiry || '—')}</b></div>
          <button type="button" class="bc-sw ${c.frozen ? 'on' : ''}" data-act="card-ctl" data-k="frozen" role="switch" aria-checked="${!!c.frozen}" aria-label="Geler la carte"><i></i></button>
        </div>
        <div class="bc-frost">${N.icon('snow', 22, 1.8)}<span>Carte gelée</span></div>
      </div>
      <div class="bc-face bc-back">
        <div class="bc-stripe"></div>
        <div class="bc-sign"><small>CVV</small><b>•••</b></div>
        <p class="bc-foot">Carte émise par NACRE · Paiements sécurisés 3-D Secure</p>
      </div>
    </div>
  </div>`;

  cards.mini = (c, i, sel) => `<button type="button" class="minicard bc-${c.style} ${sel ? 'sel' : ''} ${c.frozen ? 'frozen' : ''}" data-act="card-pick" data-i="${i}" aria-label="Carte ${N.esc(c.nickname)} ${c.last4}"><span class="mc-num">${last(c)}</span><span class="mc-name">${N.esc(c.nickname)}</span></button>`;

  cards.spent = (c) => {
    const ms = N.monthStart(N.today());
    return S.tx.reduce((s, t) => (t.card_id === c.id && t._out && t._d >= ms ? s + t._v : s), 0);
  };
  cards.recent = (c) => S.tx.filter((t) => t.card_id === c.id && t._out).slice(0, 3);

  const controls = [
    ['online_payments', 'globe', 'Paiements en ligne'],
    ['contactless', 'radio', 'Sans contact'],
    ['atm_withdrawals', 'euro', 'Retraits au distributeur'],
    ['frozen', 'snow', 'Geler la carte']
  ];

  N.views.cards = {
    title: 'Cartes',
    html() {
      if (!S.cards.length) return `<header class="page-head" data-in><div><h1>Cartes</h1><p class="sub">Gère tes cartes physiques et virtuelles.</p></div><div class="head-tools"><button class="btn dark" data-act="card-new">${N.icon('plus', 15, 2.4)} Nouvelle carte</button></div></header>
        <div class="empty tile" data-in><div class="empty-ic">${N.icon('card', 26)}</div><h3>Aucune carte pour l'instant</h3><p>Ajoute tes cartes (4 derniers chiffres seulement) pour suivre leurs plafonds, leurs dépenses et les geler d'un clic.</p><button class="btn dark" data-act="card-new">${N.icon('plus', 15, 2.4)} Ajouter une carte</button></div>`;
      if (cards.sel >= S.cards.length) cards.sel = 0;
      const c = S.cards[cards.sel];
      const spent = cards.spent(c), pct = c.monthly_limit > 0 ? Math.min(100, (spent / c.monthly_limit) * 100) : 0;
      const rec = cards.recent(c);
      return `<header class="page-head" data-in><div><h1>Cartes</h1><p class="sub">Gère tes cartes physiques et virtuelles.</p></div><div class="head-tools"><button class="btn dark" data-act="card-new">${N.icon('plus', 15, 2.4)} Nouvelle carte</button></div></header>
      <div class="cards-grid">
        <article class="tile cards-stage" data-in>
          <div class="stage-card" id="stageCard">${cards.big(c)}</div>
          <p class="flip-hint">${N.icon('eye', 14)} Clique sur la carte pour la retourner</p>
          <div class="minis">${S.cards.map((x, i) => cards.mini(x, i, i === cards.sel)).join('')}<button type="button" class="minicard add" data-act="card-new" aria-label="Ajouter une carte">${N.icon('plus', 18, 2.2)}</button></div>
        </article>
        <div class="cards-side">
          <article class="tile" data-in>
            <div class="tile-head"><h3>Dépenses de la carte</h3><button type="button" class="icon-btn sm" data-act="card-edit" aria-label="Modifier la carte">${N.icon('pencil', 14)}</button></div>
            <div class="cs-ring">${N.charts.ring(pct, { size: 92, stroke: 10, color: 'var(--acc)' })}<div><b class="cs-pct">${Math.round(pct)} %</b><small>du plafond de ${F.money(c.monthly_limit)}</small><small class="cs-spent">${F.money(spent)} ce mois-ci</small></div></div>
            <ul class="merch">${rec.length ? rec.map((t) => `<li><span class="m-ic">${N.icon(N.txIcon(t), 15)}</span><span class="m-n">${N.esc(t.label)}</span><span class="m-a">${F.money(-t._v, null, { dec: 2 })}</span></li>`).join('') : `<li class="muted">Aucune dépense avec cette carte. Choisis-la en ajoutant une opération.</li>`}</ul>
          </article>
          <article class="tile" data-in>
            <div class="tile-head"><h3>Contrôles</h3></div>
            <ul class="ctls">${controls.map(([k, ic, lab]) => `<li><span class="ctl-ic">${N.icon(ic, 16)}</span><span class="ctl-l">${lab}</span><button type="button" class="sw ${c[k] ? 'on' : ''}" data-act="card-ctl" data-k="${k}" role="switch" aria-checked="${!!c[k]}" aria-label="${lab}"><i></i></button></li>`).join('')}</ul>
          </article>
        </div>
      </div>`;
    },
    mount(root, o) { N.charts.ringsGo(root, o && o.animate); }
  };

  /* animation d'échange de carte quand on en choisit une autre */
  cards.swap = () => {
    const el = N.$('#stageCard .bigcard'); if (!el || !N.anim()) return;
    el.animate([{ opacity: 0, transform: 'rotateY(-28deg) translateX(-30px) scale(.94)', filter: 'blur(14px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 800, easing: N.EASE });
  };

  N.acts['card-flip'] = (el, e) => { if (e.target.closest('.bc-sw')) return; el.classList.toggle('flip'); };
  N.acts['card-pick'] = (el) => { cards.sel = +el.dataset.i; N.refresh(); cards.swap(); };
  N.acts['card-ctl'] = async (el, e) => {
    e.stopPropagation();
    const c = S.cards[cards.sel]; if (!c) return;
    const k = el.dataset.k, v = !c[k];
    try {
      const row = await N.api.update('cards', c.id, { [k]: v });
      Object.assign(c, row, { monthly_limit: Number(row.monthly_limit) });
      const flipped = N.$('.bigcard.flip') ? true : false;
      N.refresh();
      if (flipped) { const b = N.$('.bigcard'); if (b) b.classList.add('flip'); }
      if (k === 'frozen') N.toast(v ? 'Carte gelée — paiements bloqués' : 'Carte dégelée', { icon: v ? 'snow' : 'check' });
      else N.toast(`${controls.find((x) => x[0] === k)[2]} : ${v ? 'activé' : 'désactivé'}`);
    } catch (ex) { N.fail(ex); }
  };
})();

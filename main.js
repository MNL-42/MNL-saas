/* main.js · démarrage, connexion, navigation, coque de l'app.
   const EASE = 'cubic-bezier(.2,.8,.2,1)'
   panel.animate([{ transform: 'rotateX(14deg) scale(.92)', filter: 'blur(26px)' }, { transform: 'none', filter: 'blur(0px)' }], { duration: 1500, easing: EASE }) */
(function () {
  'use strict';
  const N = window.NACRE, S = N.state, F = N.fmt;
  const NAV = [['overview', "Vue d'ensemble", 'grid'], ['activity', 'Activité', 'swap'], ['cards', 'Cartes', 'card'], ['savings', 'Épargne', 'target'], ['reports', 'Rapports', 'chart'], ['settings', 'Paramètres', 'gear']];
  const $ = N.$;
  let shellBuilt = false, entering = false;

  /* ───────── écrans hors application ───────── */
  const showOnly = (id) => { ['#auth', '#stage', '#setup'].forEach((s) => { const e = $(s); if (e) e.hidden = s !== id; }); };
  const authIn = (el) => { if (N.anim()) el.animate([{ opacity: 0, transform: 'rotateX(14deg) scale(.94)', filter: 'blur(22px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1300, easing: N.EASE }); };

  function showSetup(kind) {
    const box = $('#setup');
    box.innerHTML = `<div class="auth-card glass"><div class="logo-big">${N.icon('drop', 30)}</div><h1>NACRE</h1>
      <p class="auth-msg show">${kind === 'lib' ? "La bibliothèque Supabase n'a pas pu se charger. Vérifie ta connexion internet puis recharge la page." : 'Il manque la configuration. Ouvre config.js et colle l\'URL et la clé publique de ton projet Supabase.'}</p></div>`;
    showOnly('#setup'); authIn(box.firstElementChild);
  }

  function showAuth(msg) {
    S.user = null; S.profile = null; shellBuilt = shellBuilt && false;
    N.applyTheme('emeraude'); document.documentElement.classList.remove('glass-light', 'no-anim');
    const box = $('#auth');
    box.innerHTML = `<div class="auth-card glass"><div class="logo-big">${N.icon('drop', 30)}</div><h1>NACRE</h1><p class="tagline">Créé par MNL</p>
      <form id="authForm" novalidate><div class="auth-tabs" role="tablist"><button type="button" class="on" data-mode="in">Se connecter</button><button type="button" data-mode="up">Créer un compte</button></div>
        <div class="fld up-only" hidden><label for="a_name">Prénom</label><input id="a_name" autocomplete="given-name" maxlength="40" placeholder="Andromis"></div>
        <div class="fld"><label for="a_mail">E-mail</label><input id="a_mail" type="email" autocomplete="email" required placeholder="toi@exemple.com"></div>
        <div class="creator-entry"><button type="button" class="link" id="a_creator_toggle">Accès créateur sans e-mail</button><div id="a_creator_box" hidden>
          <div class="fld"><label for="c_first">Prénom</label><input id="c_first" maxlength="40" autocomplete="given-name" placeholder="Prénom"></div>
          <div class="fld"><label for="c_last">Postnom</label><input id="c_last" maxlength="60" autocomplete="family-name" placeholder="Postnom"></div>
          <div class="fld"><label for="c_code">Code créateur</label><input id="c_code" type="password" autocomplete="off" placeholder="Code secret"></div>
          <button type="button" class="btn dark lg" id="a_creator_go">Activer mon accès</button>
        </div></div>
        <div class="fld"><label for="a_pw">Mot de passe</label><input id="a_pw" type="password" autocomplete="current-password" required minlength="8" placeholder="8 caractères minimum"></div>
        <button type="submit" class="btn dark lg" id="a_go">Se connecter</button>
        <button type="button" class="link" id="a_forgot">Mot de passe oublié ?</button>
        <p class="auth-msg ${msg ? 'show' : ''}" id="a_msg" role="alert">${N.esc(msg || '')}</p></form></div>`;
    showOnly('#auth'); authIn(box.firstElementChild);
    let mode = 'in';
    const form = $('#authForm'), say = (t, err) => { const m = $('#a_msg'); m.textContent = t; m.className = 'auth-msg show' + (err ? ' err' : ''); };
    form.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode; form.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b));
      $('.up-only', form).hidden = mode !== 'up'; $('#a_go').textContent = mode === 'up' ? 'Créer mon compte' : 'Se connecter';
      $('#a_forgot').hidden = mode === 'up'; $('#a_pw').autocomplete = mode === 'up' ? 'new-password' : 'current-password';
    }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#a_mail').value.trim(), pw = $('#a_pw').value, name = $('#a_name').value.trim();
      if (!email || !/.+@.+\..+/.test(email)) return say('Entre une adresse e-mail valide.', true);
      if (pw.length < 8) return say('Le mot de passe doit faire au moins 8 caractères.', true);
      const btn = $('#a_go'); btn.disabled = true;
      try {
        if (mode === 'up') {
          const d = await N.api.signUp(email, pw, name);
          if (d.session) return; /* e-mail déjà confirmé automatiquement : onAuth prend le relais */
          if (d.user && d.user.identities && d.user.identities.length === 0) say('Un compte existe déjà avec cet e-mail. Connecte-toi.', true);
          else say('Compte créé. Ouvre le mail de confirmation que Supabase vient de t\'envoyer, puis reviens te connecter.');
        } else await N.api.signIn(email, pw);
      } catch (ex) { say(/invalid login/i.test(ex.message) ? 'E-mail ou mot de passe incorrect.' : /not confirmed/i.test(ex.message) ? 'Confirme d\'abord ton e-mail (lien reçu par mail).' : ex.message, true); }
      btn.disabled = false;
    });
    $('#a_creator_toggle').addEventListener('click', () => { $('#a_creator_box').hidden = !$('#a_creator_box').hidden; });
    $('#a_creator_go').addEventListener('click', async () => {
      const first = $('#c_first').value.trim(), last = $('#c_last').value.trim(), code = $('#c_code').value;
      if (!first || !last || !code) return say('Renseigne ton prénom, ton postnom et le code créateur.', true);
      const btn = $('#a_creator_go'); btn.disabled = true;
      try {
        const d = await N.api.activateCreator(first, last, code);
        if (d && d.session) return;
        say('Activation terminée. Reconnecte-toi pour continuer.');
      } catch (ex) { say(ex.message || "Activation créateur impossible.", true); }
      btn.disabled = false;
    });
    $('#a_forgot').addEventListener('click', async () => {
      const email = $('#a_mail').value.trim(); if (!email) return say('Entre ton e-mail ci-dessus, puis clique à nouveau.', true);
      try { await N.api.resetPassword(email); say('Un lien de réinitialisation vient de t\'être envoyé.'); } catch (ex) { say(ex.message, true); }
    });
  }

  function showFatal(ex) {
    const missing = ex && (ex.code === '42P01' || ex.code === 'PGRST205' || /does not exist|schema cache/i.test(ex.message || ''));
    const box = $('#auth');
    box.innerHTML = `<div class="auth-card glass"><div class="logo-big">${N.icon('drop', 30)}</div><h1>NACRE</h1><p class="auth-msg show err">${missing ? "La base n'est pas prête : exécute d'abord schema.sql dans Supabase (SQL Editor)." : N.esc((ex && ex.message) || 'Erreur inattendue.')}</p><div class="auth-actions"><button type="button" class="btn dark" id="retry">Réessayer</button><button type="button" class="btn ghost" id="out">Se déconnecter</button></div></div>`;
    showOnly('#auth'); authIn(box.firstElementChild);
    $('#retry').addEventListener('click', () => { entering = false; enter(S.user); });
    $('#out').addEventListener('click', () => N.api.signOut());
  }

  /* ───────── coque de l'app ───────── */
  function buildShell() {
    if (shellBuilt) return; shellBuilt = true;
    $('#rail').innerHTML = `<button type="button" class="logo" data-go="overview" aria-label="NACRE">${N.icon('drop', 20, 2)}</button><div class="rail-mid">${NAV.map(([k, l, ic]) => `<button type="button" class="rb" data-go="${k}" data-view="${k}" aria-label="${l}" title="${l}">${N.icon(ic, 19)}</button>`).join('')}</div><button type="button" class="rb out" data-act="logout" aria-label="Se déconnecter" title="Se déconnecter">${N.icon('power', 19)}</button>`;
    $('#dock').innerHTML = `<div class="dock-tabs">${NAV.map(([k, l, ic]) => `<button type="button" data-go="${k}" data-view="${k}" aria-label="${l}"><i class="dk-ic">${N.icon(ic, 18)}</i><span>${l}</span></button>`).join('')}</div><button type="button" class="plus" data-act="quick" aria-label="Ajouter" aria-haspopup="true">${N.icon('plus', 20, 2.4)}</button>`;
    $('#quick').innerHTML = [['tx-new', 'plus', 'Nouvelle opération'], ['transfer', 'send', 'Virer'], ['receive', 'recv', 'Recevoir'], ['goal-new', 'target', 'Nouvel objectif'], ['card-new', 'card', 'Nouvelle carte'], ['acc-new', 'wallet', 'Nouveau compte']].map(([a, ic, l]) => `<button type="button" data-act="${a}">${N.icon(ic, 16)}<span>${l}</span></button>`).join('');
    $('#kbd').textContent = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘ K' : 'Ctrl K';
    N.pal.bind();
  }
  N.updateShell = () => {
    const name = (S.profile && S.profile.display_name) || ((S.user && S.user.email) || '').split('@')[0] || '';
    $('#whoName').textContent = name; $('#avatar').textContent = N.initials(name);
    N.$$('[data-view]').forEach((b) => { const on = b.dataset.view === S.view; b.classList.toggle('on', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
    const dot = $('#bellDot'); if (dot) dot.hidden = !notifications().length;
  };

  /* ───────── rendu / navigation ───────── */
  N.render = (o) => {
    o = o || {};
    const v = N.views[S.view] || N.views.overview, root = $('#view');
    const keep = o.animate ? 0 : root.scrollTop;
    if (o.animate) N.seen = {};
    root.classList.toggle('animating', !!o.animate);
    root.innerHTML = v.html();
    N.rollAll(root);
    if (v.mount) v.mount(root, o);
    if (o.animate) N.enter(root);
    root.scrollTop = keep;
    document.title = 'NACRE · ' + (v.title || '');
    N.updateShell();
  };
  N.refresh = () => N.render({ animate: false });
  N.go = (view) => {
    if (!N.views[view]) view = 'overview';
    S.view = view; try { history.replaceState(null, '', '#' + view); } catch (e) { /* ignore */ }
    const quick = $('#quick'); if (quick) quick.hidden = true; const bp = $('#bellPop'); if (bp) bp.hidden = true;
    N.render({ animate: true });
  };

  /* notifications : calculées sur tes vraies données */
  function notifications() {
    const out = [];
    S.goals.forEach((g) => { if (g.saved_amount >= g.target_amount) out.push({ ic: 'target', t: `Objectif atteint : ${g.name}`, s: F.money(g.target_amount) }); });
    S.cards.forEach((c) => { if (c.frozen) out.push({ ic: 'snow', t: `Carte •••• ${c.last4} gelée`, s: c.nickname }); });
    S.tx.slice(0, 4).forEach((t) => out.push({ ic: N.txIcon(t), t: t.label, s: `${F.groupLabel(t._d)} · ${F.money(t._in ? t._v : -t._v, null, { plus: true, dec: 2 })}` }));
    return out.slice(0, 6);
  }
  N.acts.bell = () => {
    const b = $('#bellPop'); const list = notifications();
    b.innerHTML = `<h4>Notifications</h4>` + (list.length ? list.map((n) => `<div class="np"><span>${N.icon(n.ic, 14)}</span><div><b>${N.esc(n.t)}</b><small>${N.esc(n.s)}</small></div></div>`).join('') : '<p class="muted">Rien de nouveau.</p>');
    b.hidden = !b.hidden;
    if (!b.hidden && N.anim()) b.animate([{ opacity: 0, transform: 'translateY(-8px) scale(.98)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 380, easing: N.EASE });
  };
  N.acts.quick = () => { const q = $('#quick'); q.hidden = !q.hidden; if (!q.hidden && N.anim()) q.animate([{ opacity: 0, transform: 'translateY(10px) scale(.96)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 380, easing: N.EASE }); };
  N.acts['focus-cmd'] = () => { const i = $('#cmdIn'); i.focus(); i.select(); };
  N.acts.logout = async () => { try { await N.api.signOut(); } catch (e) { N.fail(e); } };

  /* ───────── session ───────── */
  async function enter(user) {
    if (entering || !user) return; entering = true;
    S.user = user;
    try {
      await N.api.loadProfile(user); N.applyPrefs();
      await N.api.loadAll();
      let ran = 0; try { ran = await N.api.runAutosave(); } catch (e) { console.warn('autosave', e); }
      buildShell();
      const h = (location.hash || '').replace('#', ''); S.view = N.views[h] ? h : 'overview';
      showOnly('#stage');
      const panel = $('#panel');
      N.render({ animate: true });
      if (N.anim()) panel.animate([{ transform: 'rotateX(14deg) scale(.92)', filter: 'blur(26px)', opacity: 0 }, { transform: 'none', filter: 'blur(0px)', opacity: 1 }], { duration: 1500, easing: N.EASE });
      if (ran > 0) N.toast(`${ran} virement${ran > 1 ? 's' : ''} mensuel${ran > 1 ? 's' : ''} d'épargne effectué${ran > 1 ? 's' : ''}`, { icon: 'target' });
    } catch (ex) { console.error(ex); showFatal(ex); }
    entering = false;
  }

  function recovery() {
    setTimeout(() => N.form({ title: 'Nouveau mot de passe', sub: 'Choisis un nouveau mot de passe pour ton compte.', fields: [{ name: 'pw', label: 'Nouveau mot de passe', type: 'password', required: true, autocomplete: 'new-password', span: 2 }, { name: 'pw2', label: 'Confirmer', type: 'password', required: true, autocomplete: 'new-password', span: 2 }], submit: 'Valider', validate: (v) => (v.pw.length < 8 ? 'Au moins 8 caractères.' : v.pw !== v.pw2 ? 'Les deux mots de passe sont différents.' : ''), onSubmit: async (v) => { await N.api.setPassword(v.pw); N.toast('Mot de passe changé'); } }), 600);
  }

  /* ───────── événements globaux ───────── */
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { N.go(g.dataset.go); return; }
    const el = e.target.closest('[data-act]');
    const q = $('#quick');
    if (q && !q.hidden && !(e.target.closest('#quick') || (el && el.dataset.act === 'quick'))) q.hidden = true;
    if (q && !q.hidden && e.target.closest('#quick') && el) q.hidden = true;
    const bp = $('#bellPop'); if (bp && !bp.hidden && !(e.target.closest('#bellPop') || (el && el.dataset.act === 'bell'))) bp.hidden = true;
    if (!el) return;
    const fn = N.acts[el.dataset.act]; if (!fn) return;
    try { const r = fn(el, e); if (r && r.catch) r.catch((x) => N.fail(x)); } catch (x) { N.fail(x); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.goal[data-act], .bigcard[data-act]')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-change]'); if (el && N.changes[el.dataset.change]) N.changes[el.dataset.change](el, e); });
  document.addEventListener('input', (e) => { const el = e.target.closest('[data-input]'); if (el && N.inputs && N.inputs[el.dataset.input]) N.inputs[el.dataset.input](el, e); });

  /* ───────── démarrage ───────── */
  async function boot() {
    document.documentElement.classList.add('ready');
    if (N.libMissing) return showSetup('lib');
    if (!N.configured) return showSetup('cfg');
    N.api.onAuth((ev, sess) => {
      /* ne jamais appeler Supabase directement ici : on sort du callback d'abord */
      if (ev === 'PASSWORD_RECOVERY') setTimeout(recovery, 0);
      else if (ev === 'SIGNED_OUT') setTimeout(() => { entering = false; showAuth(); }, 0);
      else if ((ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION') && sess && sess.user && (!S.user || S.user.id !== sess.user.id || !shellBuilt)) setTimeout(() => enter(sess.user), 0);
    });
    try {
      const sess = await N.api.getSession();
      if (!sess) showAuth();
      else if (!S.user && !entering) setTimeout(() => enter(sess.user), 0);
    } catch (ex) { showFatal(ex); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

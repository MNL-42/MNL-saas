/* reports.js · calculs, graphiques et page « Rapports ».
   // même nombre de points : la courbe se transforme (8 points, quelle que soit la période) */
(function () {
  'use strict';
  const N = window.NACRE, S = N.state, F = N.fmt;
  N.views = N.views || {};

  /* ───────────────────────── calculs ───────────────────────── */
  const calc = (N.calc = {});
  calc.sum = (from, to, pred) => { let s = 0; for (const t of S.tx) if (t._d >= from && t._d <= to && pred(t)) s += t._v; return s; };
  calc.inc = (f, t) => calc.sum(f, t, (x) => x._in);
  calc.exp = (f, t) => calc.sum(f, t, (x) => x._out);
  calc.sav = (f, t) => calc.sum(f, t, (x) => x._sav);
  calc.clients = (f, t) => calc.sum(f, t, (x) => x._in && /client/i.test(x.category));
  calc.delta = (cur, prev) => (prev === 0 ? (cur === 0 ? 0 : null) : ((cur - prev) / Math.abs(prev)) * 100);
  calc.byCat = (from, to, pred) => {
    const m = {};
    for (const t of S.tx) if (t._d >= from && t._d <= to && pred(t)) m[t.category || 'Autre'] = (m[t.category || 'Autre'] || 0) + t._v;
    return Object.entries(m).map(([cat, v]) => ({ cat, v })).sort((a, b) => b.v - a.v);
  };
  /* périodes du tableau de bord : jour / semaine / mois civil */
  calc.range = (p) => {
    const t = N.today();
    if (p === 'day') return { from: t, to: t, pf: N.addDays(t, -1), pt: N.addDays(t, -1) };
    if (p === 'week') return { from: N.addDays(t, -6), to: t, pf: N.addDays(t, -13), pt: N.addDays(t, -7) };
    const ms = N.monthStart(t), d = N.diffDays(ms, t), pms = N.addMonths(ms, -1);
    return { from: ms, to: t, pf: pms, pt: N.addDays(pms, Math.min(d, N.daysInMonth(pms) - 1)) };
  };
  /* périodes des rapports : fenêtres glissantes */
  calc.rrange = (p) => {
    const t = N.today(), n = p === 'week' ? 7 : p === 'month' ? 30 : 365;
    return { from: N.addDays(t, -(n - 1)), to: t, pf: N.addDays(t, -(2 * n - 1)), pt: N.addDays(t, -n) };
  };
  /* 8 points par courbe */
  calc.buckets = (p) => {
    const t = N.today(), out = [];
    for (let j = 0; j < 8; j++) {
      if (p === 'week') { const k = N.addDays(t, -(7 - j)); out.push({ from: k, to: k, label: F.wd(k) }); }
      else if (p === 'month') { const to = N.addDays(t, -(7 - j) * 4); out.push({ from: N.addDays(to, -3), to, label: String(+to.slice(8)) }); }
      else { const m0 = N.addMonths(N.monthStart(t), -(7 - j)); const to = N.addDays(N.addMonths(m0, 1), -1); out.push({ from: m0, to: to > t ? t : to, label: F.monthShort(m0) }); }
    }
    return out;
  };
  calc.series = (bks) => {
    const inc = bks.map(() => 0), out = bks.map(() => 0);
    for (const t of S.tx) { if (!(t._in || t._out)) continue; for (let i = 0; i < bks.length; i++) if (t._d >= bks[i].from && t._d <= bks[i].to) { if (t._in) inc[i] += t._v; else out[i] += t._v; break; } }
    return { inc, out };
  };
  calc.totalBalance = () => S.accounts.reduce((s, a) => s + a.balance * N.fx(a.currency), 0);
  calc.totalSaved = () => S.goals.reduce((s, g) => s + g.saved_amount, 0);

  /* ───────────────────────── briques graphiques ───────────────────────── */
  const ch = (N.charts = {});
  ch.catColor = (i) => ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'][i] || '#cdc3b7';
  ch.smooth = (pts) => {
    if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6, c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };
  ch.ring = (pct, o) => {
    o = o || {}; const s = o.size || 96, sw = o.stroke || 9, r = (s - sw) / 2, c = 2 * Math.PI * r, m = s / 2;
    return `<svg class="ring" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" data-c="${c.toFixed(2)}" data-p="${Math.max(0, Math.min(100, pct)).toFixed(1)}" aria-hidden="true"><circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="rgba(40,28,16,.08)" stroke-width="${sw}"/><circle class="ring-v" cx="${m}" cy="${m}" r="${r}" fill="none" stroke="${o.color || 'var(--warm)'}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}" transform="rotate(-90 ${m} ${m})"/></svg>`;
  };
  ch.ringsGo = (root, animate) => N.$$('.ring', root).forEach((svg) => {
    const v = N.$('.ring-v', svg), c = +svg.dataset.c, p = +svg.dataset.p, to = c * (1 - p / 100);
    if (!animate || !N.anim()) { v.style.strokeDashoffset = to; return; }
    requestAnimationFrame(() => requestAnimationFrame(() => { v.style.transition = 'stroke-dashoffset 1.3s var(--e)'; v.style.strokeDashoffset = to; }));
  });
  /* mini-courbe cumulée (flux net de la semaine) */
  ch.spark = (vals, labels, o) => {
    o = o || {}; const W = 360, H = 130, L = 8, R = 8, T = 10, B = 26;
    const mn = Math.min(0, ...vals), mx = Math.max(0.0001, ...vals), rng = mx - mn || 1;
    const pts = vals.map((v, i) => [L + (i * (W - L - R)) / Math.max(1, vals.length - 1), T + (1 - (v - mn) / rng) * (H - T - B)]);
    const d = ch.smooth(pts), area = d + ` L${pts[pts.length - 1][0].toFixed(1)},${H - B} L${pts[0][0].toFixed(1)},${H - B} Z`;
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".38"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#spg)"/><path class="spark-l" d="${d}" fill="none" stroke="var(--acc)" stroke-width="2.6" stroke-linecap="round" pathLength="1"/>${labels.map((l, i) => `<text x="${pts[i][0].toFixed(1)}" y="${H - 6}" text-anchor="middle" class="axl">${l}</text>`).join('')}</svg>`;
  };
  ch.badge = (pctVal, o) => {
    o = o || {};
    if (pctVal == null) return `<span class="badge neu">nouveau</span>`;
    const up = pctVal >= 0, good = o.invert ? !up : up;
    const txt = o.pts ? `${up ? '+' : '−'}${F.pct(Math.abs(pctVal), 1).replace(' %', '')} pt` : F.pct(Math.abs(pctVal), 1);
    return `<span class="badge ${Math.abs(pctVal) < 0.05 ? 'neu' : good ? 'pos' : 'neg'}">${N.icon(up ? 'up' : 'down', 12, 2.6)}${txt}</span>`;
  };

  /* ───────────────────────── page Rapports ───────────────────────── */
  const rep = (N.rep = { period: 'year', cur: null, raf: 0 });
  const W = 760, H = 300, PL = 22, PR = 22, PT = 22, PB = 40;

  N.views.reports = {
    title: 'Rapports',
    html() {
      const kp = (id, label, icon) => `<article class="tile kr" data-in><div class="kr-top"><span class="kr-label">${label}</span><span class="kr-ic">${N.icon(icon, 15, 2)}</span></div><div class="kr-val" id="rk-${id}"></div><div id="rb-${id}" class="kr-badge"></div></article>`;
      return `<header class="page-head" data-in><div><h1>Rapports</h1><p class="sub">Analyse tes revenus, tes dépenses et ton épargne.</p></div>
        <div class="head-tools"><div class="seg" id="repSeg" role="group" aria-label="Période">${[['week', 'Semaine'], ['month', 'Mois'], ['year', 'Année']].map(([k, l]) => `<button type="button" data-act="rep-period" data-p="${k}" class="${rep.period === k ? 'on' : ''}">${l}</button>`).join('')}</div></div></header>
        <div class="rep-kpis">${kp('inc', 'Revenus', 'euro')}${kp('exp', 'Dépenses', 'cal')}${kp('net', 'Bénéfice net', 'chart')}${kp('rate', "Taux d'épargne", 'target')}</div>
        <div class="rep-main">
          <article class="tile rep-chart" data-in><div class="tile-head"><h3>Revenus vs dépenses</h3><div class="legend"><span><i style="background:var(--acc)"></i>Revenus</span><span><i style="background:var(--c4)"></i>Dépenses</span></div></div>
            <div class="line-wrap"><svg id="repSvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Revenus et dépenses sur 8 périodes"></svg><div class="line-tip" id="repTip" hidden></div><div class="chart-empty" id="repEmpty" hidden>Ajoute des opérations pour voir ta courbe.</div></div></article>
          <article class="tile rep-donut" data-in><div class="tile-head"><h3>Dépenses par catégorie</h3></div>
            <div class="donut-wrap"><svg id="donutSvg" viewBox="0 0 200 200" aria-hidden="true"></svg><div class="donut-c"><small>Total</small><b id="donutTotal"></b></div></div><ul class="donut-leg" id="donutLeg"></ul></article>
        </div>`;
    },
    mount(root, o) {
      rep.cur = null; rep.svg = N.$('#repSvg', root);
      /* squelette du donut : 5 arcs réutilisés quand on change de période */
      const ds = N.$('#donutSvg', root);
      ds.innerHTML = `<circle cx="100" cy="100" r="78" fill="none" stroke="rgba(40,28,16,.07)" stroke-width="22"/>` + [0, 1, 2, 3, 4].map((i) => `<circle class="arc" data-i="${i}" cx="100" cy="100" r="78" fill="none" stroke-width="22" stroke-dasharray="0 999" transform="rotate(-90 100 100)"/>`).join('');
      rep.svg.addEventListener('mousemove', rep.hover); rep.svg.addEventListener('mouseleave', () => { const tip = N.$('#repTip'); if (tip) tip.hidden = true; N.$$('.hov', rep.svg).forEach((e) => e.setAttribute('opacity', 0)); });
      rep.paint(rep.period, o && o.animate);
    }
  };

  rep.paint = (p, animate) => {
    rep.period = p;
    const root = N.$('#view'); if (!root) return;
    N.$$('#repSeg button', root).forEach((b) => b.classList.toggle('on', b.dataset.p === p));
    const r = calc.rrange(p);
    const inc = calc.inc(r.from, r.to), exp = calc.exp(r.from, r.to), pinc = calc.inc(r.pf, r.pt), pexp = calc.exp(r.pf, r.pt);
    const net = inc - exp, pnet = pinc - pexp, rate = inc > 0 ? ((inc - exp) / inc) * 100 : 0, prate = pinc > 0 ? ((pinc - pexp) / pinc) * 100 : 0;
    const setK = (id, val, badge) => { N.roll(N.$('#rk-' + id, root), val, 'rk-' + id); N.$('#rb-' + id, root).innerHTML = badge + `<span class="kr-vs">${p === 'week' ? 'vs 7 j. précédents' : p === 'month' ? 'vs 30 j. précédents' : 'vs année précédente'}</span>`; };
    setK('inc', F.compact(inc), ch.badge(calc.delta(inc, pinc)));
    setK('exp', F.compact(exp), ch.badge(calc.delta(exp, pexp), { invert: true }));
    setK('net', F.compact(net), ch.badge(calc.delta(net, pnet)));
    setK('rate', F.pct(Math.max(0, rate)), ch.badge(rate - prate, { pts: true }));

    /* courbe : 8 points, les valeurs glissent vers leur nouvelle position */
    const bks = calc.buckets(p), ser = calc.series(bks);
    rep.labels = bks.map((b) => b.label);
    N.$('#repEmpty', root).hidden = !(inc + exp > 0) ? false : true;
    rep.tween(ser, animate);

    /* donut des dépenses par catégorie (top 4 + autres) */
    const cats = calc.byCat(r.from, r.to, (t) => t._out);
    const total = cats.reduce((s, c) => s + c.v, 0);
    const top = cats.slice(0, 4), rest = cats.slice(4).reduce((s, c) => s + c.v, 0);
    if (rest > 0) top.push({ cat: 'Autres', v: rest });
    N.roll(N.$('#donutTotal', root), F.compact(total), 'donut');
    const C = 2 * Math.PI * 78; let acc = 0;
    N.$$('.arc', root).forEach((a, i) => {
      const seg = top[i];
      if (!seg || total <= 0) { a.setAttribute('stroke-dasharray', `0 ${C}`); return; }
      const len = (seg.v / total) * C, gap = top.length > 1 ? 3 : 0;
      a.setAttribute('stroke', i === 4 ? '#cdc3b7' : ch.catColor(i));
      a.setAttribute('stroke-dasharray', `${Math.max(0, len - gap)} ${C}`);
      a.setAttribute('stroke-dashoffset', -acc);
      acc += len;
    });
    N.$('#donutLeg', root).innerHTML = total > 0
      ? top.map((c, i) => `<li><i style="background:${i === 4 ? '#cdc3b7' : ch.catColor(i)}"></i><span>${N.esc(c.cat)}</span><b>${F.pct((c.v / total) * 100, 0)}</b></li>`).join('')
      : `<li class="muted">Aucune dépense sur la période.</li>`;
  };

  rep.draw = (vals) => {
    const svg = rep.svg; if (!svg) return;
    const n = vals.inc.length, mx = Math.max(1, ...vals.inc, ...vals.out) * 1.12;
    const X = (i) => PL + (i * (W - PL - PR)) / (n - 1), Y = (v) => PT + (1 - v / mx) * (H - PT - PB);
    const pi = vals.inc.map((v, i) => [X(i), Y(v)]), po = vals.out.map((v, i) => [X(i), Y(v)]);
    const di = ch.smooth(pi), dO = ch.smooth(po);
    if (!svg.firstChild) {
      svg.innerHTML = `<defs><linearGradient id="repg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".34"/><stop offset="1" stop-color="var(--acc)" stop-opacity=".02"/></linearGradient></defs>
        <g class="grid">${[0.25, 0.5, 0.75].map((f) => `<line x1="${PL}" x2="${W - PR}" y1="${(PT + f * (H - PT - PB)).toFixed(1)}" y2="${(PT + f * (H - PT - PB)).toFixed(1)}"/>`).join('')}</g>
        <path class="a-inc" fill="url(#repg)"/><path class="l-inc" fill="none" stroke="var(--acc)" stroke-width="3.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        <path class="l-out" fill="none" stroke="var(--c4)" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".82"/>
        <line class="hov guide" y1="${PT}" y2="${H - PB}" opacity="0"/><circle class="hov d-i" r="5.5" opacity="0"/><circle class="hov d-o" r="5" opacity="0"/><g class="xl"></g>`;
      N.$('.xl', svg).innerHTML = rep.labels.map((l, i) => `<text x="${X(i).toFixed(1)}" y="${H - 12}" text-anchor="middle" class="axl">${N.esc(l)}</text>`).join('');
    }
    N.$$('.xl text', svg).forEach((t, i) => { t.textContent = rep.labels[i] || ''; });
    N.$('.a-inc', svg).setAttribute('d', di + ` L${X(n - 1).toFixed(1)},${H - PB} L${X(0).toFixed(1)},${H - PB} Z`);
    N.$('.l-inc', svg).setAttribute('d', di); N.$('.l-out', svg).setAttribute('d', dO);
    rep.geom = { X, Y, n };
  };
  rep.tween = (to, animate) => {
    cancelAnimationFrame(rep.raf);
    const from = rep.cur || { inc: to.inc.map(() => 0), out: to.out.map(() => 0) };
    const dur = N.anim() ? (animate === false && rep.cur ? 700 : 1000) : 0, t0 = performance.now();
    if (rep.svg) { const old = N.$('.xl', rep.svg); if (old) old.innerHTML = rep.labels.map((l, i) => `<text x="${(PL + (i * (W - PL - PR)) / 7).toFixed(1)}" y="${H - 12}" text-anchor="middle" class="axl">${N.esc(l)}</text>`).join(''); }
    const step = (now) => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 4);
      rep.cur = { inc: to.inc.map((v, i) => from.inc[i] + (v - from.inc[i]) * e), out: to.out.map((v, i) => from.out[i] + (v - from.out[i]) * e) };
      rep.draw(rep.cur);
      if (k < 1) rep.raf = requestAnimationFrame(step);
    };
    rep.raf = requestAnimationFrame(step);
  };
  rep.hover = (e) => {
    const svg = rep.svg; if (!svg || !rep.geom || !rep.cur) return;
    const rc = svg.getBoundingClientRect(), x = ((e.clientX - rc.left) / rc.width) * W;
    const { X, Y, n } = rep.geom; const i = Math.max(0, Math.min(n - 1, Math.round(((x - PL) / (W - PL - PR)) * (n - 1))));
    const g = N.$('.guide', svg), di = N.$('.d-i', svg), dO = N.$('.d-o', svg);
    g.setAttribute('x1', X(i)); g.setAttribute('x2', X(i)); di.setAttribute('cx', X(i)); di.setAttribute('cy', Y(rep.cur.inc[i])); dO.setAttribute('cx', X(i)); dO.setAttribute('cy', Y(rep.cur.out[i]));
    g.setAttribute('opacity', 1); di.setAttribute('opacity', 1); dO.setAttribute('opacity', 1);
    const tip = N.$('#repTip'); tip.hidden = false;
    tip.innerHTML = `<b>${N.esc(rep.labels[i])}</b><span><i style="background:var(--acc)"></i>${F.money(rep.cur.inc[i], null, { dec: 0 })}</span><span><i style="background:var(--c4)"></i>${F.money(rep.cur.out[i], null, { dec: 0 })}</span>`;
    tip.style.left = Math.min(rc.width - 130, Math.max(0, (X(i) / W) * rc.width - 58)) + 'px';
  };

  N.acts['rep-period'] = (el) => rep.paint(el.dataset.p, false);
})();

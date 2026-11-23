/* pwa.js · installation sur l'écran d'accueil + enregistrement du service worker. */
(function () {
  'use strict';
  const N = (window.NACRE = window.NACRE || {});
  N.acts = N.acts || {};
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const pwa = (N.pwa = { prompt: null, standalone: standalone, ios: isIos });

  const refreshSettings = () => { if (N.state && N.state.view === 'settings' && N.refresh && document.querySelector('#view')) N.refresh(); };

  /* Chrome / Edge / Android proposent l'installation via cet événement */
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pwa.prompt = e; refreshSettings(); });
  window.addEventListener('appinstalled', () => { pwa.prompt = null; if (N.toast) N.toast('MNL est installée sur ton appareil', { icon: 'check' }); refreshSettings(); });

  N.acts['pwa-install'] = async () => {
    const p = pwa.prompt; if (!p) return;
    pwa.prompt = null;
    p.prompt();
    try { await p.userChoice; } catch (e) { /* ignore */ }
    refreshSettings();
  };

  /* service worker : seulement en HTTPS (GitHub Pages) ou en local */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    const hadController = !!navigator.serviceWorker.controller;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { scope: './' }).catch((e) => console.warn('service worker', e));
    });
    let told = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || told) return; told = true;
      if (N.toast) N.toast('Une nouvelle version de MNL est prête : recharge la page pour en profiter.', { icon: 'spark' });
    });
  }
})();

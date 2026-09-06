// ==UserScript==
// @name         X.com – geen automatische volgende video
// @namespace    x-no-autoadvance
// @version      1.0
// @description  Voorkomt dat X (Twitter) na afloop van een video automatisch doorspringt naar de volgende in de verticale videofeed. (Claude.ai Opus 5 high).
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    // Hoelang na een echte klik/toets/scroll een video nog mag starten (ms).
    gestureWindow: 2000,
    // Hoelang na het einde van een video programmatisch scrollen geblokkeerd wordt (ms).
    blockScrollAfterEnd: 2500,
    // true = video herhaalt zichzelf i.p.v. te stoppen op het laatste frame.
    loopInsteadOfStop: false,
  };

  let lastGesture = 0;
  let endedAt = 0;

  const markGesture = () => { lastGesture = Date.now(); };
  ['pointerdown', 'mousedown', 'click', 'keydown', 'touchstart', 'wheel'].forEach((type) => {
    window.addEventListener(type, markGesture, { capture: true, passive: true });
  });

  const nativePlay = HTMLMediaElement.prototype.play;

  // 1) Het 'ended'-event afvangen in de capture-fase, vóór het de video bereikt.
  //    De eigen handler van X ziet het einde dus nooit en start de volgende video niet.
  window.addEventListener('ended', function (e) {
    const media = e.target;
    if (!(media instanceof HTMLMediaElement)) return;

    endedAt = Date.now();
    e.stopImmediatePropagation();
    e.stopPropagation();

    if (CONFIG.loopInsteadOfStop) {
      try {
        media.currentTime = 0;
        nativePlay.call(media);
      } catch (_) { /* negeren */ }
    }
  }, true);

  // 2) play() alleen toestaan kort na een echte interactie.
  //    Vangt auto-advance af die niet via 'ended' loopt.
  HTMLMediaElement.prototype.play = function () {
    if (Date.now() - lastGesture > CONFIG.gestureWindow) {
      return Promise.resolve();
    }
    return nativePlay.apply(this, arguments);
  };

  // 3) Programmatisch scrollen vlak na het einde van een video blokkeren,
  //    zodat de feed niet zelf naar het volgende item springt.
  const blockedNow = () =>
    Date.now() - endedAt < CONFIG.blockScrollAfterEnd &&
    Date.now() - lastGesture > CONFIG.gestureWindow;

  const guard = (obj, name) => {
    const original = obj[name];
    if (typeof original !== 'function') return;
    obj[name] = function () {
      if (blockedNow()) return;
      return original.apply(this, arguments);
    };
  };

  guard(Element.prototype, 'scrollIntoView');
  guard(Element.prototype, 'scrollTo');
  guard(Element.prototype, 'scrollBy');
  guard(window, 'scrollTo');
  guard(window, 'scrollBy');
})();

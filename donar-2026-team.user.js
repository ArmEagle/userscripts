// ==UserScript==
// @name         Donar 2026 team player stats
// @namespace    userscripts.armeagle.nl
// @version      2026-08-30
// @author       ArmEagle
// @match        https://www.donar.nl/teams/donar
// @grant        none
// @version      1.0
// ==/UserScript==

(() => {
  'use strict';

  const MARK = 'donar-info';

  const DATA = {
    "bryan-antoine":      { lengte: 196, geb: "26-04-2000", nat: "Amerikaans", },
    "dola-adebayo":       { lengte: 203, geb: "03-07-2003", nat: "Amerikaans", },
    "kevon-godwin":       { lengte: 188, geb: "04-03-2000", nat: "Amerikaans", },
    "jalen-deloach":      { lengte: 206, geb: "04-04-2002", nat: "Amerikaans", },
    "siem-uijtendaal":    { lengte: 198, geb: "05-05-2001", nat: "Nederlands", },
    "oshean-brathwaite":  { lengte: 183, geb: "28-05-2002", nat: "Nederlands", },
    "brandon-bergsma":    { lengte: 205, geb: "25-09-2001", nat: "Nederlands", },
    "dele-adetunji":      { lengte: 191, geb: "05-10-2003", nat: "Nederlands", },
    "michael-mccalister": { lengte: 196, geb: "01-11-2002", nat: "Amerikaans", },
    "alex-merkviladze":   { lengte: 203, geb: "11-03-2002", nat: "Georgisch", },
  };

  const leeftijd = s => {
    const m = s && s.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (!m) return '';
    const [, d, mm, y] = m, nu = new Date();
    let a = nu.getFullYear() - +y;
    if (nu < new Date(nu.getFullYear(), mm - 1, +d)) a--;
    return a + ' jaar';
  };

  // laatste tekst-element in de kaart = de positie; eigen regel overslaan
  const posEl = a => [...a.querySelectorAll('*')]
    .filter(n => !n.children.length && n.textContent.trim() && !n.classList.contains(MARK))
    .pop();

  let obs, t;

  const run = () => {
    obs && obs.disconnect();                 // eigen mutaties niet terugkoppelen
    try {
      for (const a of document.querySelectorAll('a[href*="/speler/"]')) {
        if (a.querySelector('.' + MARK)) continue;   // regel staat er al
        const info = DATA[a.pathname.split('/').pop()];
        const pos = info && posEl(a);
        if (!pos) continue;

        const regel = [info.lengte + ' cm', leeftijd(info.geb), info.nat]
          .filter(Boolean).join(' · ');

        const el = pos.cloneNode(false);     // zelfde tag + classes → zelfde font
        el.classList.add(MARK);
        el.textContent = regel;
        pos.insertAdjacentElement('afterend', el);
      }
    } finally {
      obs && obs.observe(document.body, { childList: true, subtree: true });
    }
  };

  obs = new MutationObserver(() => { clearTimeout(t); t = setTimeout(run, 100); });
  run();
})();

// ==UserScript==
// @name         Donar: extra spelerinfo in overzicht
// @match        https://www.donar.nl/teams/*
// @match        https://www.donar.nl/
// @grant        none
// @version      2.1
// ==/UserScript==

(() => {
  'use strict';

  const MARK = 'donar-info';

  const DATA = {
    "bryan-antoine":      { lengte: 196, geb: "26-04-2000", nat: "Amerikaans", vorigeClub: "Den Helder Suns, NCAA" },
    "dola-adebayo":       { lengte: 203, geb: "03-07-2003", nat: "Amerikaans", vorigeClub: "NCAA" },
    "kevon-godwin":       { lengte: 188, geb: "04-03-2000", nat: "Amerikaans", vorigeClub: "Luxemburg, Spanje(3)" },
    "jalen-deloach":      { lengte: 206, geb: "04-04-2002", nat: "Amerikaans", vorigeClub: "Bosnië/VK, NCAA"},
    "siem-uijtendaal":    { lengte: 198, geb: "05-05-2001", nat: "Nederlands", vorigeClub: "Den Helder Suns, NCAA" },
    "oshean-brathwaite":  { lengte: 183, geb: "28-05-2002", nat: "Nederlands", vorigeClub: "Hubo, Weert", contract: "2027/28" },
    "brandon-bergsma":    { lengte: 205, geb: "25-09-2001", nat: "Nederlands", vorigeClub: "Leiden (en 2e)" },
    "dele-adetunji":      { lengte: 191, geb: "05-10-2003", nat: "Nederlands", vorigeClub: "Donar (2023)" },
    "michael-mccalister": { lengte: 196, geb: "01-11-2002", nat: "Amerikaans", vorigeClub: "Holbæk-Stenhus (DK), NCAA 2"},
    "alex-merkviladze":   { lengte: 203, geb: "11-03-2002", nat: "Georgisch" , vorigeClub: "Oostende/Griekenland, NCAA"}
  };

  // elk veld: hoe kom je aan de waarde (d = de speler uit DATA)
  // return '' of undefined → veld wordt overgeslagen
  const VELDEN = {
    lengte:     d => d.lengte && d.lengte + ' cm',
    leeftijd:   d => { const a = jaren(d.geb); return a && a + ' jaar'; },
    nat:        d => d.nat,
    geb:        d => d.geb,
    vorigeClub: d => d.vorigeClub,
    contract:   d => d.contract && 'tot ' + d.contract,
  };

  // welke velden op welke regel; regel zonder inhoud wordt niet getoond
  const REGELS = [
    ['lengte', 'leeftijd', 'nat'],
    ['vorigeClub', 'contract']
  ];

  const SCHEIDING = ' · ';

  const jaren = s => {
    const m = s && s.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (!m) return 0;
    const [, d, mm, y] = m, nu = new Date();
    let a = nu.getFullYear() - +y;
    if (nu < new Date(nu.getFullYear(), mm - 1, +d)) a--;
    return a;
  };

  const posEl = a => [...a.querySelectorAll('*')]
    .filter(n => !n.children.length && n.textContent.trim() && !n.classList.contains(MARK))
    .pop();

  let obs, t;

  const run = () => {
    obs && obs.disconnect();
    try {
      for (const a of document.querySelectorAll('a[href*="/speler/"]')) {
        if (a.querySelector('.' + MARK)) continue;
        const info = DATA[a.pathname.split('/').pop()];
        const pos = info && posEl(a);
        if (!pos) continue;

        let na = pos;
        for (const regel of REGELS) {
          const tekst = regel
            .map(naam => { try { return VELDEN[naam] && VELDEN[naam](info); } catch { return ''; } })
            .filter(Boolean)
            .join(SCHEIDING);
          if (!tekst) continue;

          const el = pos.cloneNode(false);   // zelfde tag + classes → zelfde font
          el.classList.add(MARK);
          el.textContent = tekst;
          na.insertAdjacentElement('afterend', el);
          na = el;                            // volgende regel eronder
        }
      }
    } finally {
      obs && obs.observe(document.body, { childList: true, subtree: true });
    }
  };

  obs = new MutationObserver(() => { clearTimeout(t); t = setTimeout(run, 100); });
  run();
})();

// ==UserScript==
// @name         HBO Max Play - Paris 2024 Olympics: grid view
// @namespace    armeagle.nl
// @version      2024-07-27
// @description  Shows the (main) "Every Moment Live - No Ad Breaks" section in a grid view to show as many live moment streams at once.
// @author       <armeagle@aemail.nl>
// @match        https://play.max.com/paris-2024
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const style = `
    /* Make the section headers create some more separation. */
	h2 {
		font-size: 2rem !important;
		line-height: 3rem !important;
        margin-bottom: 1rem !important;
	}

    /* The "Every Moment Live" section */
    #restoration_container > div:nth-child(3) {
        /* Add some space around this (main) section. */
        margin: 2rem 0;

        #tileList > div {
		    display: grid;
		    gap: 10px;
		    width: 100%;
		    grid-template-columns: repeat(3, 1fr);
        }
    }
    @media (min-width: 1100px) {
        #restoration_container > div:nth-child(3) #tileList > div {
            grid-template-columns: repeat(4, 1fr);
        }
    }
    @media (min-width: 1800px) {
        #restoration_container > div:nth-child(3) #tileList > div {
            grid-template-columns: repeat(6, 1fr);
        }
    }
    `;

    var style_element = document.createElement('style');
    style_element.textContent = style;

    document.body.append(style_element);
})();

// ==UserScript==
// @name        Gmail alias forward fixer
// @namespace   armeagle.nl
// @description Fixes reply from email address for mail forward aliases
// @include     https://mail.google.com/mail/u/*label/*PiratenPartij*
// @version     1
// @grant       none
// ==/UserScript==

/*
 * assume an aliasforwardmapping entry of
 *  'A' : 'B'
 * In my case I forward from address B to A. Some mails (maillists) are not detected as coming from B, but
 * A instead. This script will change the from address back to the wanted B. Which is an email alias,
 * configured in Gmail.
 */
var aliasforwardmapping = {
    'pirate@aemail.nl' : 'alex.haan@piratenpartij.nl'
}
var listenerSelectors = [
	'div[title="Reply"]',
	'div[title="Reply to all"]'
];

function ApplyAliasForwardMapping(target) {
	var from = document.querySelector('input[name=from]');
	console.log(['click', from]);
    if ( from ) {
        for (var key in aliasforwardmapping) {
            var value = aliasforwardmapping[key]; 
            if ( key == from.value ) {
                from.value = value;
                console.log('modified input from ' + key + ' to ' + value);
                var labels = document.querySelectorAll('div > span[dir=ltr]');
                for (i = 0; i < labels.length; i++) {
                    var label = labels[i];
                    if ( label.textContent.indexOf(key) ) {
                        label.textContent = label.textContent.replace(key, value);
                        console.log('modified label from ' + key + ' to ' + value);
                    }
                }
            }
        }
    }
}

var maxAttempts = 10;
function hookListeners() {
	//console.log(['attempt listener hooking', document.body]);
	//try {
	for (var i = 0; i < listenerSelectors.length; i++) {
		var element = document.querySelector(listenerSelectors[i]);
		if ( element ) {
			//console.log(['hooking listener to', element]);
			element.addEventListener('click', ApplyAliasForwardMapping);
			return;
		}
	}
	//} catch (e) { console.log(e);}
	
	if (maxAttempts-- > 0) {
		window.setTimeout(hookListeners, 1000);
	}
}
window.setTimeout(hookListeners, 1000);
console.log(1);
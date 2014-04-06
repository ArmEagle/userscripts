// ==UserScript==
// @name           Enable Form Autocomplete
// @namespace      http://armeagle.nl
// @description    Some websites use the form attribute 'autocomplete=off' so browsers won't store the login details. This script enables autocomplete.
// @include        http*
// @exclude        https://*rabobank*
// ==/UserScript==


var inputs = document.querySelectorAll('input[autocomplete="off"]');
if ( inputs != null ) {
	for (var ind=0; ind < inputs.length; ind++) {
		// console.log(inputs[ind]);
		inputs[ind].removeAttribute('autocomplete');
	}
}
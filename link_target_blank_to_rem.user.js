// ==UserScript==
// @name           Link Target 'blank' to removal
// @namespace      armeagle.nl
// @include        *
// @exclude        http://webmail.cpanel.your-webhost.nl/*
// @exclude        *armeagle.nl*
// ==/UserScript==

if (window.top == window) {
	var ahrefs = document.querySelectorAll('a[target]');
	for ( a_ind = 0; a_ind < ahrefs.length; a_ind++ ) {
		var a = ahrefs[a_ind];
		a.removeAttribute('target');
	}

	// remove base target tag
	var bases = document.querySelectorAll("base[target]");
	for (ind = 0; ind < bases.length; ind++) {
		var base = bases[ind];
		base.removeAttribute('target');
	}
}
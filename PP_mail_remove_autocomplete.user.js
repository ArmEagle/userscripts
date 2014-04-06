// ==UserScript==
// @name        PP mail remove autocomplete
// @namespace   armeagle.nl
// @include     https://mail.piratenpartij.nl/*
// @version     1
// ==/UserScript==

var password = document.getElementById('rcmloginpwd');
if (password) {
	password.removeAttribute('autocomplete');
}
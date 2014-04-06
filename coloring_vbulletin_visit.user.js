// ==UserScript==
// @name           Coloring vBulletin visited links 
// @namespace      http://armeagle.nl
// @description    For tracking what developer posts, listed in a devtracker, you have read, it is handy when visited links are colored differently
// @include        http://forums.startrekonline.com/search.php?searchid=*
// ==/UserScript==

var site = location.href.replace('http://','').split('/')[0];
var siteColors = { 'forums.startrekonline.com': '#ccccff',
				   'www.burningsea.com': '#333366'};

var body = document.getElementsByTagName('body')[0];
var style = document.createElement('style');
style.setAttribute('type', 'text/css');
style.textContent = 'a:visited { color: '+ siteColors[site] +'}';

body.appendChild(style);

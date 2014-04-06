// ==UserScript==
// @name           GitHub source width
// @namespace      armeagle.nl
// @include        https://github.com/*
// ==/UserScript==

GM_addStyle(" \
.site .container { width: 90% } \
.site .container #slider .frames, \
.site .container #slider .frames .frame {width: 100%;} \
");
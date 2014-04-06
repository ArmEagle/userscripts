// ==UserScript==
// @name           hooah sabbie
// @namespace      armeagle.nl
// @include        http://battlelog.battlefield.com/bf3/user/-DH-Sabbie/
// ==/UserScript==

var as = document.querySelectorAll('.feed-like-item:not([style]) a');
for (index = 0; index < as.length; index++) {
  var a = as[index];
  a.click();
}
console.log('hooahed '+ as.length);
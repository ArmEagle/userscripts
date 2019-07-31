// ==UserScript==
// @name     Twitter: Replace home with custom search
// @description Redirects from Twitter (Mobile) Home to the search page with a specific filter set with less garbage and orders by time!
// @namespace armeagle.nl
// @version  1
// @grant    none
// @include  https://mobile.twitter.com*
// ==/UserScript==

// Use MutationObserver because there's no window.location change event.
// This also covers initial load.
// And allows for easy coverage of other features
let bodyList = document.querySelector('body');
let observer = new MutationObserver((mutations) => {
	mutations.forEach((mutation) => {
    // Fix 'home' by redirecting to filter page.
		if (document.location.href === 'https://mobile.twitter.com/home') {
			window.location.href = 'https://mobile.twitter.com/search?q=filter%3Afollows%20-filter%3Areplies%20include%3Anativeretweets&src=typed_query&f=live';
    }
    // Fix title on filter page to "Home".
    if (!mutation.target) {
      return;
    }
    if ((headers = mutation.target.querySelectorAll('h2'))) {
      headers.forEach((element) => {
        if (element.textContent.indexOf('filter:follows') > -1) {
          element.textContent = 'Home';
        }
      });
    }
    // Empty search box
    if ((inputs = mutation.target.querySelectorAll('input'))) {
      inputs.forEach((element) => {
        if (element.getAttribute('placeholder') === 'Search Twitter' && element.value.indexOf('filter:follows') > -1) {
          element.value = '';
        }
      });
    }
  });
});

let config = {
  childList: true,
  attributes: true,
  subtree: true
};

observer.observe(bodyList, config);

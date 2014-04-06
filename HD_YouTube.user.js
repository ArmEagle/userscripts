// ==UserScript==
// @name           HD YouTube
// @namespace      armeagle.nl
// @include        *youtube.com*
// ==/UserScript==

function DOM_script() {
	var script = document.getElementsByTagName('head')[0].appendChild(document.createElement('script'));
	script.setAttribute('type', 'text/javascript');
	return script.textContent=DOM_script.toString().replace(/[\s\S]*"\$1"\);([\s\S]*)}/,"$1");

	var AEincreaseQualities = '  small,medium,large';
	var AEsetQuality = 'hd720';
	var AEplayer = null;
	var AEmaxtries = 5;

	window.AEcallback = function(event) {
		console.log('callback');
		if (event == 1) {
			window.AEincreaseQuality();
		}
	}
	window.AEincreaseQuality = function() {
		console.log('AEincreaseQuality');
		AEmaxtries--;
		if (AEmaxtries < 0) {
			return;
		}
		
		if (AEplayer.getPlaybackQuality == null) {
			setTimeout(AEincreaseQuality, 300);
		} else {
			var quality = AEplayer.getPlaybackQuality();
			if (AEincreaseQualities.indexOf(quality) > 0) {
				AEplayer.setPlaybackQuality(AEsetQuality);
			}
			quality = AEplayer.getPlaybackQuality();
			if (quality != AEsetQuality) {
				setTimeout(AEincreaseQuality, 300);
			}
		}
	}

	AEplayer = document.getElementById('movie_player');

	if (AEplayer) {
		AEplayer.addEventListener('onStateChange', AEcallback);
		window.AEincreaseQuality();
	} else {
		document.addEventListener('DOMNodeInserted', function(event) {
			if (event.target && event.target.hasAttribute('id') && event.target.getAttribute('id') == 'movie_player') {
				AEplayer = document.getElementById('movie_player');
		
				if (AEplayer) {
					AEplayer.addEventListener('onStateChange', AEcallback);
					AEmaxtries = 5;
					window.AEincreaseQuality();
				}
		
			}
		});
	}
}
DOM_script();
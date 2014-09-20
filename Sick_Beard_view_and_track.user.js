// ==UserScript==
// @name        Sick Beard view and track
// @namespace   armeagle.nl
// @include     http://*:8081/home/displayShow?show=*
// @version     1.03
// @grant       none
// @run-at      document-end
// ==/UserScript==

(function() {
var path_replace = {'/volume1/Data/' : 'file:///H:/'};
var watched_color = '#aaaaff';

// add querystring getter
function getQueryStringParameter(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

var showId = getQueryStringParameter('show');

// change filename to link
var basePath = $('div#summary table tbody tr td:contains(Location:)').next()[0].textContent;
$.each(path_replace, function(k, v) {
	basePath = basePath.replace(k, v);
});


$('table.sickbeardTable tbody tr td:nth-child(7)').each(function() {
    var fileName = $(this).text().trim();
    if ( ! fileName || fileName.length <= 0 ) {
        return;
    }
    var filePath = basePath + '/' + fileName;
    $(this).empty().append(
        $('<a/>').attr('href', filePath)
		.addClass('filelink')
        .text(fileName)
		.on('keydown', function(event) {
			return handleKeyEvent(event);
		})
    );
});
// end

// add watch(ed) button and states
$('table.sickbeardTable tbody tr td[colspan=9]').each(function() {
	if ( ! $(this).closest('tr').hasClass('seasonheader') ) {
		$(this).attr('colspan', 10);
		return;
	}
	$(this).before($('<td/>').append($('<button/>').attr('title', 'Mark whole season as watched').append('m').on('click', function() {
		var tr = $(this).closest('tr').next().next();
		while ( tr.attr('class').length ) {
			tr.find('td button.button-watch:not(.watched)').each(function() {
				$(this).trigger('click');
			});
			tr = tr.next();
		}
	})));
});

// add extra column to header rows
$('table.sickbeardTable tbody tr th:nth-child(1)').each(function() {
    $(this).next().next().next().next().next().after(
        $('<th/>')
    )
});

$('table.sickbeardTable tbody tr td:nth-child(1)').each(function() {
    var button = createButton(showId, $(this).find('input').attr('id'));

    if ( button && button.hasClass('watched') ) {
        $(this).closest('tr').addClass('watched');
    }
    $(this).next().next().next().next().next().after($('<td/>').append(button));
});


function createButton(showId, episodeId) {
    if ( ! showId || ! episodeId ) {
        return null;
    }

    var db = JSON.parse(localStorage.getItem('watchedTracker'));
    if ( db && db[showId] && db[showId][episodeId] ) {
        return $('<button/>').append('y').addClass('btn btn-mini button-watch watched')
            .on('click', function() {
                toggleWatched($(this), showId, episodeId);
            });
    } else {
        return $('<button/>').append('n').addClass('btn btn-mini button-watch')
            .on('click', function() {
                toggleWatched($(this), showId, episodeId);
            });
    }
}

function toggleWatched(button, showId, episodeId) {
    var db = JSON.parse(localStorage.getItem('watchedTracker'));
    if ( ! db ) { db = {}; }
    if ( ! db[showId] ) { db[showId] = {}; }
	if ( ! button.hasClass('watched') ) {
		db[showId][episodeId] = true ;
	} else {
		delete db[showId][episodeId];
	}
    localStorage.setItem('watchedTracker', JSON.stringify(db));

    button.empty().append( button.hasClass('watched') ? 'n' : 'y' );
    button.closest('tr').toggleClass('watched');
    button.toggleClass('watched');
}

// Handle key up/down events (prev/next link) and 'm' button to toggle marked. Else do nothing.
function handleKeyEvent(event) {
	var element = $(event.target);
	switch (event.keyCode) {
		case 40: //down
			var tr = element.closest('tr').next();
			var filelinks = tr.find('a.filelink');
			while ( tr && ! filelinks.length ) {
				tr = tr.next();
				filelinks = tr.find('a.filelink');
			}
			if ( filelinks.length ) {
				filelinks[0].focus();
			}
		break;
		case 38: // up
			var tr = element.closest('tr').prev();
			var filelinks = tr.find('a.filelink');
			while ( tr && ! filelinks.length ) {
				tr = tr.prev();
				filelinks = tr.find('a.filelink');
			}
			if ( filelinks.length ) {
				filelinks[0].focus();
			}
		break;
		case 77: // m
			element.closest('td').prev().find('button').trigger('click'); // toggle marked
		break;
		default:
			return true;
	}
	event.stopPropagation();
	return false;
}
// end

// Add column for extra search links
$('table.sickbeardTable tbody tr th:nth-child(1)').each(function() {
    $(this).next().next().next().next().next().next().next().next().after(
        $('<th/>')
    )
});

$('table.sickbeardTable tbody tr td:nth-child(1)').each(function() {
    $(this).next().next().next().next().next().next().next().next().after(
		$('<td/>')
	);
});

// Add extra search links
$('table.sickbeardTable tbody tr td:last-child a.epSearch').each(function() {
	var showdetails = $(this).attr('href').match( new RegExp('.+season=([0-9]+)&episode=([0-9]+)'));
	var season = showdetails[1];
	var episode = showdetails[2];
	if ( season.length == 1 ) season = '0' + season;
	if ( episode.length == 1 ) episode = '0' + episode;
	var episode = ($('#content > h1.title > a').text() + ' S' + season + 'E' + episode).replace('&', ' ');

	// Add nzbindex search
	var img = $('<img/>').attr('src', $(this).find('img').attr('src')).attr('style', 'transform: rotate(270deg); margin-right: 5px;').attr('title', 'Search on NzbIndex');
	url = 'http://nzbindex.nl/search/?q=' + episode.replace(' ', '+') + '&age=&max=25&minage=&sort=agedesc&minsize=150&maxsize=&dq=&poster=&nfo=&complete=1&hidespam=0&hidespam=1&more=1';
	$(this).closest('td').prev().append($('<a/>').attr('href', url).append(img));

	// Add EZTV search
	var img = $('<img/>').attr('src', $(this).find('img').attr('src')).attr('style', 'transform: rotate(90deg); margin-right: 5px;').attr('title', 'Search on NzbIndex');
	url = 'https://eztv.it/search/?SearchString1=' + episode;
	var $form = $('<form/>').attr('action', url).attr('target','blank').attr('method','POST');
	$form.attr('class', 'mysearch').append($('<input/>').attr('type', 'hidden').attr('name', 'SearchString1').attr('value', episode));
	$form.append($('<button/>').attr('style', 'background: url(' + $(this).find('img').attr('src') + ')' ));
	$(this).closest('td').prev().append($form);
});

// add TPB search


// add styling
$('head').append(
	$('<style/>').append(' \
	.button-watch {  } \
	tr.watched { background: ' + watched_color + '; }  \
	form.mysearch { display: inline; } \
	form.mysearch button { height: 16px; width: 16px; border: none; } \
	')
);

})();

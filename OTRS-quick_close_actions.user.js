// ==UserScript==
// @name        OTRS quick close actions
// @namespace   armeagle.nl
// @include     https://tickets.piratenpartij.nl/otrs/index.pl?Action=AgentTicketClose*
// @version     1.1
// @grant       none
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==

try {
//(function(){
	var actions = [
		'spam',
		'niet voor presidium',
		'actie is ondernomen',
		'geen actie nodig'
	];
	
	var $input_subject = $('input#Subject');
	var $input_text = $('textarea#RichText');
	
	var $header = $('.Header');
	var $container = $('<div>', {
		
	});
	
	$('<h2>', {
		style: 'font-weight: bold; margin-top: 10px;',
		text: 'Snelle acties'
	}).appendTo($container);
	var $list = $('<ul>').appendTo($container);
	
	$.each(actions, function(index, text) {
		var $li = $('<li>', {
			style: 'cursor: pointer; list-style-type: initial; margin-left: 15px; font-weight: bold; line-height: 1.4rem;',
		}).appendTo($list);
		$('<a>', {
			text: text,
			click: function() {
				$input_subject.val(text);
				$input_text.val(text);
			}
		}).appendTo($li);
	});
	
	$container.appendTo($header.first());
	
	
	// add copy subject to text button
	var $copy = $('<a>', {
		text: 'Copy subject',
		style: 'position: absolute; left: 120px; margin-top: 30px; cursor: pointer; font-weight: bold;',
		click: function(event) {
			event.preventDefault();
			$input_text.val($input_subject.val());
		}
	}).insertBefore($('#RichTextField'));
	
	
	// resize
	window.resizeTo(950, 880 + 20 * actions.length);
//})();
} catch(e) {
	alert(e);
}

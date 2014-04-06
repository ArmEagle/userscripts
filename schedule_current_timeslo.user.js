// ==UserScript==
// @name           Schedule current timeslot marker
// @namespace      http://armeagle.nl
// @include        http://complete.gamingradio.net/tgrschedule?filter=all
// ==/UserScript==

var td = document.querySelector('#jukebox');
var table = td.querySelector('table');

// make the separator rows darker
var separator_row_cells = table.querySelectorAll('tr:nth-child(2n) > td');
for ( row_key in separator_row_cells ) {
	var cell = separator_row_cells[row_key];
	cell.setAttribute('style', 'background-color: rgb(64, 64, 64)');
}
// remove the yellow borders around free slot images and fade the 'reserved' TGR Jukebox slot images
var slot_images = table.querySelectorAll('img');
for ( image_key in slot_images ) {
	var image = slot_images[image_key];
	// remove yellow borders
	if ( image.hasAttribute('border') ) {
		image.removeAttribute('border');
	}
	// fade the 'reserved' TGR Jukebox slot images
	if ( image.getAttribute('src').indexOf('schedule/dj.png') > 0 &&
		 image.parentNode.tagName == 'DIV' &&
		 image.parentNode.parentNode.tagName == 'TD' &&
		 image.parentNode.parentNode.querySelectorAll('div')[2].textContent.indexOf('TGR Jukebox') > 0 ) {
		image.setAttribute('style', 'opacity: 0.3;');
	} else {
		image.setAttribute('style', 'opacity: 0.9;');	
	}
}
// set z-index of all table cell child elements
var cell_children = table.querySelectorAll('td > div');
for ( key in cell_children ) {
	cell_children[key].setAttribute('style', 'position: relative; z-index: 11;');
}

// move the table into a div, to allow for relative positioning
var table_div = document.createElement('div');
table_div.setAttribute('style', 'position:relative');
td.appendChild(table_div);
table_div.appendChild(table);

// add vertical time marker
var vertical = document.createElement('div');
vertical.textContent = '';
vertical.setAttribute('id', 'AEGvertical_time_marker');
vertical.setAttribute('style', 'visible: hidden');
table_div.appendChild(vertical);


function DOM_script() {
	var script = document.getElementsByTagName('head')[0].appendChild(document.createElement('script'));
	script.setAttribute('type', 'text/javascript');
	return script.textContent=DOM_script.toString().replace(/[\s\S]*"\$1"\);([\s\S]*)}/,"$1");
	
function AEGupdateMarkers(now) {	
	if ( now === undefined ) {
		var now = new Date();
	}
	now.setUTCHours(now.getUTCHours()-1); // offset for the table starting at 01:00
	var table = document.querySelector('#jukebox table');
	
	var hours = (24+now.getUTCHours())%24 + now.getUTCMinutes()/60;
	var vertical_pos_x = 24+Math.round(hours*976/24);
	document.querySelector('#AEGvertical_time_marker').setAttribute('style', 'left: '+ vertical_pos_x +'px; top: 0px; position: absolute; width: 2px; background-color: red; height: 100%; z-index: 10');

	// scroll current day/slot into view and mark the row
	var day_row_count = ((7+now.getUTCDay()-1)%7)*2+1;
	var day_row = table.querySelector('tr:nth-child('+ day_row_count +')');
	day_row.scrollIntoView(false);
	if ( old_day_cell = document.querySelector('#AEGday_marker') ) {
		old_day_cell.removeAttribute('style');
		old_day_cell.removeAttribute('id');
	}
	var day_cell = day_row.querySelector('td:first-child');
	day_cell.setAttribute('style', 'background-color: red');
	day_cell.setAttribute('id', 'AEGday_marker');
	// mark the time header of the current slot
	if ( old_slot_marker = document.querySelector('#AEGslot_marker') ) {
		old_slot_marker.removeAttribute('style');
		old_slot_marker.removeAttribute('id');
	}
	var hour = Math.round(((24+now.getUTCHours()-1)%24)/3)*2%16+2;
	var slot_cell_header = day_row.querySelector('td:nth-child('+ hour +') > div:first-child > b');
	slot_cell_header.setAttribute('style', 'color: red');
	slot_cell_header.setAttribute('id', 'AEGslot_marker');
}

// update every 5 minutes
AEGupdateMarkers();
window.setInterval(AEGupdateMarkers, 300000);
}
DOM_script();
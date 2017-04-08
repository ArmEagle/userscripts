// ==UserScript==
// @name        cross domain messenger
// @namespace   armeagle.nl
// @description A combination of DomainMessenger and PostMessage is used to be able to send messages from domain A in one tab/window, to domain B in another. This is done by loading a hidden iframe with a random url of domain B in domain A's window. We can PostMessage to that frame. This userscript hooks into that hidden iframe using both messenge methods to talk to the parent window and the other window. The userscript also hooks into domain B to listen to messages from DomainMessenger. Of course at relevant places domains are whitelisted as needed. At the bottom of this userscript is full use of the classes, for which the current includes are set. In this state a button is added to the topleft corner on duckduckgo.com which can send a message to my (old, old) site on armeagle.nl. Open both websites and the web console. Click the button and see the magic happen!
// @include     https://duckduckgo.com*
// @include     https://armeagle.nl/*
// @version     1.2
// @grant       none
// ==/UserScript==

/**
 * Uses BroadcastChannel to communicate between pages on the same domain,
 * using the given channel.
 *
 * Usage example (use the first on two pages of the same domain):
 * 
	var dm = new DomainMessenger('testme', {
		message: function(message) {
			alert(message);
		}
	});
	
	dm.send('Hello World');
 *
 */
class DomainMessenger {	
	constructor(channel_id, options) {
		this.channel_id = channel_id;
		this.options = Object.assign({
			// optional callback method
			message: undefined
		}, options);

		this.channel = new BroadcastChannel(this.channel_id);
		this.channel.addEventListener('message', this.handleMessage.bind(this));
	}
	
	send(message) {
		this.log('Sending Broadcastchannel message', message);
		this.channel.postMessage(message);
	}
	
	handleMessage(event) {
		this.log('Received Broadcastchannel event', event, this.options.message);
		this.options.message(event.data);
	}
	
	
	debug() {
		[].push.call(arguments, this.options);
		[].push.call(arguments, this.constructor.name);
		console.debug.apply(this, arguments);
	}
	log() {
		[].push.call(arguments, this.options);
		[].push.call(arguments, this.constructor.name);
		console.log.apply(this, arguments);
	}	
	error() {
		[].push.call(arguments, this.options);
		[].push.call(arguments, this.constructor.name);
		console.log.apply(this, arguments);
	}
}
/**
 * Uses PostMessage to communicate between origins.
 * Passes any cross origin messages between domains using the Domainmessenger base.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
 *
 *
 * Usage example (use the first on two pages of different domains, one with send_origin set, the other with receive_origin):
 * 
	var cdm = new CrossDomainMessenger('testme', {
		// optional. Can also just send or pass on messages
		message: function(message) {
			alert(message);
		},
		send_origin: '', // optionally give a domain according to PostMessage requirements to allow sending messages.
		receive_origin: '', // optionally give a domain according to PostMessage requirements to allow receiving messages.
	});
	
	cdm.send('Hello World');
 *
 * Once a message has been sent to the window scope of the CrossDomainMessenger, it will also return messages sent from
 *  DomainMessengers sharing the same channel.
 */
class CrossDomainMessenger extends DomainMessenger {
	constructor(channel_id, options) {
		super(channel_id, options);
		
		this.options = Object.assign({
			// Set to be able to send cross domain messages
			send_origin: undefined,
			// Set to be able to receive cross domain messages
			receive_origin: undefined,
			// The cross origin source (window). Set on first message.
			other_origin_source: undefined
		}, options);
		
		window.addEventListener('message', this.handleCrossOriginMessage.bind(this), false);
	}
	
	handleCrossOriginMessage(event) {
		var origin = event.origin || event.originalEvent.origin; // For Chrome, the origin property is in the event.originalEvent object.
		if (origin !== this.options.receive_origin) {
			this.debug('Cross origin message received. Origin does not match. Not doing anything');
			return;
		}
		
		// save other origin
		this.options.other_origin_source = event.source;
		
		this.debug('Cross origin message event', event);
		
		// pass to in-domain messengers
		this.send(event.data);
	}
	
	// extend handleMessage to also send messages up to the cross origin messenger
	handleMessage(event) {
		DomainMessenger.prototype.handleMessage.call(this, event);
		this.sendCrossOrigin(event.data);
	}
	
	// extend send to also send messages up to the cross origin messenger
	send(message) {
		DomainMessenger.prototype.send.call(this, message);
		this.sendCrossOrigin(message);
	}
	
	sendCrossOrigin(message) {
		if (!this.options.other_origin_source) {
			this.debug('Other origin source is not yet set. Not passing on message.');
			return;
		}
		
		if (!this.options.send_origin) {
			this.debug('No send origin match string set. Sending cross origin messages is not enabled.');
			return;
		} else {
			this.options.other_origin_source.postMessage(message, this.options.send_origin);
		}
	}
}


class Base {
	constructor() {
		this.buildSender();
		this.buildMiddleman();
		this.buildReceiver();
	}
	
	// Check domain we want to handle on and create button/action
	buildSender() {
		if (!this.locationMatches('.*duckduckgo\.com') || window.top != window) {
			return;
		}
		
		var body = document.querySelector('body');
		
		var icomm = document.createElement('iframe');
		icomm.setAttribute('style', 'display: none;');
		icomm.setAttribute('src', 'https://armeagle.nl/main#middlemanmessenger');
		body.appendChild(icomm);
				
		var cdm = new CrossDomainMessenger('test-channel', {
			send_origin: 'https://armeagle.nl',
			other_origin_source: icomm.contentWindow
		});
		
		var a = document.createElement('a');
		a.setAttribute('style', 'position: absolute; top: 0; left: 0; min-width: 30px; min-height: 30px; display: block; color: black; background-color: orange; cursor: pointer; z-index: 9999');
		a.textContent = 'send';
		a.addEventListener('click', function(event) {
			cdm.send({m: 'hello world!', s: 'other stuff'});
		});
		body.appendChild(a);
		
		console.log('sender found!');
	}
	
	// This builds the content for the middleman. Loads on a cross origin page in a hidden iframe.
	// Is loaded by the Sender.
	// Check domain/page pass on messages both ways
	buildMiddleman() {
		if (!this.locationMatches('.*armeagle\.nl.*#middlemanmessenger')) {
			return;
		}
		console.log('middleman found!');
		
		var cdm = new CrossDomainMessenger('test-channel', {
			receive_origin: 'https://duckduckgo.com'
		});
	}
	buildReceiver() {
		if (!this.locationMatches('.*armeagle\.nl/main/$') || window.top != window) {
			return;
		}
		console.log('receiver found!');
		
		var dm = new DomainMessenger('test-channel', {
			message: function(message) {
				console.info(['message', message]);
			}
		})
	}
	
	locationMatches(regex) {
		return location.href.match(new RegExp(regex));
	}
}

try {
	new Base();
} catch (e) {
	console.error(e);
}

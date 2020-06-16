// ==UserScript==
// @name        SpanSh VR commands
// @namespace   armeagle.nl
// @include     https://www.spansh.co.uk/*
// @include     https://spansh.co.uk/*
// @version     1.2
// @grant       none
// ==/UserScript==

// Add title for Voice Attack command targetting. The page has no title element of itself.
let title = document.createElement('title');
title.textContent = 'SpanSH VR commands';
document.querySelector('head').appendChild(title);

var Constants = {
	accessKey: {
		focusCurrent: ".",
		copyCurrent: "c",
		markCurrent: "!",
		goPrevious: "[",
		goNext: "]",
	},
	resultsSelector: "h4.card-header ~ .card-body", //"#results",
	baseSystemRowSelector: "table tbody tr",
	currentSystemClass: "vr-current",
  copyAtSystemChange: true,
	nc: "no comma"
};

function VrCommands() {}

VrCommands.prototype.initialize = function() {
	this.addHotkeys();
	this.addStyle();
	
	console.log("VrCommands is initialized");
}

/**
 * @return Node results container
 */
VrCommands.prototype.getContainer = function() {
	return document.querySelector(Constants.resultsSelector);
}

/**
 * @return Node current active line or first if none was active
 */
VrCommands.prototype.findCurrentSystemLine = function(default_to_first) {
	var cont = this.getContainer();
	var cur = cont.querySelector(Constants.baseSystemRowSelector + "." + Constants.currentSystemClass);

	if (!cur && undefined !== default_to_first ) {
		// or select first
		cur = cont.querySelector(Constants.baseSystemRowSelector);
		this.markSystemLineCurrent(cur);
	}

	return cur;
}

/**
 * Mark node as current, remove from all others
 * @param node Node
 */
VrCommands.prototype.markSystemLineCurrent = function(node) {
	var cont = this.getContainer();
	var cur;

	// Bit ugly; first remove from all, then set for node.
	while ((cur = cont.querySelector(Constants.baseSystemRowSelector + "." + Constants.currentSystemClass))) {
		cur.classList.remove(Constants.currentSystemClass);
	}
	
	if (node) {
		node.classList.add(Constants.currentSystemClass);
    
    if (Constants.copyAtSystemChange) {
      this.handleCopyCurrent();
    }
	}
}

/**
 * @return string Current system name
 */
VrCommands.prototype.getCurrentSystemName = function() {
	var cur = this.findCurrentSystemLine();
	
	if (!cur) {
		return "";
	}
	
	var systemTd = cur.querySelector("td:nth-child(2)");
	if (!systemTd) {
		return "";
	}
	
  // Sometimes there are empty text nodes before the system name.
  // Find the first non-empty textnode and return the trimmed contents.
  for(let node of systemTd.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE) {
      continue;
    }
    
    let textContents = node.nodeValue.trim();
    if (textContents) {
      return textContents;
    }
  }
  
  return "";
}

/**
 * @return boolean Whether the current system has a neutron star
 */
VrCommands.prototype.hasCurrentSystemNeutronStar = function() {
	var cur = this.findCurrentSystemLine();
	
	if (!cur) {
		return false;
	}
	
	var nsTdText = cur.querySelector("td:nth-child(5)").textContent;
	if (nsTdText.toLowerCase() === "yes") {
		return true;
	}
	
	return false;
}

/**
 * @return int The number of estimated jumps to reach this system
 */
VrCommands.prototype.getEstimatedJumps = function() {
	var cur = this.findCurrentSystemLine();
	
	if (!cur) {
		return false;
	}
	
	var nsTdText = cur.querySelector("td:nth-child(6)").textContent;
		
	return nsTdText;
}


/**
 * Add hotkeys to document by defining elements with "accesskey" attribute and a click
 * event listener. These keys are defined in the Constants class.
 */
VrCommands.prototype.addHotkeys = function() {
	if (this.hotkeys) {
		return;
	}
	this.hotkeys = document.createElement("div");
	this.hotkeys.setAttribute("id", "hotkeys");
	
	var label = document.createElement("label");
	label.textContent = "Hotkeys";
	this.hotkeys.appendChild(label);
	
	var buttons = document.createElement("div");
	buttons.classList.add("buttons-list");
	this.hotkeys.appendChild(buttons);
	
	for (var property in Constants.accessKey) {
		if (Constants.accessKey.hasOwnProperty(property)) {
			var accessKey = Constants.accessKey[property];
			
			var keyAnchor = document.createElement("button");
			keyAnchor.setAttribute("accesskey", accessKey);
			keyAnchor.textContent = property +": "+ accessKey;
			keyAnchor.classList.add("btn", "btn-default");
			keyAnchor.setAttribute("data-property", property);
			keyAnchor.addEventListener("click", function(event) {
				// Call this.hande`property`(), i.e. this.prototype.handleGoPrevious()
				var eventProperty = event.target.getAttribute("data-property");
        var method = "handle" + this.ucFirst(eventProperty);
        //console.log("call", eventProperty, this, method, this[method]);
				this[method].apply(this);
			}.bind(this));
			buttons.appendChild(keyAnchor);
		}
	}
	document.body.appendChild(this.hotkeys);
}

/**
 * Handling the different hotkeys
 */

VrCommands.prototype.handleFocusCurrent = function() {
	var systemName = this.getCurrentSystemName();
	if (!systemName) {
		message = "System could not be found";
	} else {
		message = "Current system is "+ systemName;
	}
	this.speak(message);
}

VrCommands.prototype.handleCopyCurrent = function() {
	var cur = this.findCurrentSystemLine();
	var message = "";
	if (!cur) {
		message = "Could not copy, no system available";
	} else {
		var systemName = this.getCurrentSystemName();
		if (!systemName) {
			message = "System could not be found";
		} else {
			cur.querySelector("td button.clipboard-button").click();
			message = systemName + " copied to clipboard";
			
			var isNeutronStar = this.hasCurrentSystemNeutronStar();
			if (isNeutronStar) {
				message += ". Neutron Star is available";
			} else {
				message += ". No Neutron Star detected";
			}
			
			var estimatedJumps = this.getEstimatedJumps();
			if (estimatedJumps) {
				message += ". This requires about " + estimatedJumps + " jump" + (estimatedJumps > 1 ? 's' : '');
			}
		}
	}
	
	this.speak(message);
}

VrCommands.prototype.handleMarkCurrent = function() {
	var cur = this.findCurrentSystemLine(true);
	if (!cur) {
		return;
	}
	this.markSystemLineCurrent(cur);
  
  let checkbox = cur.querySelector("td:first-child input[type=checkbox]");
  checkbox.click();
}

VrCommands.prototype.handleGoNext = function() {
	var cur = this.findCurrentSystemLine();
	if (!cur) {
		cur = this.findCurrentSystemLine(true);
		if (cur) {
			var systemName = this.getCurrentSystemName();
			this.speak("Selected first system " + systemName);
		}
		return;
	}
	
	cur = cur.nextElementSibling;
	if (cur) {
		this.markSystemLineCurrent(cur);
	}
}

VrCommands.prototype.handleGoPrevious = function() {
	var cur = this.findCurrentSystemLine();
	if (!cur) {
		cur = this.findCurrentSystemLine(true);
		if (cur) {
			var systemName = this.getCurrentSystemName();
			this.speak("Selected first system " + systemName);
		}
		return;
	}
	
	
	cur = cur.previousElementSibling;
	if (cur) {
		this.markSystemLineCurrent(cur);
	}
}


/**
 * Add styling/css
 */
VrCommands.prototype.addStyle = function() {
	var css = document.createElement("style");
	css.setAttribute("type", "text/css");
	css.textContent = "\
		.vr-current, .vr-current > td { background-color: #ddaa00 !important; } \
		#hotkeys { margin: 20px; } \
		#hotkeys .buttons-list { max-width: 700px; display: flex; flex-flow: row wrap; justify-content: flex-start; } \
		#hotkeys .buttons-list button { flex: 0 1 15%; margin: 10px} \
	";
	document.body.appendChild(css);
}

/*************************************************************************
 *
 * Helper methods
 *
 *************************************************************************/

/**
 * Use the Speech Synthesis API to speak out text
 * @param text string
 * @param callback Closure called on ending of synthesis or error (with parameter).
 */
VrCommands.prototype.speak = function(text, callback) {
	var u = new SpeechSynthesisUtterance();
	u.text = text;
	u.lang = "en-US";

	u.onend = function () {
		if (callback) {
			callback();
		}
	};

	u.onerror = function (e) {
		if (callback) {
			callback(e);
		}
	};

	speechSynthesis.speak(u);
}

/**
 * @param string string Make first letter upper case
 */
VrCommands.prototype.ucFirst = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var c = new VrCommands();
c.initialize();

// ==UserScript==
// @name          BeyondTableTop Numbers Dialog
// @namespace     armeagle.nl
// @description   Adds a dialog popup to any number inputs
// @include       http://www.beyondtabletop.com/app*
// @updateURL     https://raw.githubusercontent.com/ArmEagle/userscripts/master/BeyondTableTop_Numbers_Dialog.user.js
// @downloadURL   https://raw.githubusercontent.com/ArmEagle/userscripts/master/BeyondTableTop_Numbers_Dialog.user.js
// @version       1.05
// @grant         none
// ==/UserScript==

(function(){
	function NumbersDialog() {
		this.input = null;
		this.inputStartValue = undefined;
		this.dialogInput = null;
		this.dialogInputInitial = false; // if true, then content is selected
				
		this.numbersContainer = null;
		
		this.init();
	}
		
	NumbersDialog.prototype.buildDialog = function() {
		this.numbersContainer = $('<div id="numbers-dialog"/>');
		$('body').append(this.numbersContainer);
		this.numbersContainer.append($('\
<div class="input"/>\
<div class="numbers-container">\
	<div class="b"" data-v="7">7</div>\
	<div class="b" data-v="8">8</div>\
	<div class="b" data-v="9">9</div>\
	<div class="b" data-v="4">4</div>\
	<div class="b" data-v="5">5</div>\
	<div class="b" data-v="6">6</div>\
	<div class="b" data-v="1">1</div>\
	<div class="b" data-v="2">2</div>\
	<div class="b" data-v="3">3</div>\
	<div class="b" data-v="0">0</div>\
	<div class="b" data-a="u">&#x25B2;</div>\
	<div class="b" data-a="d">&#x25BC;</div>\
</div>\
<div class="oper-container">\
	<div class="b" data-v="-">-</div>\
	<div class="b" data-v="+">+</div>\
	<div class="b" data-a="=">=</div>\
	<div class="b" data-a="f">ok</div>\
</div>\
'));
		this.dialogInput = $('#numbers-dialog .input');
	}
	NumbersDialog.prototype.open = function() {
		this.numbersContainer.addClass('active');
	}
	NumbersDialog.prototype.close = function() {
		this.numbersContainer.removeClass('active');
	}
	// Focus on an input, open the dialog with given value.
	NumbersDialog.prototype.handleFocus = function(that, input, event) {
		that.input = input;
		that.inputValue = input.val();
		that.dialogInput.text(input.val());
		that.dialogInput.selectText();
		this.dialogInputInitial = true;
		
		this.open();
	}
	NumbersDialog.prototype.initListeners = function() {
		var that = this;
		$('body').on('focus', 'input[type=number]', function(event) {
			that.handleFocus(that, $(this), event);
		});
		$('body').on('click', '#numbers-dialog', function(event) {
			// not close dialog with click inside
			event.stopPropagation();
		});
		$('body').on('click', function(event) {
			// close dialog with click outside, not an input number
			if ( ! $(event.target).is('input[type=number]') ) {
				that.close();
			}
		});
		// button clicks
		$('#numbers-dialog').on('click', '.b', function(event) {
			var $button = $(this);
			event.preventDefault()
			event.stopPropagation();
			if ( (bv = $button.data('v')) ) {
				that.inputAdd(bv);
			} else if ( (av = $button.data('a')) ) {
				switch ( av ) {
					case 'u': // up/increase - +1
						that.eval('+1');
						break;
					case 'd': // down/decrease
						that.eval('-1');
						break;
					case '=': // equals/eval
						that.eval();
						break;
					case 'f': // ok/finish
						that.eval();
						that.input.val(that.dialogInput.text());
						that.input.trigger('change');
						that.close();
						break;
				}
			}
		});
	}
	// Do Maths!
	NumbersDialog.prototype.eval = function(append) {
		var inputValue = this.dialogInput.text();
		if ( append ) {
			inputValue = inputValue + append;
		}
		inputValue = inputValue.replace(/[^0-9\-+]/g, '').replace(/\+\+/g, '+');
		
		this.dialogInput.text(eval(inputValue));
	}
	NumbersDialog.prototype.inputAdd = function(value) {
		// Initial number will replace selection. Other buttons append.
		if ( this.dialogInputInitial && (value +'').match(/^[0-9]$/) ) {
			this.dialogInput.text(value);
		} else {
			this.dialogInput.text(this.dialogInput.text() + value);
		}
		this.dialogInputInitial = false;
	}
	NumbersDialog.prototype.initCss = function() {
		$('head').append($('<style type="text/css">\
#numbers-dialog { display: none; width: 270px; height: 300px; border: 1px solid #666; background: #ddd; position: fixed; margin-top: -150px; margin-left: -135px; top: 50%; left: 50%; }\
#numbers-dialog.active { display: block; }\
#numbers-dialog .input { margin: 5px; width: 240px; height: 30px; padding: 0 10px; line-height: 30px; font-size: 1.5em; border 2px inset #666; background: white; }\
#numbers-dialog .b { width: 50px; height: 50px; margin: 5px; float: left; cursor: pointer; background: #fff; border: 1px solid #666; border-radius: 10px; line-height: 50px; font-size: 2.5em; text-align: center; -webkit-user-select: none; -moz-user-select: none; -khtml-user-select: none; -ms-user-select: none; /* IE10+ */}\
#numbers-dialog .b:hover, #numbers-dialog .b:active { background: #ddd; }\
#numbers-dialog .numbers-container { width: 208px; float: left; }\
#numbers-dialog .oper-container { width: 60px; float: left; }\
input[type="number"]::-webkit-outer-spin-button,input[type="number"]::-webkit-inner-spin-button {-webkit-appearance: none;margin: 0;}\
input[type="number"] {-moz-appearance: textfield;}\
</style>'));
	}
	NumbersDialog.prototype.init = function() {
		this.initCss();
		this.buildDialog();
		this.initListeners();
	}
	// Select all text in the element.
	$.fn.selectText = function(win) {
		el = this.first()[0];
		win = win || window;
		var doc = win.document, sel, range;
		if (win.getSelection && doc.createRange) {
			sel = win.getSelection();
			range = doc.createRange();
			range.selectNodeContents(el);
			sel.removeAllRanges();
			sel.addRange(range);
		} else if (doc.body.createTextRange) {
			range = doc.body.createTextRange();
			range.moveToElementText(el);
			range.select();
		}
	};
	
	var nc = new NumbersDialog();
	console.log(['Numbers Dialog loaded',nc]);
})();

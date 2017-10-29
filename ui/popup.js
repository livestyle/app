/**
 * Popup controller
 */
'use strict';
const $ = require('./utils').qs;
const $$ = require('./utils').qsa;
const closest = require('./utils').closest;

module.exports = function() {
	document.addEventListener('click', function(evt) {
		var trigger = closest(evt.target, '[data-popup]');
		if (trigger) {
			var popupId = trigger.dataset.popup;
			var popup = document.getElementById(popupId);
			if (popup) {
				show(popup);
			}
			return;
		}

		if (!closest(evt.target, '.popup-content') || closest(evt.target, '.popup-close')) {
			// clicked outside popup content or on popup close icon:
			// hide all popups
			return hideAll();
		}
	});

	document.addEventListener('keyup', function(evt) {
		if (evt.keyCode === 27) { // ESC key
			hideAll();
		}
	});
};

function show(popup) {
	popup.classList.add('popup_visible');
}

function hide(popup) {
	popup.classList.remove('popup_visible');
}

function hideAll() {
	$$('.popup').forEach(hide);
}

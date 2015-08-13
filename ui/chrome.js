/**
 * A module for rendering Chrome plugin state: returns a function
 * that can takes model attribute and updates given view accordingly
 */
'use strict';

var ipc = require('ipc');
var $ = require('./utils').qs;

module.exports = function(elem) {
	$('.extension-install-btn', elem).addEventListener('click', function() {
		ipc.send('install-chrome');
	});

	return function render(attr) {
		if (attr == null) {
			// unknown state: currently checking if plugin is installed
			$('.extension-progress__message', elem).innerText = 'Checking status';
			$('.extension-message', elem).innerText = '';
			elem.dataset.extensionState = 'progress';
			return;
		}

		if (attr === false) {
			// extension is not installed
			elem.dataset.extensionState = '';
			$('.extension-message', elem).innerText = '';
			return;
		}

		if (isError(attr)) {
			// error occurred during plugin installation
			elem.dataset.extensionState = 'error';
			$('.extension-message', elem).innerText = attr.error;
			return;
		}

		if (attr) {
			// extension is installed
			elem.dataset.extensionState = 'installed';
			$('.extension-message', elem).innerText = 'Installed';
		}
	};
};

function isError(attr) {
	return typeof attr === 'object' && 'error' in attr;
}
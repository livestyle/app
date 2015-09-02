/**
 * A module for rendering Sublime Text plugin state: returns a function
 * that can takes model attribute and updates given view accordingly
 */
'use strict';

var ipc = require('ipc');
var $ = require('./utils').qs;

module.exports = function(elem) {
	$('.extension-install-btn', elem).addEventListener('click', function() {
		ipc.send('install-sublime-text', this.dataset.installVersion);
		$('.extension-progress__message', elem).innerText = 'Installing';
		elem.dataset.extensionState = 'progress';
	});

	return function render(attr) {
		if (attr == null) {
			// unknown state: currently checking if plugin is installed
			$('.extension-progress__message', elem).innerText = 'Checking status';
			elem.dataset.extensionState = 'progress';
			$('.extension-message', elem).innerText = '';
			return;
		}

		if (isError(attr)) {
			// error occurred during plugin installation
			return renderError(elem, attr);
		}

		if (attr) {
			// extension is installed, but might be installed partially,
			// e.g. have multiple ST versions, but installed in one of them
			var status = installStatus(attr);
			var btn = $('.extension-install-btn', elem);
			if (!status.installed.length) {
				// no installed plugin, pass further
				attr = false;
			} else if (status.missing.length) {
				elem.dataset.extensionState = 'partially-installed';
				btn.dataset.installVersion = status.missing.join(',');
				$('.version', btn).innerText = status.missing[0].replace(/^[a-z]+/, '');
				$('.extension-message', elem).innerText = '';
			} else {
				elem.dataset.extensionState = 'installed';
				btn.dataset.installVersion = '';
				$('.extension-message', elem).innerText = 'Installed';
				$('.version', btn).innerText = '';
			}
		}

		if (attr === false) {
			// extension is not installed
			elem.dataset.extensionState = '';
			$('.extension-message', elem).innerText = '';
			return;
		}
	};
};

function isError(attr) {
	return typeof attr === 'object' && 'error' in attr;
}

function renderError(elem, data) {
	elem.dataset.extensionState = 'error';
	var message = data.error;
	// TODO help Windows users with portable installation:
	// pick folder and scan it for LiveStyle plugin installation.
	// For now, simply tell users install it manually
	if (data.errorCode === 'ENOSUBLIMETEXT') {
		message = 'Unable to find Sublime Text installation folder. If you’re using portable version, try to <span class="pseudo-href" data-action="st-manual-install">install it manually</span>.'
	}

	$('.extension-message', elem).innerHTML = message;
}

function installStatus(data) {
	var result = {
		installed: [],
		missing: []
	};

	if (data === true) {
		// looks like all installed
		result.installed.push('st2', 'st3');
	} else if (typeof data === 'object') {
		Object.keys(data).forEach(function(id) {
			if (data[id]) {
				result.installed.push(id);
			} else {
				result.missing.push(id);
			}
		});
	}

	return result;
}
/**
 * A module for rendering Sublime Text plugin state: returns a function
 * that can takes model attribute and updates given view accordingly.
 *
 * This UI component actually works with two apps: Sublime Text 2 
 * and Sublime Text 3, so we have to use aggregates state
 */
'use strict';

const ipc = require('electron').ipcRenderer;
const $ = require('./utils').qs;
const pluginStatus = require('./sublime-text-status');

module.exports = function(elem) {
	var btn = $('.extension-install-btn', elem);
	
	btn.addEventListener('click', function() {
		(this.dataset.missing || '').split(',')
		.filter(Boolean)
		.forEach(version => ipc.send('install-plugin', version))
	});

	return function render(model) {
		var status = pluginStatus(model);
		console.log('Sublime Text status', status);
		if (status.state === 'error' && status.value.errorCode === 'ENOSUBLIMETEXT') {
			// TODO help Windows users with portable installation:
			// pick folder and scan it for LiveStyle plugin installation.
			// For now, simply tell users install it manually
			status.message = 'Unable to find Sublime Text installation folder. If you’re using portable version, try to <span class="pseudo-href" data-action="st-manual-install">install it manually</span>.';
		}

		var missing = status.missing || [''];
		btn.dataset.missing = missing.join(',');
		$('.version', btn).innerText = missing.length === 1 
			? missing[0].replace(/^[a-z]+/, '')
			: '';
		
		pluginStatus.update(elem, status);
	};
};
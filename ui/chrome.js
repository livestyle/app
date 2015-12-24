/**
 * A module for rendering Chrome plugin state: returns a function
 * that can takes model and updates given view accordingly
 */
'use strict';

const ipc = require('electron').ipcRenderer;
const $ = require('./utils').qs;
const pluginStatus = require('./plugin-status');

module.exports = function(elem) {
	$('.extension-install-btn', elem)
	.addEventListener('click', evt => ipc.send('install-plugin', 'chrome'));

	return function render(model) {
		pluginStatus.update(elem, model.chrome);
	};
};
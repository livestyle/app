/**
 * Renders UI for Remote View sessions
 */
'use strict';

var ipc = require('electron').ipcRenderer;
var $ = require('./utils').qs;
var closest = require('./utils').closest;

module.exports = function(elem) {
	elem.addEventListener('click', function(evt) {
		if (evt.target.classList.contains('rv-session-remove')) {
			// clicked on "remove" icon
			var item = closest(evt.target, '.rv-session-item');
			if (item) {
				ipc.send('rv-close-session', item.id);
			}
		}
	});

	return function render(model) {
		var sessionList = sessionList.sessionList || [];
		console.log('update with list', sessionList);

		elem.classList.toggle('rv-pane_disabled', !sessionList.length);
		$('.rv-session', elem).innerHTML = sessionList.map(function(session) {
			return `<li class="rv-session-item" id="${session.publicId}" data-rv-state="${session.state}">
				<div class="rv-session-public-id">
					<a href="http://${session.publicId}">http://${session.publicId}</a>
				</div>
				<div class="rv-session-local">
					<a href="${session.localSite}">${session.localSite}</a>
				</div>
				<i class="rv-session-remove"></i>
			</li>`;
		}).join('\n');
	}
};
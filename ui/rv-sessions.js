/**
 * Module for handling Remote View session list
 */
'use strict';

var ipc = require('ipc');

function $(sel, context) {
	return (context || document).querySelector(sel);
}

function closest(elem, sel) {
	while (elem && elem !== document) {
		if (elem.matches(sel)) {
			return elem;
		}

		elem = elem.parentNode;
	}
}

function update(sessionList) {
	var pane = $('.rv-pane');
	var sessions = $('.rv-session');

	console.log('update with list', sessionList);

	pane.classList.toggle('rv-pane__disabled', !sessionList || !sessionList.length);
	sessions.innerHTML = sessionList.map(function(session) {
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

// XXX init

ipc.on('rv-update', update);

document.addEventListener('DOMContentLoaded', function() {
	$('.rv-session').addEventListener('click', function(evt) {
		if (evt.target.classList.contains('rv-session-remove')) {
			// clicked on "remove" icon
			var item = closest('.rv-session-item');
			if (item) {
				ipc.send('rv-close', item.id);
			}
		}
	});
});
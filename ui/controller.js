/**
 * UI controller
 */
'use strict';

var ipc = require('electron').ipcRenderer;
var shell = require('electron').shell;
var chrome = require('./chrome');
var sublimeText = require('./sublime-text');
var rv = require('./rv-sessions');
var $ = require('./utils').qs;
var closest = require('./utils').closest;
var apps = require('../lib/apps');

function init() {
	var chromeRender = chrome($('.extension-item[data-extension-id=chrome]'));
	var sublimeTextRender = sublimeText($('.extension-item[data-extension-id=st]'));
	var rvRender = rv($('.rv-pane'));
	var updateBtn = $('.update-available');

	ipc.on('model', function(event, model) {
		chromeRender(model);
		sublimeTextRender(model);
		rvRender(model);
		updateBtn.classList.toggle('hidden', !model.updateAvailable);

		if (model.updateAvailable) {
			notifyUpdateAvailable();
		}
	})
	.on('log', function(event, args) {
		console.log.apply(console, args);
	})
	.on('info', function(event, args) {
		console.info.apply(console, args);
	})
	.on('warn', function(event, args) {
		console.warn.apply(console, args);
	})
	.on('error', function(event, args) {
		console.error.apply(console, args);
	});

	$('.quit').addEventListener('click', evt => {
		if (!ipc.sendSync('will-quit')) {
			ipc.send('quit');
		}
	});

	updateBtn.addEventListener('click', function(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		ipc.send('install-update');
	});

	// open all URLs in default system browser
	document.addEventListener('click', function(evt) {
		var a = closest(evt.target, 'a');
		if (a) {
			evt.preventDefault();
			evt.stopPropagation();
			shell.openExternal(a.href);
		}
	});
}

var _didNotifiedUpdateAvailable = false;
function notifyUpdateAvailable() {
	if (_didNotifiedUpdateAvailable) {
		return;
	}

	_didNotifiedUpdateAvailable = true;
	var n = new Notification('LiveStyle', {
		body: 'A new version of LiveStyle app is available, click to install'
	});
	n.onclick = () => ipc.send('install-update');
}

init();
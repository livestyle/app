/**
 * UI controller
 */
'use strict';

var ipc = require('ipc');
var shell = require('shell');
var chrome = require('./chrome');
var st = require('./sublime-text');
var rv = require('./rv-sessions');
// var popupController = require('./popup');
var $ = require('./utils').qs;
var closest = require('./utils').closest;
var apps = require('../lib/apps.json');

function init() {
	var chromeRender = chrome($('.extension-item[data-extension-id=chrome]'));
	var stRender = st($('.extension-item[data-extension-id=st]'));
	var rvRender = rv($('.rv-pane'));
	// popupController();

	ipc.on('model', function(model) {
		chromeRender(model.chromePlugin);
		stRender(model.sublimeTextPlugin);
		rvRender(model.rvSessions);
	})
	.on('log', function(args) {
		console.log.apply(console, args);
	})
	.on('info', function(args) {
		console.info.apply(console, args);
	})
	.on('warn', function(args) {
		console.warn.apply(console, args);
	})
	.on('error', function(args) {
		console.error.apply(console, args);
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

init();
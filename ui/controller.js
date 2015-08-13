/**
 * UI controller
 */
'use strict';

var ipc = require('ipc');
var shell = require('shell');
var chrome = require('./chrome');
var st = require('./sublime-text');
var rv = require('./rv-sessions');
var $ = require('./utils').qs;
var closest = require('./utils').closest;


function init() {
	var chromeRender = chrome($('.extension-item[data-extension-id=chrome]'));
	var stRender = rv($('.extension-item[data-extension-id=st]'));
	var rvRender = rv($('.rv-pane'));

	ipc.on('model', function(model) {
		chromeRender(model.chromePlugin);
		stRender(model.sublimeTextPlugin);
		rvRender(model.rvSessions);
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
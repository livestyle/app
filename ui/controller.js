/**
 * UI controller
 */
'use strict';

var ipc = require('ipc');
var chrome = require('./chrome');
var st = require('./sublime-text');
var rv = require('./rv-sessions');

function init() {
	var chromeRender = chrome($('.extension-item[data-extension-id=chrome]'));
	var stRender = rv($('.extension-item[data-extension-id=st]'));
	var rvRender = rv($('.rv-pane'));

	ipc.on('model', function(model) {
		chromeRender(model.chromePlugin);
		stRender(model.sublimeTextPlugin);
		rvRender(model.rvSessions);
	});
}

function $(sel, context) {
	return (context || document).querySelector(sel);
}

init();
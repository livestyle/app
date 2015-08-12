'use strict';

var app = require('app');
var ipc = require('ipc');
var BrowserWindow = require('browser-window');
var debug = require('debug')('lsapp:main');
var backend = require('./backend');
var connect = require('./lib/client');
var pkg = require('./package.json');

var window = null;

// XXX init

app.on('ready', function() {
	window = new BrowserWindow({width: 950, height: 600});
	window.loadUrl(`file://${__dirname}/index.html`);
	window.once('closed', function() {
		window = null;
	});

	var update = function(model) {
		window.webContents.send('model', model.toJSON());
	};

	connect(pkg.config.websocketUrl, function(err, client) {
		var model = backend(client).on('change', function() {
			update(this);
		});
		update(model);
	});
});
'use strict';

var menubar = require('menubar')
var ipc = require('ipc');
var BrowserWindow = require('browser-window');
var debug = require('debug')('lsapp:main');
var backend = require('./backend');
var connect = require('./lib/client');
var pkg = require('./package.json');

// XXX init
var appModel = {};
var app = menubar({
	width: 380,
	height: 360,
	preloadWindow: true
});

app.on('ready', function() {
	connect(pkg.config.websocketUrl, function(err, client) {
		if (err) {
			return error(err);
		}

		info('Client connected');
		appModel = backend(client).on('change', function() {
			updateMainWindow(this);
		});
		updateMainWindow(appModel);
		setupEvents(client, appModel);
	});
});

app.on('show', () => updateMainWindow(appModel));

app.on('after-create-window', () => {
	app.window.webContents.on('did-finish-load', () => updateMainWindow(appModel));
});

function setupEvents(client, model) {
	ipc.on('install-chrome', function() {
		log('install Chrome extension');
		require('./lib/install/chrome')().catch(function(err) {
			error(err)
			model.set('chromePlugin', createError(err));
		});
	})
	.on('install-sublime-text', function(event, versions) {
		versions = versions ? versions.split(',') : ['st2', 'st3'];
		log('install Sublime Text extension');
		var install = require('./lib/install/sublime-text');

		install(versions).then(function() {
			// when installed, reset current plugin state and run plugin check again
			model.unset('sublimeTextPlugin');
			model.checkStatus('st');
		}, function(err) {
			error(err)
			model.set('sublimeTextPlugin', createError(err));
		});
	})
	.on('rv-close-session', function(event, key) {
		backend.closeRvSession(key);
	})
	.on('quit', () => app && app.app.quit());
}

function createError(err) {
	var data = {error: err.message};
	if (err.code) {
		data.errorCode = err.code;
	}
	return data;
}

function toArray(obj) {
	return Array.prototype.slice.call(obj, 0);
}

function updateMainWindow(model) {
	_send('model', model.toJSON());
}

function log() {
	_send('log', toArray(arguments));
}

function warn() {
	_send('warn', toArray(arguments));
}

function info() {
	_send('info', toArray(arguments));
}

function error() {
	_send('error', toArray(arguments));
}

function _send(name, args) {
	app.window && app.window.webContents.send(name, args);
}
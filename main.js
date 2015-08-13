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
	window = new BrowserWindow({width: 980, height: 600});
	window.loadUrl(`file://${__dirname}/index.html`);
	window.once('closed', function() {
		window = null;
	});

	var update = function(model) {
		window.webContents.send('model', model.toJSON());
	};

	connect(pkg.config.websocketUrl, function(err, client) {
		if (err) {
			return error(err);
		}

		info('Client connected');
		var model = backend(client).on('change', function() {
			info('Model updated', this.toJSON());
			update(this);
		});
		update(model);
		setupEvents(client, model);
	});
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
	});
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

function log() {
	window.webContents.send('log', toArray(arguments));
}

function warn() {
	window.webContents.send('warn', toArray(arguments));
}

function info() {
	window.webContents.send('info', toArray(arguments));
}

function error() {
	window.webContents.send('error', toArray(arguments));
}
'use strict';

var app = require('app');
var ipc = require('ipc');
var BrowserWindow = require('browser-window');
var debug = require('debug')('lsapp:main');
var backend = require('./backend');
var connect = require('./lib/client');
var pkg = require('./package.json');

const osx = process.platform === 'darwin';
var mainWindow = null;
var appModel = null;

// XXX init

app.on('window-all-closed', function() {
	if (!osx) {
		mainWindow = null;
		appModel = null;
		app.quit();
	}
});

app.on('activate-with-no-open-windows', function() {
	createMainWindow();
});

app.on('ready', function() {
	createMainWindow();

	connect(pkg.config.websocketUrl, function(err, client) {
		if (err) {
			return error(err);
		}

		info('Client connected');
		appModel = backend(client).on('change', function() {
			info('Model updated', this.toJSON());
			updateMainWindow(this);
		});
		updateMainWindow(appModel);
		setupEvents(client, appModel);
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
	})
	.on('rv-close-session', function(event, key) {
		backend.closeRvSession(key);
	});
}

function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 980, 
		height: 650,
		'min-width': 980, 
		'min-height': 400,
		fullscreen: false,
		title: 'LiveStyle'
	});
	mainWindow.loadUrl(`file://${__dirname}/index.html`);
	mainWindow.once('closed', function() {
		mainWindow = null;
	});
	mainWindow.webContents.on('did-finish-load', function didFinishLoad() {
		if (appModel) {
			updateMainWindow(appModel);
		}
	});

	return mainWindow;
}

function updateMainWindow(model) {
	if (mainWindow) {
		mainWindow.webContents.send('model', model.toJSON());
	}
};

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
	mainWindow.webContents.send('log', toArray(arguments));
}

function warn() {
	mainWindow.webContents.send('warn', toArray(arguments));
}

function info() {
	mainWindow.webContents.send('info', toArray(arguments));
}

function error() {
	mainWindow.webContents.send('error', toArray(arguments));
}
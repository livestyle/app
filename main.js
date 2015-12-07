'use strict';

var path = require('path');
var menubar = require('menubar')
var ipc = require('ipc');
var BrowserWindow = require('browser-window');
var debug = require('debug')('lsapp:main');
var backend = require('./backend');
var connect = require('./lib/client');
var installChrome = require('./lib/install/chrome');
var installST = require('./lib/install/sublime-text');
var pkg = require('./package.json');

// XXX init
var appModel = null;
var app = menubar({
	width: 380,
	height: 360,
	resizable: false,
	icon: path.resolve(__dirname, 'assets/menu-icon.png')
})
.on('ready', function() {
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
		initialWindowDisplay(app);
	});
})
.on('show', () => updateMainWindow(appModel))
.on('after-create-window', () => {
	app.window.webContents.on('did-finish-load', () => updateMainWindow(appModel));
});

function setupEvents(client, model) {
	ipc.on('install-chrome', function() {
		log('install Chrome extension');
		installChrome().catch(err => model.set('chromePlugin', createError(err)));
	})
	.on('install-sublime-text', function(event, versions) {
		versions = versions ? versions.split(',') : ['st2', 'st3'];
		log('install Sublime Text extension');
		installST(versions).then(function() {
			// when installed, reset current plugin state and run plugin check again
			model.unset('sublimeTextPlugin').checkStatus('st');
		})
		.catch(err => model.set('sublimeTextPlugin', createError(err)));
	})
	.on('rv-close-session', (event, key) => backend.closeRvSession(key))
	.on('quit', () => app && app.app.quit());

	// supress 'error' event since in Node.js, in most cases,
	// it means unhandled exception
	client.on('error', err => console.error(err));
}

function createError(err) {
	error(err);
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
	if (model) {
		_send('model', model.toJSON());
	}
}

/**
 * Initial window display when app starts: do not quit app when window requested
 * it for the first time
 * @param  {App} app
 * @param  {BrowserWindow} wnd 
 */
function initialWindowDisplay(menuApp) {
	var handled = false;
	ipc.on('will-quit', evt => {
		if (!handled) {
			evt.returnValue = handled = true;
			menuApp.hideWindow();
		} else {
			evt.returnValue = false;
		}
	});
	menuApp.once('after-hide', () => handled = true).showWindow();
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

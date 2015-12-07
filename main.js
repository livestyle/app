'use strict';

var path = require('path');
var menubar = require('menubar')
var ipc = require('ipc');
var BrowserWindow = require('browser-window');
var debug = require('debug')('lsapp:main');
var backend = require('./backend');
var Model = require('./lib/model');
var appModelController = require('./lib/controller/app-model');
var connect = require('./lib/client');
var pkg = require('./package.json');

// XXX init
var appModel = new Model();
var app = menubar({
	width: 380,
	height: 360,
	resizable: false,
	icon: path.resolve(__dirname, 'assets/menu-icon.png')
})
.on('ready', function() {
	var self = this;
	connect(pkg.config.websocketUrl, function(err, client) {
		if (err) {
			return error(err);
		}

		info('Client connected');
		backend(client);
		var controller = appModelController(appModel, client);
		updateMainWindow(appModel);
		setupAppEvents(self.app, controller);
		initialWindowDisplay(app);
	});
})
.on('show', () => updateMainWindow(appModel))
.on('after-create-window', () => {
	app.window.webContents.on('did-finish-load', () => updateMainWindow(appModel));
});

appModel.on('change', function() {
	debug('model update %o', this.attributes);
	updateMainWindow(this);
});

////////////////////////////////////

function setupAppEvents(app, controller) {
	ipc.on('install-chrome', function() {
		log('install Chrome extension');
		controller.installChrome().catch(error);
	})
	.on('install-sublime-text', function(event, versions) {
		log('install Sublime Text extension');
		controller.installSublimeText(versions).catch(error);
	})
	.on('rv-close-session', (event, key) => backend.closeRvSession(key))
	.on('quit', () => app && app.quit());
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
	debug.apply(null, toArray(arguments));
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

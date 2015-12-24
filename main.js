'use strict';

const path = require('path');
const menubar = require('menubar')
const electron = require('electron');
const debug = require('debug')('lsapp:main');
const backend = require('./backend');
const Model = require('./lib/model');
const appModelController = require('./lib/controller/app-model');
const connect = require('./lib/client');
const autoUpdate = require('./lib/autoupdate');
const pkg = require('./package.json');

if (require('electron-squirrel-startup')) {
	return;
}

const ipc = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;
const startAutoupdateTimeout = 20 * 1000;  // when to start auto-update polling

// XXX init
require('electron-debug')();
var appModel = new Model();
var app = menubar({
	width: 380,
	height: 360,
	resizable: false,
	'always-on-top': process.argv.indexOf('--on-top') !== -1,
	icon: path.resolve(__dirname, `assets/${process.platform === 'win32' ? 'menu-icon.ico' : 'menu-icon.png'}`)
})
.on('ready', function() {
	connect(pkg.config.websocketUrl, (err, client) => {
		if (err) {
			return error(err);
		}

		info('Client connected');
		
		// supress 'error' event since in Node.js, in most cases it means unhandled exception
		client.on('error', err => console.error(err));

		var controller = appModelController(appModel, client);
		backend(client);
		updateMainWindow(appModel);
		setupAppEvents(app, controller);
		initialWindowDisplay(app);

		setupAutoUpdate(appModel);
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
	ipc.on('install-plugin', function(event, id) {
		log(`install plugin ${id}`);
		controller.install(id).catch(error);
	})
	.on('install-update', () => electron.autoUpdater.quitAndInstall())
	.on('rv-close-session', (event, key) => backend.closeRvSession(key))
	.on('quit', () => app && app.app && app.app.quit());
}

function setupAutoUpdate(model) {
	setTimeout(() => {
		autoUpdate(pkg)
		.on('update-downloaded', () => model.set('updateAvailable', true))
		.on('update-not-available', () => model.set('updateAvailable', false))
		.on('error', error);
	}, startAutoupdateTimeout).unref();
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

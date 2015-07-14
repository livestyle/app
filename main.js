'use strict';

var app = require('app');
var ipc = require('ipc');
var BrowserWindow = require('browser-window');
var debug = require('debug')('lsapp:main');
var lsClient = require('./lib/client');
var tunnelController = require('./lib/tunnel')();
var connect = require('./lib/client');

var ls = null;
var rv = [];
var window = null;

function sendRvSessionList() {
	if (window) {
		debug('send session list');
		window.webContents.send('rv-update', tunnelController.list());
	}
}

// XXX init

ipc.on('rv-debug-session', function() {
	debug('asked for debug session');
	tunnelController.create({
		publicId: 'rv-test.livestyle.io',
		localSite: 'http://localhost:8901',
		url: 'http://localhost:8902/fake-session',
		maxConnections: 2,
		retryCount: 5,
		retryDelay: 1000,
	});
});

app.on('ready', function() {
	window = new BrowserWindow({width: 950, height: 600});
	window.loadUrl(`file://${__dirname}/index.html`);
	window.once('closed', function() {
		window = null;
	});
	window.openDevTools();
	window.webContents.on('did-finish-load', sendRvSessionList);
	tunnelController.on('update', sendRvSessionList);
});

connect('ws://127.0.0.1:54000/livestyle', function(err, client) {
	if (err) {
		ipc.send('error', err.message, 'ls-connect');
		debug('ls error: %s', err);
	} else {
		debug('ls connected');
	}
	ls = client;
});
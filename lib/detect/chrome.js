/**
 * Detect Chrome extension
 */
'use strict';

var os = require('os');
var path = require('path');
var fs = require('graceful-fs');
var launcher = require('browser-launcher2');
var utils = require('../node-utils');
var debug = require('debug')('lsapp:detect-chrome');

var extensionPaths = {
	win32: [
		'~\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions',
		'~\\AppData\\Local\\Chromium\\User Data\\Default\\Extensions',
	],
	darwin: [
		'~/Library/Application Support/Google/Chrome/Default/Extensions',
		'~/Library/Application Support/Chromium/Default/Extensions'
	],
	linux: [
		'~/.config/google-chrome/Default/Extensions',
		'~/.config/chromium/Default/Extensions'
	]
};

var extensionId = ['obipchajaiohjoohongibhgbfgchblei'];

/**
 * Returns a promise that fulfilled if user has installed Chrome extension
 * @param {LivestyleClient} client A LiveStyle WebSocket client
 * @return {Promise}
 */
module.exports = function(client) {
	debug('detecting Chrome browser extension');
	return identify(client)
	.then(null, detectChrome)
	.then(detectInstalledExtension);
};

/**
 * Tries to perform `identify-client` -> `client-id` identification protocol
 * @param  {LivestyleClient} client
 * @return {Promise}
 */
function identify(client) {
	return new Promise(function(resolve, reject) {
		var timer = setTimeout(function() {
			cleanUp();
			reject();
		}, 500);

		var cleanUp = function() {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			client.removeListener('client-id', onClientId);
		};

		var onClientId = function(data) {
			debug('received "client-id" with %s', data && data.id);
			if (data && data.id === 'chrome') {
				cleanUp()
				resolve();
			}
		};

		debug('sending "identify-client" message');
		client.on('client-id', onClientId).send('identify-client');
	});
}

function detectChrome() {
	return new Promise(function(resolve, reject) {
		launcher.detect(function(browsers) {
			debug('browser found: %d', browsers.length);
			var hasChrome = browsers.some(function(browser) {
				return browser.type === 'chrome';
			});
			debug('has Chrome installed? %o', hasChrome);
			if (hasChrome) {
				resolve();
			} else {
				var err = new Error('No Chrome browser installed');
				err.code = 'EDETECTNOCHROME';
				reject(err);
			}
		});
	});
}

function detectInstalledExtension() {
	var paths = extensionPaths[process.platform];
	if (!paths) {
		debug('no valid paths');
		return Promise.reject();
	}

	paths = paths.slice(0);
	return new Promise(function(resolve, reject) {
		var next = function() {
			if (!paths.length) {
				debug('no more paths to check');
				var err = new Error('No installed LiveStyle Chrome extension');
				err.code = 'EDETECTNOCHROMEEXT';
				return reject(err);
			}

			var p = utils.expandUser(paths.shift());
			debug('testing %s', p);
			fs.readdir(p, function(err, items) {
				if (err) {
					debug(err);
					return next();
				}

				var hasExt = items.some(function(item) {
					return extensionId.indexOf(item) !== -1;
				});

				if (hasExt) {
					resolve(path.join(p, item));
				} else {
					next()
				}
			});
		};

		next();
	});
}

if (require.main === module) {
	let pkg = require('../../package.json');
	require('../client')(pkg.config.websocketUrl, function(err, client) {
		if (err) {
			return console.error(err);
		}

		console.log('RV client connected');
		module.exports(client).then(function() {
			console.log('Chrome extension is installed');
			client.destroy();
		}, function() {
			console.log('Chrome extension is NOT installed');
			client.destroy();
		});
	});
}
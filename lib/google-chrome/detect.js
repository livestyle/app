/**
 * Detect Chrome extension
 */
'use strict';

var os = require('os');
var path = require('path');
var fs = require('graceful-fs');
var launcher = require('browser-launcher2');
var debug = require('debug')('lsapp:detect-chrome');
var utils = require('../node-utils');
var identify = require('../identify');

var app = require('../apps.json').chrome;

/**
 * Returns a promise that fulfilled if user has installed Chrome extension
 * @param {LivestyleClient} client A LiveStyle WebSocket client
 * @return {Promise}
 */
module.exports = function(client) {
	debug('detecting Chrome browser extension');
	return identify(client, 'chrome')
	.catch(detectChrome)
	.then(detectInstalledExtension);
};

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
	return utils.pathContents(app.lookup[process.platform])
	.then(function(found) {
		var extPath = null;
		found.some(function(obj) {
			return obj.items.some(function(item) {
				if (app.extensionId.indexOf(item) !== -1) {
					return extPath = path.join(obj.path, item);
				}
			});
		});
		
		return extPath ? {chrome: extPath} : false;
	});
}
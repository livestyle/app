/**
 * Detects installed Sublime Text plugin
 */
'use strict';
const fs = require('graceful-fs');
const path = require('path');
const debug = require('debug')('lsapp:sublime-text:detect');
const utils = require('../node-utils');
const identify = require('../identify');

const errorMessages = {
	ENOSUBLIMETEXT: 'No Sublime Text installed'
};

module.exports = function(app, client) {
	debug('detecting Sublime Text extension');
	return identify(client, 'sublime-text')
	.catch(() => detectApp(app))
	.then(() => detectPlugin(app));
};

var detectApp = module.exports.app = function(app) {
	return utils.existsSome(app.lookup)
	.catch(() => Promise.reject(error('ENOSUBLIMETEXT')));
};

var detectPlugin = module.exports.plugin = function(app) {
	var dir = path.dirname(utils.expandUser(app.install));
	debug('looking for plugin in %s', dir);
	debug('lookup paths: %o', [
		path.resolve(dir, 'Packages'), 
		path.resolve(dir, 'Installed Packages')
	]);
	var extIds = app.extensionId;
	var lookup = utils.expandPaths([
		path.resolve(dir, 'Packages'), 
		path.resolve(dir, 'Installed Packages')
	]);

	return Promise.all(lookup.map(readdir))
	.then(lists => {
		var found = lookup.map((dir, i) => {
			let matched = lists[i].filter(m => extIds.indexOf(m) !== -1);
			return matched.length ? path.join(dir, matched[0]) : null;
		})
		.filter(Boolean);
		return found[0] || false;
	});
};

function readdir(dir) {
	return new Promise((resolve, reject) => {
		debug('reading %s', dir);
		// always resolve even if there was error
		fs.readdir(utils.expandUser(dir), (err, items) => resolve(items || []));
	});
}

function error(code, message) {
	var err = new Error(message || errorMessages[code] || code);
	err.code = code;
	return err;
}
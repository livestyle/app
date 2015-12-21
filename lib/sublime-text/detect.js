/**
 * Detects installed Sublime Text plugin
 */
'use strict';
var path = require('path');
var extend = require('xtend');
var debug = require('debug')('lsapp:sublime-text');
var utils = require('../node-utils');
var identify = require('../identify');

var _apps = require('../apps.json');
var apps = [extend(_apps.st3, {id: 'st3'}), extend(_apps.st2, {id: 'st2'})];

module.exports = function(client) {
	debug('detecting Sublime Text extension');
	return identify(client, 'sublime-text')
	.catch(() => detectApp(apps))
	.then(() => detectPlugin(app));
};

function detectApp(app) {
	return utils.existsSome(app.lookup[process.platform])
	.catch(() => Promise.reject(errNoApp()));
}

function detectPlugin(app) {
	var dir = path.dirname(app.install[process.platform]);
	debug('looking for plugin in %s', dir);
	var extIds = app.extensionId;
	var lookup = utils.expandPaths([
		path.resolve(dir, 'Packages'), 
		path.resolve(dir, 'Installed Packages')
	]);

	return Promise.all(lookup.map(readdir))
	.then(lists => {
		// keep only those dirs containing item with extension ID
		var found = lookup.filter((dir, i) => extIds.some(id => lists[i].indexOf(id) !== -1));
		return found[0] || false;
	});
}

function readdir(dir) {
	return new Promise((resolve, reject) => {
		debug('reading %s', dir);
		// always resolve even if there was error
		fs.readdir(utils.expandUser(dir), (err, items) => resolve(items || []));
	});
}

/**
 * Detect if either of given apps is installed on user’s system
 * @param {Array} apps Apps to detect (@see `apps` global var)
 * @return {Array} Array of detected apps
 */
function detectApp(apps) {
	return new Promise(function(resolve, reject) {
		var result = [], ix = 0;
		var next = function() {
			if (ix >= apps.length) {
				debug('installed apps: %d of %d', result.length, apps.length);
				return result.length ? resolve(result) : reject(errNoApp());
			}

			var app = apps[ix++];
			utils.existsSome(app.lookup[process.platform])
			.then(function() {
				result.push(app);
				next();
			}, next);
		};
		next();
	});
}

function detectAppPlugin(apps) {
	return new Promise(function(resolve, reject) {
		var ix = 0;
		var result = {};
		var next = function() {
			if (ix >= apps.length) {
				return Object.keys(result) ? resolve(result) : reject(errNoAppPlugin());
			}

			var app = apps[ix++];
			var dir = path.dirname(app.install[process.platform]);
			debug('looking for plugin in %s', dir);
			utils.pathContents([path.join(dir, 'Packages'), path.join(dir, 'Installed Packages')])
			.then(function(items) {
				var installPath = null;
				items.some(function(item) {
					var found = app.extensionId.some(function(id) {
						return item.items.indexOf(id) !== -1;
					});
					if (found) {
						return installPath = item.path;
					}
				});

				result[app.id] = installPath || false;
				next();
			}, function(err) {
				result[app.id] = false;
				next();
			});
		};
		next();
	});
}

function errNoApp() {
	var err = new Error('No Sublime Text installed');
	err.code = 'ENOSUBLIMETEXT';
	return err;
}


function errNoAppPlugin() {
	var err = new Error('No LiveStyle for Sublime Text installed');
	err.code = 'ENOSUBLIMETEXTPLUGIN';
	return err;
}
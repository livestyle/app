/**
 * Detects installed Sublime Text plugin
 */
'use strict';
var path = require('path');
var extend = require('xtend');
var debug = require('debug')('lsapp:sublime-text');
var utils = require('../node-utils');
var identify = require('./identify');

var _apps = require('../apps.json');
var apps = [extend(_apps.st3, {id: 'st3'}), extend(_apps.st2, {id: 'st2'})];

module.exports = function(client) {
	/**
	 * Sublime Text detection strategy:
	 * 1. Find all installed versions of Sublime Text
	 * 2. Check if all installed apps contain LiveStyle plugin. This resolves
	 * to an object whose key is editor id and value is plugin installation status
	 */
	debug('detecting Sublime Text extension');
	return identify(client, 'sublime-text')
	.catch(function() {
		return detectApp(apps)
	})
	.then(function() {
		return detectAppPlugin(apps);
	});
};

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
/**
 * Detects installed Sublime Text plugin
 */
'use strict';
var path = require('path');
var utils = require('../node-utils');
var debug = require('debug')('lsapp:sublime-text');

var apps = [
	{
		id: 'st3',
		title: 'Sublime Text 3',
		install: {
			win32:  '~\\AppData\\Roaming\\Sublime Text 3\\Packages',
			darwin: '~/Library/Application Support/Sublime Text 3/Packages'
		},
		lookup: {
			win32: [
				'%PROGRAMFILES%\\Sublime Text 3\\sublime.exe',
				'~\\AppData\\Roaming\\Sublime Text 3'
			],
			darwin: [
				'~/Library/Application Support/Sublime Text 3',
				'/Applications/Sublime Text.app/Contents/MacOS/plugin_host',
				'/Applications/Sublime Text 3.app/Contents/MacOS/plugin_host'
			]
		}
	},
	{
		id: 'st2',
		title: 'Sublime Text 2',
		install: {
			win32:  '~\\AppData\\Roaming\\Sublime Text 2\\Packages',
			darwin: '~/Library/Application Support/Sublime Text 2/Packages'
		},
		lookup: {
			win32: [
				'%PROGRAMFILES%\\Sublime Text 2\\sublime.exe',
				'~\\AppData\\Roaming\\Sublime Text 2'
			],
			darwin: [
				'~/Library/Application Support/Sublime Text 2',
				'/Applications/Sublime Text 2.app/Contents/MacOS/Sublime Text 2',
				'/Applications/Sublime Text.app/Contents/MacOS/Sublime Text 2',
			]
		}
	}
];

var extensionId = ['LiveStyle', 'LiveStyle.sublime-package'];

module.exports = function() {
	/**
	 * Sublime Text detection strategy:
	 * 1. Find all installed versions of Sublime Text
	 * 2. Check if all installed apps contain LiveStyle plugin. This resolves
	 * to an object whose key is editor id and value is plugin installation status
	 */
	return detectApp(apps)
	.then(detectAppPlugin);
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
					var found = extensionId.some(function(id) {
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

if (require.main === module) {
	module.exports()
	.then(function(result) {
		console.log('success', result);
	}, function(err) {
		console.error(err.stack);
	});
	// let pkg = require('../../package.json');
	// require('../client')(pkg.config.websocketUrl, function(err, client) {
	// 	if (err) {
	// 		return console.error(err);
	// 	}

	// 	console.log('RV client connected');
	// 	module.exports(client).then(function() {
	// 		console.log('Chrome extension is installed');
	// 		client.destroy();
	// 	}, function() {
	// 		console.log('Chrome extension is NOT installed');
	// 		client.destroy();
	// 	});
	// });
}
/**
 * Detects installed Sublime Text plugin
 */
'use strict';
var winDetect = require('win-detect-browsers');
var utils = require('../node-utils');
var winEnv = require('../win-env');

var apps = [
	{
		id: 'st3',
		title: 'Sublime Text 3',
		bin: {
			win32: ['%PROGRAMFILES%\\Sublime Text 3\\sublime.exe'],
			darwin: ['/Applications/Sublime Text.app', '/Applications/Sublime Text 3.app']
		},
		install: {
			win32:  '~\\AppData\\Roaming\\Sublime Text 3\\Packages',
			darwin: '~/Library/Application Support/Sublime Text 3/Packages'
		},
		lookup: {
			win32: ['~\\AppData\\Roaming\\Sublime Text 3\\Installed Packages'],
			darwin: ['~/Library/Application Support/Sublime Text 3/Installed Packages']
		}
	},
	{
		id: 'st2',
		title: 'Sublime Text 2',
		bin: {
			win32: ['%PROGRAMFILES%\\Sublime Text 2\\sublime.exe'],
			darwin: ['/Applications/Sublime Text.app', '/Applications/Sublime Text 2.app']
		},
		install: {
			win32:  '~\\AppData\\Roaming\\Sublime Text 2\\Packages',
			darwin: '~/Library/Application Support/Sublime Text 2/Packages'
		},
		lookup: {
			win32: ['~\\AppData\\Roaming\\Sublime Text 2\\Installed Packages'],
			darwin: ['~/Library/Application Support/Sublime Text 2/Installed Packages']
		}
	}
];

var extensionId = ['LiveStyle', 'LiveStyle.sublime-package'];


/**
 * Detect if either of given apps is installed on user’s system
 * @param {Array} apps Apps to detect (@see `apps` global var)
 * @return {Array} Array of detected app IDs
 */
function detectApp(apps) {
	return new Promise(function(resolve, reject) {
		var result = [], ix = 0;
		var next = function() {
			if (ix >= apps.length) {
				return result.length ? resolve(result) : reject();
			}

			var app = apps[ix++];
			utils.existsSome(app.bin[process.platform])
			.then(function() {
				result.push(app.id);
				next();
			}, next);
		};
		next();
	});
}



function detectPlugin() {
	if (process.platform === 'darwin') {
		return detectPluginDarwin();
	}

	if (process.platform === 'win32') {
		return detectPluginWindows();
	}

	if (process.platform === 'linux') {
		return detectPluginLinux();
	}

	return Promise.reject(new Error('Unknown platform: ' + process.platform));
}

function getAppDataFolderDarwin() {
	return utils.pathContents([
		'~/Library/Application Support/Sublime Text 3/Packages',
		'~/Library/Application Support/Sublime Text 3/Installed Packages',
		'~/Library/Application Support/Sublime Text 2/Packages'
	]);
}

function detectPluginDarwin() {
	return getAppDataFolderDarwin()
	.then(function(found) {
		if (!found.length) {
			throw errNoApp();
		}

		var extPath = null;
		found.some(function(obj) {
			return obj.items.some(function(item) {
				if (extensionId.indexOf(item) !== -1) {
					return extPath = path.join(obj.path, item);
				}
			});
		});
		
		if (!extPath) {
			throw errNoAppPlugin();
		}

		return extPath;
	});
}

function getAppDataFolderWindows() {
	var profile = {
		find: function() {
			
		}
	};
}

function detectPluginWindows() {
	return new Promise(function(resolve, reject) {
		
	});
}

function detectPluginLinux() {
	
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
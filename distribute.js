#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var cpy = require('cpy');
var yazl = require('yazl');
var glob = require('glob-all');
var pkg = require('./package.json');

var appDir = {
	'darwin': './node_modules/electron-prebuilt/dist/Electron.app',
	'win32': 'node_modules\\electron-prebuilt\\dist\\electron'
};

var resDir = {
	'darwin': path.join(appDir[process.platform], 'Contents/Resources/app'),
	'win32': path.join(appDir[process.platform], 'resources\\app')
};

var files = [
	'{assets,lib,ui}/**',
	'{main,backend}.js',
	'index.html',
	'package.json',
	'node_modules/{' + Object.keys(pkg.dependencies) + '}/**'
];

const osx = process.platform === 'darwin';

function copyResources(files) {
	return new Promise(function(resolve, reject) {
		var dest = resDir[process.platform];
		cpy(files, dest, {nodir: true}, function(err) {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}

function branding() {
	return new Promise(function(reject, resolve) {
		var app = appDir[process.platform];
		var dest = path.join(path.dirname(app), osx ? 'LiveStyle.app' : 'livestyle');

		fs.rename(app, dest, function(err) {
			if (err) {
				return reject(err);
			}

			(osx ? brandAppOSX(dest) : brandApp(dest)).then(resolve, reject);
		});
	});
}

function brandAppOSX(app) {
	// change app name and version in plist files then update icon
	var plist = [
		'Contents/Info.plist',
		'Contents/Frameworks/Electron Helper.app/Contents/Info.plist'
	];

	return new Promise(function(resolve, reject) {
		var rename = function(err) {
			if (err) {
				return reject(err);
			}

			if (!plist.length) {
				// TODO change icon
				return resolve(app);
			}

			var file = plist.pop();
			fs.readFile(file, 'utf8', function(err, contents) {
				if (err) {
					return reject(err);
				}

				contents = replacePlistKeyValue(contents, 'CFBundleDisplayName', 'LiveStyle');
				contents = replacePlistKeyValue(contents, 'CFBundleName', 'LiveStyle');
				contents = replacePlistKeyValue(contents, 'CFBundleDisplayName', 'io.livestyle.app');
				fs.writeFile(file, contents, rename);
			});
		};

		rename();
	});
}

function replacePlistKeyValue(str, key, value) {
	var re = new RegExp('(<key>' + key + '</key>)([\s\n]*)<(\w+)>.*?</\\3>');
	return str.replace(re, '$1$2<$3>' + value + '</$3>');
}

function brandApp(app) {
	
}
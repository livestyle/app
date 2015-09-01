#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var cpy = require('cpy');
var ncp = require('ncp');
var del = require('del');
var extend = require('xtend');
var mkdirp = require('mkdirp');
var er = require('electron-rebuild');
var debug = require('debug')('lsapp:distribute');
var pkg = require('./package.json');
var brandAppOSX = require('./lib/branding/osx');
var zip = require('./lib/branding/zip');

const ELECTRON_VERSION = require('electron-prebuilt/package').version.replace(/-.*/, '');

var appDir = {
	'darwin': './node_modules/electron-prebuilt/dist/Electron.app',
	'win32': 'node_modules\\electron-prebuilt\\dist\\electron'
};

var resDir = {
	'darwin': 'Contents/Resources',
	'win32': 'resources'
};

var appFiles = [
	'{assets,lib,ui}/**',
	'{main,backend}.js',
	'index.html',
	'package.json',
	'node_modules/{' + Object.keys(pkg.dependencies) + '}/**'
];

const isOSX = process.platform === 'darwin';

module.exports = function() {
	var dir = appDir[process.platform];

	var app = {
		id: 'io.livestyle.app',
		name: 'LiveStyle',
		icon: './branding/livestyle.icns',
		dir,
		resDir: resDir[process.platform],
		appDirName: isOSX ? 'LiveStyle.app' : 'livestyle',
		version: pkg.version
	};

	return copyApp(app)
	.then(clean)
	.then(copyResources)
	.then(rebuildNative)
	.then(brand)
	.then(pack);
};

function copyApp(app) {
	return new Promise(function(resolve, reject) {
		var dest = path.join('dist', process.platform, app.appDirName);
		debug('copy prestine app from %s to %s', app.dir, dest);
		mkdirp(dest, function(err) {
			if (err) {
				return reject(err);
			}

			// have to use `ncp` instead of `cpy` to preserve symlinks and file mode
			ncp(app.dir, path.resolve(dest), function(err) {
				if (err) {
					return reject(err);
				}
				resolve(extend(app, {dir: dest}));
			});
		});
	});
}

function clean(app) {
	var dest = path.join(app.dir, app.resDir);
	debug('clean up %s dir', dest);
	return del(['atom.icns', 'default_app'], {cwd: dest}).then(function() {
		return app;
	});
}

function copyResources(app) {
	return new Promise(function(resolve, reject) {
		var dest = path.join(app.dir, app.resDir, 'app');
		debug('copy app files to %s', dest);
		cpy(appFiles, dest, {parents: true, nodir: true}, function(err) {
			err ? reject(err) : resolve(app);
		});
	});
}

function rebuildNative(app) {
	debug('rebuilding native modules');
	return er.installNodeHeaders(ELECTRON_VERSION)
	.then(function() {
		return er.rebuildNativeModules(ELECTRON_VERSION, path.join(app.dir, app.resDir, 'app', 'node_modules'));
	})
	.then(function() {
		return Promise.resolve(app);
	});
}

function brand(app) {
	return isOSX ? brandAppOSX(app) : brandApp(app);
}

function brandApp(app) {
	// TODO implement
}

function pack(app) {
	var dest = null;
	switch (process.platform) {
		case 'darwin':
			dest = `livestyle-osx-v${pkg.version}.zip`;
			break;
		case 'win32':
			var winenv = require('./lib/win-env');
			dest = `livestyle-win${winenv.X64 ? '64' : '32'}-v${pkg.version}.zip`;
			break;
		case 'linux':
			dest = `livestyle-linux-v${pkg.version}.zip`;
			break;
	}

	dest = path.resolve('dist', dest);
	debug('packing app into %s', dest);
	return zip(app, dest);
}

if (require.main === module) {
	module.exports().then(function(archive) {
		console.log(archive);
	}, function(err) {
		console.error(err.stack);
		process.exit(1);
	});
}
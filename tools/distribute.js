#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var cpy = require('cpy');
var ncp = require('ncp');
var del = require('del');
var extend = require('xtend');
var mkdirp = require('mkdirp');
var debug = require('debug')('lsapp:distribute');
var pkg = require('../package.json');
var brand = {
	'darwin': require('./branding/osx'),
	'win32': require('./branding/win')
};

const ELECTRON_VERSION = require('electron-prebuilt/package').version.replace(/-.*/, '');
var appBaseDir = path.resolve(__dirname, '../node_modules/electron-prebuilt/dist');
var appDir = {
	'darwin': path.resolve(appBaseDir, 'Electron.app'),
	'win32':  appBaseDir
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
	'node_modules/{' + Object.keys(pkg.dependencies).join(',') + '}/**'
];

module.exports = function(platform) {
	platform = platform || getPlatform();
	var isOSX = platform === 'darwin';
	console.log('Branding and packing app for %s (%s) platform', platform, process.arch);
	var app = {
		id: 'io.livestyle.app',
		name: 'LiveStyle',
		platform,
		productName: 'Emmet LiveStyle',
		companyName: 'Emmet.io',
		copyright: 'Copyright (c) 2015 Sergey Chikuyonok',
		description: pkg.description,
		icon: path.resolve(__dirname, `./branding/icon/${isOSX ? 'livestyle.icns' : 'livestyle.ico'}`),
		dir: appDir[platform],
		resDir: resDir[platform],
		appDirName: isOSX ? 'LiveStyle.app' : 'livestyle',
		version: pkg.version
	};

	return copyApp(app)
	.then(clean)
	.then(copyResources)
	.then(brand[platform]);
};

function getPlatform() {
	var platformArg = '--platform';
	var eqArg = platformArg + '=';
	var platform = process.platform;
	process.argv.slice(2).forEach(function(arg, i) {
		if (arg === platformArg) {
			platform = process.argv[i + 3];
		} else if (arg.indexOf(eqArg) === 0) {
			platform = arg.slice(eqArg.length);
		}
	});

	debug('picked platform: %s', platform);

	if (!platform || !appDir[platform]) {
		throw new Error('Unsupported platform: ' + platform);
	}

	return platform;
}

function copyApp(app) {
	return new Promise(function(resolve, reject) {
		var dest = path.resolve(__dirname, `../dist/${app.platform}/${app.appDirName}`);
		debug('clean-up old dest');
		del(dest).then(() => {
			debug('copy pristine app from %s to %s', app.dir, dest);
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

if (require.main === module) {
	module.exports().then(function(assets) {
		console.log(assets);
	}, function(err) {
		console.error(err.stack ? err.stack : err);
		process.exit(1);
	});
}
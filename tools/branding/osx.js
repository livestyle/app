'use strict';

var fs = require('fs');
var path = require('path');
var cpy = require('cpy');
var parseUrl = require('url').parse;
var debug = require('debug')('lsapp:distribute:osx');
var cmd = require('./cmd');
var info = require('../release-info');

module.exports = function(app) {
	return updateMainApp(app)
	.then(app => updateHelperApp(path.resolve(app.dir, 'Contents/Frameworks/Electron Helper.app'), app))
	.then(app => updateHelperApp(path.resolve(app.dir, 'Contents/Frameworks/Electron Helper EH.app'), app))
	.then(app => updateHelperApp(path.resolve(app.dir, 'Contents/Frameworks/Electron Helper NP.app'), app))
	.then(copyIcon)
	.then(codesign)
	.then(pack)
	.then(autoUpdate);
}

function updateMainApp(app) {
	// update plist then rename binary
	var file = path.resolve(app.dir, 'Contents/Info.plist');
	return readFile(file)
	.then(contents => {
		debug('update plist %s', file);
		return replacePlistKeyValue(contents, {
			CFBundleDisplayName: app.name,
			CFBundleName: app.name,
			CFBundleIdentifier: app.id,
			CFBundleIconFile: path.basename(app.icon),
			CFBundleVersion: app.version,
			CFBundleExecutable: app.name,
			CFBundleShortVersionString: app.version
		});
	})
	.then(contents => writeFile(file, contents))
	.then(() => {
		// rename binary
		var base = path.resolve(app.dir, 'Contents/MacOS')
		return renameFile(path.join(base, 'Electron'), path.join(base, app.name))
	})
	.then(() => app);
}

function updateHelperApp(helperPath, app) {
	// update plist then rename binary
	var baseName = path.basename(helperPath).replace(/\.\w+$/, '');
	var suffix = baseName.substr('Electron Helper'.length) || '';
	var helperName = `${app.name} Helper${suffix}`;
	var file = path.resolve(helperPath, 'Contents/Info.plist');
	return readFile(file)
	.then(contents => {
		debug('update plist %s', file);
		return replacePlistKeyValue(contents, {
			CFBundleDisplayName: helperName,
			CFBundleName: helperName,
			CFBundleIdentifier: `${app.id}.helper${suffix ? '.' + suffix.trim() : ''}`,
			CFBundleExecutable: helperName
		});
	})
	.then(contents => writeFile(file, contents))
	.then(() => {
		// rename binary
		var base = path.resolve(helperPath, 'Contents/MacOS')
		return renameFile(path.resolve(base, baseName), path.join(base, helperName));
	})
	.then(() => {
		// rename host folder
		return renameFile(helperPath, path.join(path.dirname(helperPath), `${helperName}.app`));
	})
	.then(() => app);
}

function copyIcon(app) {
	return new Promise(function(resolve, reject) {
		var dest = path.join(app.dir, app.resDir);
		debug('copy app icon %s to %s', app.icon, dest);
		return cpy([app.icon], dest, function(err) {
			err ? reject(err) : resolve(app);
		});
	});
}

function codesign(app) {
	return new Promise(function(resolve, reject) {
		var cwd = path.resolve(__dirname, '../../');
		cmd('tools/osx/codesign.sh', {cwd}, e => e ? reject(e) : resolve(app))
		.on('data', chunk => console.log(chunk));
	});
}

function replacePlistKeyValue(str, key, value) {
	var data = {};
	if (typeof key === 'string') {
		data[key] = value;
	} else if (typeof key === 'object') {
		data = key;
	}

	return Object.keys(data).reduce(function(str, key) {
		var re = new RegExp('(<key>' + key + '</key>)([\\s\\n]*)<(\\w+)>.*?</\\3>');
		return str.replace(re, '$1$2<$3>' + data[key] + '</$3>');
	}, str);
}

function readFile(filePath) {
	return new Promise(function(resolve, reject) {
		fs.readFile(filePath, 'utf8', function(err, contents) {
			err ? reject(err) : resolve(contents);
		});
	});
}

function writeFile(filePath, contents) {
	return new Promise(function(resolve, reject) {
		fs.writeFile(filePath, contents, err => err ? reject(err) : resolve());
	});
}

function renameFile(from, to) {
	return new Promise(function(resolve, reject) {
		fs.rename(from, to, function(err) {
			err ? reject(err) : resolve(to);
		});
	});
}

function pack(app) {
	var dest = path.resolve(path.dirname(app.dir), 'livestyle-osx.zip');
	debug('packing app into %s', dest);

	return new Promise(function(resolve, reject) {
		cmd('ditto', ['-ck', '--sequesterRsrc', '--keepParent', app.dir, dest], err => err ? reject(err) : resolve(dest));
	});
}

function autoUpdate(assets) {
	// create file with auto-update
	debug('create auto-update file for assets');

	if (!Array.isArray(assets)) {
		assets = [assets];
	}
	var reAppPackage = /\.zip$/;
	let appPackage = assets.reduce((prev, cur) => reAppPackage.test(cur) ? cur : prev, null);
	if (!appPackage) {
		return Promise.reject(new Error('No app package for OSX bundle, aborting'));
	}

	return new Promise((resolve, reject) => {
		var contents = JSON.stringify({
			url: `https://github.com/${info.repo}/releases/download/${info.release}/${path.basename(appPackage)}`
		});

		var updateFile = path.join(path.dirname(appPackage), 'osx-auto-update.json');
		fs.writeFile(updateFile, contents, err => {
			if (err) {
				return reject(err);
			}

			assets.push(updateFile);
			resolve(assets);
		});
	});
}
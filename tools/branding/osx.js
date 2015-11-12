'use strict';

var fs = require('fs');
var path = require('path');
var cpy = require('cpy');
var debug = require('debug')('lsapp:distribute:osx');

module.exports = function(app) {
	return updateMainApp(app)
	.then(app => updateHelperApp(path.resolve(app.dir, 'Contents/Frameworks/Electron Helper.app'), app))
	.then(app => updateHelperApp(path.resolve(app.dir, 'Contents/Frameworks/Electron Helper EH.app'), app))
	.then(app => updateHelperApp(path.resolve(app.dir, 'Contents/Frameworks/Electron Helper NP.app'), app))
	.then(copyIcon);
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
'use strict';

var fs = require('fs');
var path = require('path');
var cpy = require('cpy');
var debug = require('debug')('lsapp:distribute:osx');

module.exports = function(app) {
	return updatePlist(app)
	.then(copyIcon)
	// .then(renameExecutable);
}

function updatePlist(app) {
	// change app name and version in plist files
	var plist = [
		'Contents/Info.plist',
		'Contents/Frameworks/Electron Helper.app/Contents/Info.plist'
	];

	return new Promise(function(resolve, reject) {
		var next = function(err) {
			if (err) {
				return reject(err);
			}

			if (!plist.length) {
				return resolve(app);
			}

			var file = path.join(app.dir, plist.pop());
			fs.readFile(file, 'utf8', function(err, contents) {
				if (err) {
					return reject(err);
				}

				debug('update plist %s', file);
				var id = app.id;
				if (file.indexOf('Helper') !== -1) {
					id += '.helper';
				}
				contents = replacePlistKeyValue(contents, {
					CFBundleDisplayName: app.name,
					CFBundleName: app.name,
					CFBundleIdentifier: id,
					CFBundleIconFile: path.basename(app.icon),
					CFBundleVersion: app.version,
					// CFBundleExecutable: app.name,
					CFBundleShortVersionString: app.version
				});
				fs.writeFile(file, contents, next);
			});
		};

		next();
	});
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

function renameExecutable(app) {
	return new Promise(function(resolve, reject) {
		var base = path.join(app.dir, 'Contents/MacOS')
		fs.rename(path.join(base, 'Electron'), path.join(base, app.name), function(err) {
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
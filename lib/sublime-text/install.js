/**
 * Installer script for Sublime Text plugin
 */
'use strict';
var fs = require('graceful-fs');
var path = require('path');
var https = require('https');
var unzip = require('unzip');
var temp = require('temp').track();
var mkdirp = require('mkdirp');
var debug = require('debug')('lsapp:st-install');
var apps = require('../apps.json');
var utils = require('../node-utils');

const downloadUrl = 'https://github.com/livestyle/sublime-text/archive/master.zip';

module.exports = function(appId) {
	if (!Array.isArray(appId)) {
		appId = [appId];
	}

	// validate app ids
	for (let id of appId) {
		if (!apps[id]) {
			return Promise.reject('Unknown app id: ' + id);
		}
	}

	return download(downloadUrl)
	.then(function(archive) {
		appId = appId.slice(0);
		return new Promise(function(resolve, reject) {
			var next = function() {
				if (!appId.length) {
					return resolve();
				}

				var app = apps[appId.shift()];
				var dest = path.join(app.install[process.platform], app.extensionId[0]);
				// TODO remove old extension, if exists
				unpack(archive, utils.expandPaths(dest)[0]).then(next, reject);
			};
			next();
		});
	});
};

function download(url, attempt) {
	return new Promise(function(resolve, reject) {
		attempt = attempt || 0;
		if (attempt >= 5) {
			return reject(error('Failed to download Sublime Text plugin in ' + attempt + ' attempts', 'EMAXATTEMPTS'));
		}
		
		debug('downloading %s, attempt %d', url, attempt);
		https.get(url, function(res) {
			debug('response: %d', res.statusCode);
			if (res.statusCode === 200) {
				let dest = temp.createWriteStream();
				return res.pipe(dest)
				.once('finish', function() {
					resolve(dest.path);
				})
				.once('error', reject);
			}

			if (res.statusCode === 301 || res.statusCode === 302) {
				// redirect
				let location = res.headers.location;
				if (location) {
					return download(location, attempt + 1).then(resolve, reject);
				} else {
					return reject(error('Got redirect (' + res.statusCode + ') but no Location header', 'EINVALIDRESPONSE'));
				}
			}

			reject(error('Unknown response code: ' + res.statusCode, 'EUNKNOWNRESPONSE'));
		}).once('error', reject);
	});
}

function unpack(src, dest) {
	debug('unpacking %s into %s', src, dest);
	return new Promise(function(resolve, reject) {
		fs.createReadStream(src)
		.pipe(unzip.Parse())
		.on('entry', function(entry) {
			if (entry.type === 'Directory') {
				return entry.autodrain();
			}

			// remove first part from path: it’s an inner folder
			var parts = entry.path.split(/[\/\\]/g).filter(Boolean);
			parts.shift();
			var filePath = path.join(dest, parts.join(path.sep));
			
			var self = this;
			mkdirp(path.dirname(filePath), function(err) {
				if (err) {
					entry.autodrain();
					return self.emit('error', err);
				}
				entry.pipe(fs.createWriteStream(filePath));
			});
		})
		.once('close', resolve)
		.once('error', reject);
	});
}

function error(message, code) {
	var err = new Error(message);
	if (code) {
		err.code = code;
	}
	return err;
}
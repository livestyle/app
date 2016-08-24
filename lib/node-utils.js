/**
 * Utils for Node.js part
 */
'use strict';

const os = require('os');
const path = require('path');
const fs = require('graceful-fs');
const debug = require('debug')('lsapp:node-utils');
const winEnv = require('./win-env');

module.exports.expandUser = function(p) {
	return p.replace(/^~[\\\/]/, function() {
		return os.homedir() + path.sep;
	});
};

module.exports.expandPaths = function(paths) {
	if (!Array.isArray(paths)) {
		paths = [paths];
	}

	var result = [];
	debug('expanding %o', paths);
	paths.forEach(function(p) {
		p = module.exports.expandUser(p).replace(/%(\w+)%/g, function(str, token) {
			if (token in winEnv) {
				return winEnv[token];
			}

			if (token in process.env) {
				return process.env[token];
			}

			return str;
		});

		// do a special replacement for %PROGRAMFILES% token:
		// on x64 systems, there are two possible paths
		var reProgFiles = /%PROGRAMFILES%/;
		if (reProgFiles.test(p)) {
			result.push(p.replace(reProgFiles, winEnv.PROGRAMFILES_X86));
			if (winEnv.X64) {
				result.push(p.replace(reProgFiles, winEnv.PROGRAMFILES_X64));
			}
		} else {
			result.push(p);
		}
	});
	debug('expanded %o', result);
	return result;
};

/**
 * TODO: remove
 */
module.exports.pathContents = function(paths) {
	paths = module.exports.expandPaths(paths);
	var result = [];
	return new Promise(function(resolve, reject) {
		var next = function() {
			if (!paths.length) {
				return resolve(result);
			}

			var p = module.exports.expandUser(paths.shift());
			debug('testing %s', p);
			fs.readdir(p, function(err, items) {
				if (!err) {
					result.push({
						path: p,
						items: items
					});
				} else {
					debug(err);
				}

				next();
			});
		};

		next();
	});
};

/**
 * Finds first existing path in given array and resolves returned Promise with it
 * @param  {Array} paths Path or array of paths
 * @return {Promise}
 */
module.exports.existsSome = function(paths) {
	paths = module.exports.expandPaths(paths);

	return new Promise(function(resolve, reject) {
		var ix = 0;
		var next = function() {
			if (ix >= paths.length) {
				return reject();
			}
			var p = paths[ix++];
			debug('check existence of %s', p);
			fs.stat(p, function(err, stats) {
				if (err) {
					return next();
				}
				resolve(p);
			});
		};
		next();
	});
};

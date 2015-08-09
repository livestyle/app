/**
 * Utils for Node.js part
 */
var os = require('os');
var path = require('path');
var fs = require('graceful-fs');
var debug = require('debug')('lsapp:node-utils');

module.exports.expandUser = function(p) {
	return p.replace(/^~[\\\/]/, function() {
		return os.homedir() + path.sep;
	});
};

module.exports.pathContents = function(paths) {
	paths = path ? paths.slice(0) : [];
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
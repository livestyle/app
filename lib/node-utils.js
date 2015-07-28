/**
 * Utils for Node.js part
 */
var os = require('os');
var path = require('path');

module.exports.expandUser = function(p) {
	return p.replace(/^~[\\\/]/, function() {
		return os.homedir() + path.sep;
	});
};
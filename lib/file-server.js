/**
 * Creates a siple HTTP server for given folder. Used by Remote View for
 * creating connections for `file:` origins
 */
'use strict';

const fs = require('graceful-fs');
const path = require('path');
const http = require('http');
const connect = require('connect');
const serveStatic = require('serve-static');

module.exports = function(dir) {
	return check(dir).then(createServer);
};

/**
 * Check if given folder exists and is readable
 * @param  {String} dir
 * @return {Promise}
 */
function check(dir) {
	dir = path.normalize(dir.replace(/^file:\/\//, ''));
	return new Promise(function(resolve, reject) {
		fs.readdir(dir, err => err ? reject(err) : resolve(dir));
	});
}

/**
 * Creates HTTP server for given folder
 * @param  {String} dir
 * @return {Promise}
 */
function createServer(dir) {
	return new Promise(function(resolve, reject) {
		var app = connect().use(serveStatic(dir));
		var server = http.createServer(app);
		server.once('error', reject);
		// start server on random port
		server.listen(0, 'localhost', () => resolve(server));
	});
}

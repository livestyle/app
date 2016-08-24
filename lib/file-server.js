/**
 * Creates a simple static HTTP server for given folder. Used by Remote View for
 * creating connections for `file:` origins
 */
'use strict';

const fs = require('graceful-fs');
const path = require('path');
const http = require('http');
const connect = require('connect');
const serveStatic = require('serve-static');
const debug = require('debug')('lsapp:file-server');

const servers = new Map();
const allowedMessages = new Set(['incoming-updates', 'diff']);

module.exports = function(dir) {
	return check(dir)
	.then(dir => {
		// maybe we already have server for this dir?
		if (servers.has(dir)) {
			debug('Server for %s already exists');
			return servers.get(dir);
		}

		return createServer(dir)
		.then(server => {
			var addr = server.address();
			var host = `http://${addr.address}:${addr.port}`;
			debug('Created %s server for %s', host, dir);
			server.host = host;
			server.docroot = dir;
			server.once('close', () => servers.delete(dir));
			servers.set(dir, server);
			return server;
		});
	});
};

/**
 * Find existing server by given key (either docroot or host)
 * @type {http.Server}
 */
const find = module.exports.find = function(key) {
	debug('Searching server for %s', key);
	key = normalize(key);
	if (servers.has(key)) {
		debug('Server for %s found by key', key);
		return servers.get(key);
	}

	for (let server of servers.values()) {
		if (server.host === key || server.docroot === key) {
			debug('Server for %s found by iteration', key);
			return server;
		}
	}
};

/**
 * Destroys server instance found by given key (host or docroot)
 * @param  {String} key
 * @return {Promise} Resolved when server is closed
 */
module.exports.destroy = function(key) {
	debug('Destroy server for %s', key);
	return new Promise(resolve => {
		let server = typeof key === 'string' ? find(key) : key;
		server ? server.close(resolve) : resolve();
	});
};

/**
 * Returns list of available web servers. If `url` argument is given,
 * returns list of servers which document root matches given url
 * @param {String} docroot
 * @return {Array}
 */
module.exports.list = function(url) {
	let list = Array.from(servers.values());
	if (url) {
		url = normalize(url);
		debug('Find server for %s', url);
		list = list.filter(server => url.indexOf(server.docroot) === 0);
	}

	return list;
};

/**
 * Check if given folder exists and is readable
 * @param  {String} dir
 * @return {Promise}
 */
function check(dir) {
	debug('Check existance of %s', dir);
	dir = normalize(dir);
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

function normalize(dir) {
	return path.normalize(dir.replace(/^file:\/\//, ''));
}

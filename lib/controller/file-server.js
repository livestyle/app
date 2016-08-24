/**
 * Local file web-server controller: wraps given file origin with local HTTP
 * server (if possible) and manages server lifecycle.
 */
'use strict';

const path = require('path');
const debug = require('debug')('lsapp:file-server');
const tunnel = require('./tunnel');
const fileServer = require('../file-server');

const reIsFile = /^file:/;
const servers = [];
const allowedMessages = ['incoming-updates', 'diff'];

module.exports = function(docroot) {
	docroot = normalize(docroot);

	// maybe there’s already a web-server for current docroot?
	var server = find(docroot);
	if (server) {
		debug('local file server already exists for %s', docroot);
		return Promise.resolve(server.rv.address);
	}

	debug('should create local file server');
	return fileServer(docroot).then(function(server) {
		var addr = server.address();
		var localSite = `http://${addr.address}:${addr.port}`;
		server.rv = {address: localSite, docroot};
		servers.push(server);

		debug('created local file server %s for %s', localSite, docroot);
		return localSite;
	});
};

module.exports.forward = function(client) {
	// forward updates from filesystem origin to local HTTP server
	client.on('message', function(payload) {
		if (typeof payload === 'string') {
			payload = JSON.parse(payload);
		}

		if (!payload || !payload.data || allowedMessages.indexOf(payload.name) === -1) {
			return debug('skip message forward: unsupported message "%s"', payload.name);
		}

		// is this a filesystem?
		if (!reIsFile.test(payload.data.uri)) {
			return debug('skip message forward: "%s" is not a file origin', payload.data.uri);
		}

		var file = normalize(payload.data.uri);
		// find server(s) that match given origin and forward messages
		servers.forEach(function(server) {
			if (file.indexOf(server.rv.docroot) !== 0) {
				return;
			}

			// local server found, rebuild URL and forward message
			var uri = server.rv.address + '/' + file
			.slice(server.rv.docroot.length)
			.split(/[\\\/]/g)
			.filter(Boolean)
			.join('/');

			debug('forward message to %s', uri);
			client.send(payload.name, Object.assign({}, payload.data, {uri}));
		});
	});
};

var find = module.exports.find = function(key) {
	var docroot = normalize(key);
	for (let server of servers) {
		if (server.rv.address === key || server.rv.docroot === docroot) {
			return server;
		}
	}
};

var normalize = module.exports.normalize = function(dir) {
	return path.normalize(dir.replace(/^file:\/\//, ''));
};

// destroy local web-server when session is closed
tunnel.on('clusterDestroy', function(cluster) {
	var server = find(cluster.options.localSite);
	// make sure no other session uses current server
	var cmp = function(c) {return c.localSite === server.rv.address;};
	if (server && !tunnel.list().some(cmp)) {
		server.close();
		servers.splice(servers.indexOf(server), 1);
	}
});

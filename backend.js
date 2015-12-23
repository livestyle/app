/**
 * A Node.JS back-end for Remote View feature of LiveStyle app: 
 * manages connections to LiveStyle and Remote View servers and
 * responds to RV messages.
 *
 * Designed to use in pure Node.JS environment for testing and
 * debugging (e.g. do not use any Electron-specific packages)
 */
'use strict';

var debug = require('debug')('lsapp:backend');
var extend = require('xtend');
var tunnelController = require('./lib/controller/tunnel');
var fileServerController = require('./lib/controller/file-server');

module.exports = function(client) {
	client
	.on('rv-ping', function() {
		debug('ping');
		client.send('rv-pong');
	})
	.on('rv-get-session', function(data) {
		var origin = data && data.localSite;
		debug('get session for %s', origin);
		client.send('rv-session', sessionPayload(origin));
	})
	.on('rv-get-session-list', function() {
		var sessions = tunnelController.list()
		.map(function(session) {
			// if this is a local server, rewrite its localSite to server docroot
			var localServer = fileServerController.find(session.localSite);
			if (localServer) {
				session = extend(session, {localSite: localServer.rv.docroot});
			}
			return session;
		});
		client.send('rv-session-list', sessions);
	})
	.on('rv-create-session', function(data) {
		debug('create session %o', data);

		var onError = function(err) {
			debug('error when creating session for %s: %s', data.localSite, err ? err.message : 'unknown');
			var message = err ? err.message : 'Unable to establish tunnel with Remote View server';
			client.send('rv-session', {
				localSite: data.localSite,
				error: message + '. Please try again later.'
			});
		};

		var onConnect = function() {
			debug('created session for %s', data.localSite);
			client.send('rv-session', sessionPayload(data.localSite));
			this.removeListener('destroy', onDestroy);
		};
		
		var onDestroy = function(err) {
			err && onError(err);
			this.removeListener('connect', onConnect);
		};

		tunnelController.create(data)
		.once('connect', onConnect)
		.once('destroy', onDestroy);
	})
	.on('rv-close-session', function(data) {
		debug('close session %o', data);
		module.exports.closeRvSession(data.localSite);
	})
	.on('rv-create-http-server', function(data) {
		fileServerController(data.docroot)
		.then(function(origin) {
			client.send('rv-http-server', {
				docroot: data.docroot,
				origin
			});
		})
		.catch(function(err) {
			client.send('rv-http-server', {
				docroot: data.docroot,
				error: err.message
			});
		});
	});

	fileServerController.forward(client);

	return client;
};

module.exports.closeRvSession = function(key) {
	debug('requested session %o close', key);
	var session = sessionPayload(key);
	if (session && !session.error) {
		debug('closing %s', session.publicId);
		tunnelController.close(session.publicId);
	}
};

function findSession(key) {
	for (let session of tunnelController.list()) {
		if (session.localSite === key || session.publicId === key) {
			return session;
		}
	}
}

function sessionPayload(localSite) {
	var session = findSession(localSite);
	if (!session) {
		// mayabe its a local web-server?
		var localServer = fileServerController.find(localSite);
		if (localServer) {
			session = findSession(localServer.rv.address);
			if (session) {
				session = extend(session, {localSite})
			}
		}
	}

	return session || {
		localSite,
		error: 'Session not found'
	};
}

if (require.main === module) {
	let pkg = require('./package.json');
	require('./lib/client')(pkg.config.websocketUrl, function(err, client) {
		if (err) {
			return console.error(err);
		}

		module.exports(client);
		console.log('RV client connected');
	});
}
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
var tunnelController = require('./lib/controller/tunnel');
var appModelController = require('./lib/controller/app-model');

module.exports = function(client) {
	client
	.on('rv-ping', function() {
		debug('ping');
		client.send('rv-pong');
	})
	.on('rv-get-session', function(data) {
		var localSite = data && data.localSite;
		debug('get session for %s', localSite);
		client.send('rv-session', sessionPayload(localSite));
	})
	.on('rv-get-session-list', function() {
		client.send('rv-session-list', tunnelController.list());
	})
	.on('rv-create-session', function(data) {
		debug('create session %o', data);

		var onError = err => {
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

		tunnelController.create(data).then(cluster => {
			cluster.once('connect', onConnect).once('destroy', onDestroy);
		}, onError);
	})
	.on('rv-close-session', function(data) {
		debug('close session %o', data);
		module.exports.closeRvSession(data.localSite);
	});

	return appModelController(client).on('change', function() {
		debug('model update %o', this.attributes);
		client.send('app-model', this.toJSON());
	});
};

module.exports.closeRvSession = function(key) {
	debug('requested session %o close', key);
	var session = findSession(key);
	if (session) {
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
	return findSession(localSite) || {
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
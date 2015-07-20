/**
 * A Node.JS back-end for Remote View feature of LiveStyle app: 
 * manages connections to LiveStyle and Remote View servers and
 * responds to RV messages.
 */
'use strict';

var debug = require('debug')('lsapp:backend');
var tunnelController = require('./lib/tunnel-controller');
var pkg = require('./package.json');

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
		var onConnect = function() {
			debug('created session for %s', data.localSite);
			client.send('rv-session', sessionPayload(data.localSite));
			this.removeListener('destroy', onDestroy);
		};
		var onDestroy = function(err) {
			debug('unable to create session for %s: %s', data.localSite, err ? err.message : 'unknown');
			client.send('rv-session', {
				localSite: data.localSite,
				error: err ? err.message : 'Unable to create session'
			});
			this.removeListener('connect', onConnect);
		};

		tunnelController.create(data)
		.once('connect', onConnect)
		.once('destroy', onDestroy);
	})
	.on('rv-close-session', function(data) {
		var session = findSession(data);
		if (session) {
			tunnelController.close(session.sessionId);
		}
	});

	tunnelController.on('update', function(list) {
		client.send('rv-session-list', list);
	});
};

function findSession(localSite) {
	for (let session of tunnelController.list()) {
		if (session.localSite === localSite) {
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
	require('./lib/client')(pkg.config.websocketUrl, function(err, client) {
		if (err) {
			return console.error(err);
		}

		module.exports(client);
		console.log('RV client connected');
	});
}
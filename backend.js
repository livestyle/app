/**
 * A Node.JS back-end for Remote View feature of LiveStyle app:
 * manages connections to LiveStyle and Remote View servers and
 * responds to RV messages.
 *
 * Designed to use in pure Node.JS environment for testing and
 * debugging (e.g. do not use any Electron-specific packages)
 */
'use strict';

const debug = require('debug')('lsapp:backend');
const TunnelController = require('./lib/controller/tunnel');
const fileServer = require('./lib/file-server');
const pkg = require('./package.json');

const tunnels = new TunnelController(pkg.config);
const forwardMessages = new Set(['incoming-updates', 'diff']);

module.exports = function(client) {
	let sendSessionList = () => client.send('rv-session-list', tunnels.list().map(upgradeSession));

	tunnels
	.on('clusterDestroy', sendSessionList)
	.on('clusterCreate', sendSessionList);

	client
	.on('rv-ping', function() {
		debug('ping');
		client.send('rv-pong');
	})
	.on('rv-get-session', data => {
		var origin = data && (data.origin || data.localSite);
		debug('get session for %s', origin);
		client.send('rv-session', sessionPayload(origin));
	})
	.on('rv-get-session-list', sendSessionList)
	.on('rv-create-session', data => {
		data = upgradePayload(data);
		debug('create session %o', data);

		tunnels.connect(data)
		.then(cluster => {
			debug('created connection for %s', data.origin);
			client.send('rv-session', sessionPayload(data.origin));
		})
		.catch(err => {
			debug('error when creating session for %s: %s', data.origin, err ? err.message : 'unknown');
			var message = err ? err.message : 'Unable to establish tunnel with Remote View server';
			client.send('rv-session', {
				origin: data.origin,
				error: message + '. Please try again later.'
			});
		});
	})
	.on('rv-close-session', data => {
		data = upgradePayload(data);
		debug('close session %o', data);
		closeRvSession(data.origin);
	})
	.on('rv-create-http-server', function(data) {
		debug('Explicit HTTP server creation is deprecated, use "rv-create-session" directly with file:// origin');
		fileServer(data.docroot)
		.then(server => {
			client.send('rv-http-server', {
				docroot: data.docroot,
				origin: server.host
			});
		})
		.catch(err => {
			client.send('rv-http-server', {
				docroot: data.docroot,
				error: err.message
			});
		});
	});

	setupMessageForwarding(client);
	sendSessionList();

	return client;
};

const closeRvSession = module.exports.closeRvSession = function(key) {
	debug('requested session %o close', key);
	var session = sessionPayload(key);
	if (session && !session.error) {
		debug('closing %s', session.publicId);
		tunnels.close(session.publicId);
	}
};

module.exports.tunnels = tunnels;

function upgradePayload(data) {
	if (data.localSite && !data.origin) { // v1.0
		data = Object.assign({}, data, {origin: data.localSite});
	}
	return data;
}

function findSession(key) {
	for (let session of tunnels.list()) {
		if (session.origin === key || session.localSite === key || session.publicId === key) {
			return session;
		}
	}
}

function sessionPayload(origin) {
	var session = findSession(origin);
	if (session && session.state !== 'destroyed') {
		return upgradeSession(session);
	}

	return {
		origin,
		localSite: origin,
		error: 'Session not found'
	};
}

function upgradeSession(session) {
	return Object.assign({}, session, {state: 'connected'});
}

/**
 * Setup LiveStyle message forwarding from pages with `file://` origin to their
 * temporary file servers created for Remote View sessions
 * @param  {LiveStyleClient}
 */
function setupMessageForwarding(client) {
	let onMessage = function(payload) {
		if (typeof payload === 'string') {
			payload = JSON.parse(payload);
		}

		if (!payload || !payload.data || !forwardMessages.has(payload.name)) {
			return debug('skip message forward: unsupported message "%s"', payload.name);
		}

		// is this a filesystem?
		if (!/^file:/.test(payload.data.uri)) {
			return debug('skip message forward: "%s" is not a file origin', payload.data.uri);
		}

		let file = fileServer.normalizePath(payload.data.uri);
		let servers = fileServer.list(file);
		if (!servers.length) {
			return debug('skip message forward: no matching servers for "%s" uri', payload.data.uri);
		}

		servers.forEach(server => {
			// rebuild URL and forward message
			let relative = file.slice(server.docroot.length).replace(/[\\\/]/g, '/');
			let uri = server.host + '/' + relative;

			debug('forward message to %s', uri);
			client.send(payload.name, Object.assign({}, payload.data, {uri}));
		});
	};

	client.on('message', onMessage);
	return () => client.removeListener('message', onMessage);
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

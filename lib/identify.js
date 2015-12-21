/**
 * A common plugin identification protocol: send `identify-client`
 * message and wait for `client-id` response with given `id` value
 */
'use strict';
var debug = require('debug')('lsapp:identify');
var utils = require('./utils');

var throttled = new Map();

module.exports = function identify(client, id) {
	return new Promise(function(resolve, reject) {
		var timer = setTimeout(function() {
			cleanUp();
			reject();
		}, 500);

		var cleanUp = function() {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			client.removeListener('client-id', onClientId);
		};

		var onClientId = function(data) {
			debug('received "client-id" with %s', data && data.id);
			if (data && data.id) {
				let expected = Array.isArray(id) 
					? id.indexOf(data.id) !== -1 
					: id === data.id;
				if (expected) {
					cleanUp()
					resolve();
				}
			}
		};

		client.on('client-id', onClientId);
		sendRequest(client);
	});
};

function sendRequest(client) {
	if (!throttled.has(client)) {
		throttled.set(client, utils.throttle(function() {
			debug('sending "identify-client" request');
			client.send('identify-client');
			throttled.delete(client);
		}, 10, {leading: false}));
	}
	throttled.get(client)();
}
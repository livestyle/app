'use strict';

var assert = require('assert');
var server = require('../lib/server');
var client = require('../lib/client');

describe('Server Connectivity', function() {
	var opt = {reconnectOnClose: false};
	it('connect to server', function(done) {
		server(54001, function() {
			client('ws://127.0.0.1:54001/livestyle', opt, function(err, ws) {
				assert(!err);
				assert(ws);
				assert.equal(ws.readyState, 1);
				server.destroy(done);
			});
		});
	});

	it('auto-create server', function(done) {
		client('ws://127.0.0.1:54001/livestyle', opt, function(err, ws) {
			assert(!err);
			assert(ws);
			assert.equal(ws.readyState, 1);
			server.destroy(done);
		});
	});

	it('send & receive message', function(done) {
		client('ws://127.0.0.1:54001/livestyle', opt, function(err, ws) {
			assert(!err);
			assert(ws);

			var message = {
				name: 'foo',
				data: 'bar'
			};

			ws.on(message.name, function(data) {
				assert.equal(data, message.data);
				server.destroy(done);
			});
			server.send(message);
		});
	});
});
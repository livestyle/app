'use strict';

const assert = require('assert');
const http = require('http');
const connect = require('connect');
const request = require('../lib/request');
const tunnel = require('../lib/controller/tunnel');

describe.only('Tunnel cluster', () => {
	it('connect', done => {
		createServer()
		.then(server => {
			request(`${server.host}/connect/`, (err, resp, body) => {
				if (err) {
					return done(err);
				}

				console.log(body);
				done();
			});
		});
	});
});

function createServer() {
	return new Promise((resolve, reject) => {
		var app = connect().use((req, res) => {
			console.log('requested', req.url);
			res.end('Done!');
		});
		var server = http.createServer(app);
		server.once('error', reject);
		// start server on random port
		server.listen(0, 'localhost', () => {
			var addr = server.address();
			var host = `http://${addr.address}:${addr.port}`;
			server.host = host;
			resolve(server);
		});
	});
}

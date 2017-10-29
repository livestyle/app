'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const connect = require('connect');
const request = require('../lib/request');
const fileServer = require('../lib/file-server');
const TunnelClusterController = require('../lib/controller/tunnel');

const AUTH_TOKEN = 'test-token';

describe('Tunnel cluster', () => {

	it('connect to http://', done => {
		createServer().then(server => {
			const tunnel = new TunnelClusterController({remoteSessionUrl: `${server.host}/connect/`});
			const origin = 'http://localhost:12345';
			return tunnel.connect({
				origin,
				authorization: AUTH_TOKEN
			})
			.then(cluster => {
				assert.equal(cluster.options.origin, origin);
				assert.equal(cluster.options.localSite, origin);
				assert.equal(cluster.options.publicId, 'foo.livestyle.io');

				let list = tunnel.list();
				assert.equal(list.length, 1);
				assert.equal(list[0].origin, origin);
				assert.equal(list[0].localSite, origin);

				return destroy(cluster);
			})
			.then(() => server.shutdown())
			.then(() => {
				// connections must be properly closed
				assert.equal(tunnel.list().length, 0);
			});
		})
		.then(done, done);
	});

	it('connect to file://', done => {
		createServer().then(server => {
			const tunnel = new TunnelClusterController({remoteSessionUrl: `${server.host}/connect/`});
			const origin = 'file://' + path.resolve(__dirname, 'static');
			return tunnel.connect({
				origin,
				authorization: AUTH_TOKEN
			})
			.then(cluster => {
				let tempServer = fileServer.find(origin);
				assert(tempServer);
				assert.equal(fileServer.list().length, 1);
				assert.equal(cluster.options.origin, origin);
				assert.equal(cluster.options.publicId, 'foo.livestyle.io');
				assert.equal(cluster.options.localSite, tempServer.host);

				// make sure temp server works properly
				return checkRequest(tempServer)
				.then(() => destroy(cluster));
			})
			.then(() => server.shutdown())
			.then(() => {
				// connections and servers must be properly closed
				assert.equal(tunnel.list().length, 0);
				assert.equal(fileServer.list().length, 0);
			});;
		})
		.then(done, done);
	});
});

function createServer() {
	return new Promise((resolve, reject) => {
		const app = connect().use((req, res) => {
			let error = (code, message) => {
				res.statusCode = code;
				res.end(JSON.stringify({error: {message}}));
			};

			if (req.method !== 'POST') {
				return error(405, `${req.method} method is not allowed`);
			}

			readRequestData(req)
			.then(data => {
				let auth = req.headers.authorization;
				res.setHeader('content-type', 'application/json');

				if (auth !== AUTH_TOKEN) {
					return error(401, 'Invalid token');
				}

				return res.end(JSON.stringify({
					sessionId:  'foo',
					publicId:   'foo.livestyle.io',
					localSite:  data.localSite,
					connectUrl: 'http://localhost:8902/fake-session',
					expiresAt:  Date.now() + 1000
				}));
			})
			.catch(err => error(500, err.message));
		});

		const server = http.createServer(app);
		server.once('error', reject);
		// start server on random port
		server.listen(0, 'localhost', () => {
			var addr = server.address();
			var host = `http://${addr.address}:${addr.port}`;
			server.host = host;
			resolve(server);
		});

		server.shutdown = () => new Promise(resolve => server.close(resolve));
	});
}

function destroy(item) {
	return new Promise((resolve, reject) => {
		item
		.once('destroy', err => err ? reject(err) : resolve())
		.once('error', reject)
		.destroy();
	});
}

function readRequestData(stream) {
	return new Promise((resolve, reject) => {
		let chunks = [];
		stream
		.on('data', chunk => chunks.push(chunk))
		.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())))
		.on('error', reject)
		.resume();
	});
}

function checkRequest(server, url) {
	return new Promise((resolve, reject) => {
		request(url || `${server.host}/index.html`, (err, resp, body) => {
			if (!err && body.length) {
				resolve(server);
			} else {
				reject(err || new Error('Empty response body'));
			}
		});
	});
}

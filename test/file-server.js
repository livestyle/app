'use strict';

const path = require('path');
const assert = require('assert');
const request = require('request');
const fileServer = require('../lib/file-server');

const docroot = path.resolve(__dirname, './static');

describe('File Server', () => {
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

	it('create server for plain path', done => {
		fileServer(docroot)
		.then(checkRequest)
		.then(server => {
			assert.equal(fileServer.list().length, 1);
			assert.equal(server.docroot, docroot);
			assert(/^http:\/\/(localhost|127\.0\.0\.1):\d+/.test(server.host));

			return fileServer.destroy(server);
		})
		.then(() => {
			// make sure server instance is destroyed
			assert.equal(fileServer.list().length, 0);
			done();
		})
		.catch(done);
	});

	it('create server for file:// path', done => {
		fileServer('file://' + docroot)
		.then(checkRequest)
		.then(server => {
			assert.equal(fileServer.list().length, 1);
			assert.equal(server.docroot, docroot);
			assert(/^http:\/\/(localhost|127\.0\.0\.1):\d+/.test(server.host));

			return fileServer.destroy(server);
		})
		.then(() => {
			assert.equal(fileServer.list().length, 0);
			done();
		})
		.catch(done);
	});

	it('re-use server for same docroot', done => {
		fileServer(docroot)
		.then(checkRequest)
		.then(server => {
			return fileServer(docroot)
			.then(server2 => {
				assert.equal(server, server2);
				assert.equal(fileServer.list().length, 1);
				return fileServer.destroy(server2);
			});
		})
		.then(() => {
			assert.equal(fileServer.list().length, 0);
			done();
		})
		.catch(done);
	});

	it('find server for url', done => {
		let docroot2 = path.resolve(docroot, 'inner');
		Promise.all([fileServer(docroot), fileServer(docroot2)])
		.then(servers => {
			let [s1, s2] = servers;
			assert.equal(fileServer.list().length, 2);

			let matched = fileServer.list(`file://${s1.docroot}/foo/bar/`);
			assert.equal(matched.length, 1);
			assert.equal(matched[0], s1);

			matched = fileServer.list(`http://livestyle.io/foo/bar/`);
			assert.equal(matched.length, 0);

			return Promise.all(servers.map(s => fileServer.destroy(s)));
		})
		.then(() => {
			assert.equal(fileServer.list().length, 0);
			done();
		})
		.catch(done);
	});
});

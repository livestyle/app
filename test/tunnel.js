'use strict';

var assert = require('assert');
var path = require('path');
var http = require('http');
var tc = require('../lib/controller/tunnel');
var fileServer = require('../lib/controller/file-server');

// No need to check full Remote View connectivity,
// simply check that controller is properly instantiated and emits messages

describe('Tunnel Cluster controller', function() {
	it('create and emit messages', function(done) {
		var clusterCreated = false;
		var updates = [];

		// for some reason networking is very slow on Windows, has to increase
		// test timeout
		this.timeout(5000);

		tc.on('update', list => updates.push(list))
		.once('clusterCreate', cluster => clusterCreated = true)
		.once('clusterDestroy', cluster => {
			setTimeout(() => {
				assert(clusterCreated);
				assert.equal(updates.length, 2);
				assert.equal(updates[0][0].publicId, 'rv-test.livestyle.io');
				assert.equal(updates[0][0].state, 'idle');

				// the second update is empty list because cluster was destroyed
				assert.deepEqual(updates[1], []);
				done();
			}, 30);
		});

		tc.create({
			publicId: 'rv-test.livestyle.io',
			localSite: 'http://localhost:8901',
			connectUrl: 'http://localhost:8902/fake-session',
			maxConnections: 2,
			retryCount: 2,
			retryDelay: 100,
		});
	});

	it('"file:" origin', function(done) {
		tc.once('clusterCreate', function(cluster) {
			// server must be closed when session is destroyed
			var server = fileServer.find(cluster.options.localSite);
			assert(server);
			server.once('close', done);
			http.get(cluster.options.localSite + '/index.html', res => {
				assert.equal(res.statusCode, 200);
				assert.equal(res.headers['content-type'], 'text/html; charset=UTF-8');
				cluster.destroy();
			}).on('error', done);
		});

		fileServer(`file://` + path.join(__dirname, 'static').replace(/\\/g, '/'))
		.then(origin => {
			tc.create({
				publicId: 'rv-test.livestyle.io',
				localSite: origin,
				connectUrl: 'http://localhost:8902/fake-session'
			});
		}, done);
	});
});
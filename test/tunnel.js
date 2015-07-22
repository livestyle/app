'use strict';

var assert = require('assert');
var tc = require('../lib/tunnel-controller');

// No need to check full Remote View connectivity,
// simply check that controller is properly instantiated and emits messages

describe('Tunnel Cluster controller', function() {
	it('create and emit messages', function(done) {
		var clusterCreated = false;
		var updates = [];

		tc
		.on('update', function(list) {
			updates.push(list);
		})
		.on('clusterCreate', function(cluster) {
			clusterCreated = true;
		})
		.on('clusterDestroy', function(cluster) {
			setTimeout(function() {
				assert(clusterCreated);
				assert.equal(updates.length, 2);
				assert.equal(updates[0][0].publicId, 'rv-test.livestyle.io');
				assert.equal(updates[0][0].state, 'idle');

				// the second update is empty list because cluster was destroyed
				assert.deepEqual(updates[1], []);				
				done();
			}, 20);
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
});
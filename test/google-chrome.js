'use strict';

const path = require('path');
const assert = require('assert');
const chrome = require('../lib/google-chrome');

describe('Google Chrome', () => {
	let dir = d => path.resolve(__dirname, d);

	// Google Chrome app detection relies on third-party lib (browser-launcher2),
	// no need to test.
	// Test plugin detection only
	describe('detect plugin', () => {
		var extensionId = ['obipchajaiohjoohongibhgbfgchblei', 'diebikgmpmeppiilkaijjbdgciafajmg'];
		it('not exists', done => {
			chrome.detect.plugin({
				lookup: [dir('google-chrome/dir1')],
				extensionId
			})
			.then(result => {
				assert.equal(result, false);
				done();
			})
			.catch(done);
		});

		it('exists', done => {
			chrome.detect.plugin({
				lookup: [dir('google-chrome/dir2')],
				extensionId
			})
			.then(result => {
				assert(result);
				assert.equal(path.basename(result), extensionId[0]);
				done();
			})
			.catch(done);
		});
	});
});
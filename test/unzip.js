'use strict';

const fs = require('graceful-fs');
const path = require('path');
const assert = require('assert');
const temp = require('temp').track();
const unzip = require('../lib/helpers/unzip');

describe('Unzip', () => {
	it('basic unpack', done => {
		temp.mkdir('lsapp-zip', (err, dir) => {
			if (err) {
				return done(err);
			}

			unzip(path.resolve(__dirname, 'static/sample1.zip'), dir)
			.then(dir => {
				assert(dir);
				fs.readdir(dir, (err, items) => {
					assert.equal(items.length, 2);
					assert(items.indexOf('index.html') !== -1);
					assert(items.indexOf('inner') !== -1);
					done();
				});
			})
			.catch(done);
		});
	});

	it('unpack with dir switch', done => {
		unzip(path.resolve(__dirname, 'static/sample2.zip'))
		.then(dir => {
			// should switch to `inner` dir in result
			assert(dir);
			assert.equal(path.basename(dir), 'inner');
			fs.readdir(dir, (err, items) => {
				assert.equal(items.length, 2);
				assert(items.indexOf('index.html') !== -1);
				assert(items.indexOf('foo.html') !== -1);
				assert(items.indexOf('inner') === -1);
				done();
			});
		})
		.catch(done);
	});
});
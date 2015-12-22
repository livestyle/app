/**
 * Test detection and installation process of Sublime Text
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');
const connect = require('connect');
const serveStatic = require('serve-static');
const detect = require('../lib/sublime-text/detect');
const install = require('../lib/sublime-text/install');
const autoupdate = require('../lib/sublime-text/autoupdate');

describe('Sublime Text', () => {
	let dir = d => path.resolve(__dirname, d);
	let read = f => fs.readFileSync(dir(f), 'utf8');
	let readJSON = f => JSON.parse(read(f));

	describe('detect app', () => {
		it('does not exists', done => {
			detect.app({lookup: dir('sublime-text/dir1/LiveStyle/livestyle.exe')})
			.then(() => done(new Error('Should fail')))
			.catch(err => {
				assert.equal(err.code, 'ENOSUBLIMETEXT');
				done();
			});
		});

		it('exists (single path)', done => {
			detect.app({lookup: dir('sublime-text/dir2/LiveStyle/livestyle.exe')})
			.then(appPath => {
				assert.equal(path.basename(appPath), 'livestyle.exe');
				done();
			})
			.catch(done);
		});

		it('exists (multiple paths)', done => {
			detect.app({lookup: [
				dir('sublime-text/dir1/LiveStyle/livestyle.exe'),
				dir('sublime-text/dir2/LiveStyle/livestyle.exe')
			]})
			.then(appPath => {
				assert.equal(path.basename(appPath), 'livestyle.exe');
				assert(appPath.indexOf('dir2') !== -1);
				done();
			})
			.catch(done);
		});
	});

	describe('detect plugin', () => {
		let extensionId = ['LiveStyle', 'LiveStyle.sublime-package'];
		it('not exists', done => {
			detect.plugin({
				install: dir('sublime-text/dir1/Packages'),
				extensionId
			})
			.then(result => {
				assert.equal(result, false);
				done();
			})
			.catch(done);
		});

		it('exists (unpacked)', done => {
			detect.plugin({
				install: dir('sublime-text/dir2/Packages'),
				extensionId
			})
			.then(result => {
				assert(result);
				assert.equal(path.basename(result), 'LiveStyle');
				done();
			})
			.catch(done);
		});

		it('exists (packed)', done => {
			detect.plugin({
				install: dir('sublime-text/dir3/Packages'),
				extensionId
			})
			.then(result => {
				assert(result);
				assert.equal(path.basename(result), 'LiveStyle.sublime-package');
				done();
			})
			.catch(done);
		});
	});

	describe('install', () => {
		const port = 8888;
		const host = `http://localhost:${port}`;
		var server;
		before(done => {
			let app = connect().use(serveStatic(dir('sublime-text')));
			server = http.createServer(app);
			server.listen(port, done);
		});

		after(done => server.close(done));

		it('install (with auto-update)', done => {
			let app = {
				downloadUrl: `${host}/plugin.zip`,
				commitUrl: `${host}/commit.json`,
				install: dir('sublime-text/out/install-auto-update')
			};
			let out = p => path.resolve(app.install, p);

			install(app)
			.then(result => {
				assert(result);
				assert.equal(path.basename(result), 'LiveStyle');
				assert(read(out('Livestyle/livestyle.py')));
				assert.equal(readJSON(out('Livestyle/autoupdate.json')).sha, readJSON('sublime-text/commit.json').sha);
				done();
			})
			.catch(done);
		});

		it('install (without auto-update)', done => {
			let app = {
				downloadUrl: `${host}/plugin.zip`,
				install: dir('sublime-text/out/install-auto-update')
			};
			let out = p => path.resolve(app.install, p);

			install(app)
			.then(result => {
				assert(result);
				assert.equal(path.basename(result), 'LiveStyle');
				assert(read(out('Livestyle/livestyle.py')));
				assert.throws(() => read(out('Livestyle/autoupdate.json')), /ENOENT/);
				done();
			})
			.catch(done);
		});
	});

	describe('auto-update', () => {
		const port = 8888;
		const host = `http://localhost:${port}`;
		var server;
		before(done => {
			let app = connect().use(serveStatic(dir('sublime-text')));
			server = http.createServer(app);
			server.listen(port, done);
		});

		after(done => server.close(done));

		it('should trigger', done => {
			let app = {
				downloadUrl: `${host}/plugin.zip`,
				commitUrl: `${host}/commit.json`,
				install: dir('sublime-text/out/install-auto-update')
			};
			let out = p => path.resolve(app.install, p);

			install(app)
			.then(() => {
				let updater = autoupdate(app);
				let eventEmitted = false;
				return updater.check()
				.then(result => {
					// sha’s are equal, update file and try again
					assert.equal(result, false);
					updater.on('shouldUpdate', () => eventEmitted = true);
					fs.writeFileSync(out('Livestyle/autoupdate.json'), '{"sha":"foo"}');
					return updater.check();
				})
				.then(result => {
					assert.equal(result, true);
					assert.equal(eventEmitted, true);
					done();
				});
			})
			.catch(done);
		});

		it('should not trigger', done => {
			let app = {
				downloadUrl: `${host}/plugin.zip`,
				install: dir('sublime-text/out/install-auto-update')
			};
			let out = p => path.resolve(app.install, p);

			install(app)
			.then(() => autoupdate(app).check())
			.then(result => done(new Error('Should fail')))
			.catch(err => done());
		});
	});
});
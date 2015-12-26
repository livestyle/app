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
const st = require('../lib/sublime-text');
const status = require('../ui/sublime-text-status');

describe('Sublime Text', () => {
	let dir = d => path.resolve(__dirname, d);
	let read = f => fs.readFileSync(dir(f), 'utf8');
	let readJSON = f => JSON.parse(read(f));

	describe('detect app', () => {
		it('does not exists', done => {
			st.detect.app({lookup: dir('sublime-text/dir1/LiveStyle/livestyle.exe')})
			.then(() => done(new Error('Should fail')))
			.catch(err => {
				assert.equal(err.code, 'ENOSUBLIMETEXT');
				done();
			});
		});

		it('exists (single path)', done => {
			st.detect.app({lookup: dir('sublime-text/dir2/LiveStyle/livestyle.exe')})
			.then(appPath => {
				assert.equal(path.basename(appPath), 'livestyle.exe');
				done();
			})
			.catch(done);
		});

		it('exists (multiple paths)', done => {
			st.detect.app({lookup: [
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
		it('app not installed', done => {
			st.detect.plugin({
				install: dir('sublime-text/dir1/Packages'),
				extensionId
			})
			.then(result => {
				done(new Error('Should fail'));
			}, err => {
				// must throw exception which means app does not exists
				assert.equal(err.code, 'ENOSUBLIMETEXT');
				done()
			});
		});

		it('exists (unpacked)', done => {
			st.detect.plugin({
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
			st.detect.plugin({
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

		it('not exists', done => {
			st.detect.plugin({
				install: dir('sublime-text/dir4/Packages'),
				extensionId
			})
			.then(result => {
				assert.equal(result, false);
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

			st.install(app)
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

			st.install(app)
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

	describe('update', () => {
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

			st.install(app)
			.then(() => {
				let updater = st.autoupdate(app);
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

			st.install(app)
			.then(() => st.autoupdate(app).check())
			.then(result => done(new Error('Should fail')))
			.catch(err => done());
		});

		it('periodic check', function(done) {
			let app = {
				downloadUrl: `${host}/plugin.zip`,
				commitUrl: `${host}/commit.json`,
				install: dir('sublime-text/out/install-auto-update')
			};
			let out = p => path.resolve(app.install, p);
			let checks = 0;
			this.timeout(6000);

			st.install(app)
			.then(() => {
				// update autoupdate file after some time to trigger update
				setTimeout(() => {
					fs.writeFileSync(out('Livestyle/autoupdate.json'), '{"sha":"foo"}');
				}, 5000);

				return st.autoupdate(app)
				.on('checkForUpdate', () => checks++)
				.on('shouldUpdate', function() {
					this.stop();
					assert(checks > 3 && checks < 10);
					done();
				})
				.start(1);
			})
			.catch(done);
		});
	});

	describe('UI status', () => {
		let noApp = () => ({error: 'No app installed', errorCode: 'ENOSUBLIMETEXT'});
		let check = (st2, st3) => status({st2, st3});
		
		it('no ST2, no ST3', () => {
			let s = check(noApp(), noApp());
			assert.equal(s.state, 'error');
			assert.equal(s.value.errorCode, 'ENOSUBLIMETEXT');
		});

		it('ST2, no ST3', () => {
			let s = check('not-installed', noApp());
			assert.equal(s.state, 'not-installed');
			assert.deepEqual(s.missing, ['st2']);
		});

		it('no ST2, ST3', () => {
			let s = check(noApp(), 'installed');
			assert.equal(s.state, 'installed');
			assert.equal(s.missing, undefined);
		});

		it('ST2 not installed, ST3 not installed', () => {
			let s = check('not-installed', 'not-installed');
			assert.equal(s.state, 'not-installed');
			assert.deepEqual(s.missing, ['st2', 'st3']);
		});

		it('ST2 installed, ST3 not installed', () => {
			let s = check('installed', 'not-installed');
			assert.equal(s.state, 'partially-installed');
			assert.deepEqual(s.missing, ['st3']);
		});

		it('ST2 not installed, ST3 installed', () => {
			let s = check('not-installed', 'installed');
			assert.equal(s.state, 'partially-installed');
			assert.deepEqual(s.missing, ['st2']);
		});

		it('ST2 installed, ST3 installed', () => {
			let s = check('installed', 'installed');
			assert.equal(s.state, 'installed');
			assert.deepEqual(s.missing, undefined);
		});

		it('ST2 installed, ST3 progress', () => {
			let s = check('installed', 'progress');
			assert.equal(s.state, 'progress');
			assert.deepEqual(s.missing, undefined);
		});

		it('ST2 progress, ST3 installed', () => {
			let s = check('progress', 'installed');
			assert.equal(s.state, 'progress');
			assert.deepEqual(s.missing, undefined);
		});

		it('ST2 progress, ST3 not-installed', () => {
			let s = check('progress', 'not-installed');
			assert.equal(s.state, 'partially-installed');
			assert.deepEqual(s.missing, ['st3']);
		});
	});
});
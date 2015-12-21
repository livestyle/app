'use strict';

const path = require('path');
const http = require('http');
const assert = require('assert');
const connect = require('connect');
const serveStatic = require('serve-static');
const download = require('../lib/helpers/download');

describe('Downloader', () => {
	const port = 8888;
	const host = `http://localhost:${port}`;
	var server;
	before(done => {
		let dir = path.resolve(__dirname, 'static');
		let app = connect()
		.use((req, res, next) => {
			server.emit('requested', req.url);
			next();
		})
		.use('/redirect.html', (req, res, next) => {
			res.writeHead(302, {location: `${host}/index.html`});
			res.end();
		})
		.use('/recursive', (req, res, next) => {
			res.writeHead(302, {location: `${host}/recursive`});
			res.end();
		})
		.use(serveStatic(dir));

		server = http.createServer(app);
		server.listen(port, done);
	});

	after(done => server.close(done));

	it('download file', done => {
		let requests = [];
		let reqHandler = file => requests.push(file);
		server.on('requested', reqHandler);

		download(`${host}/index.html`)
		.then(file => {
			assert(file);
			assert.deepEqual(requests, ['/index.html']);
			server.removeListener('requested', reqHandler);
			done();
		})
		.catch(done);
	});

	it('follow redirect', done => {
		let requests = [];
		let reqHandler = file => requests.push(file);
		server.on('requested', reqHandler);

		download(`${host}/redirect.html`)
		.then(file => {
			assert(file);
			assert.deepEqual(requests, ['/redirect.html', '/index.html']);
			done();
		})
		.catch(done);
	});

	it('not found', done => {
		download(`${host}/not-found`)
		.then(file => done(new Error('Should fail')))
		.catch(err => {
			assert.equal(err.code, 'EUNKNOWNRESPONSE');
			done();
		});
	});

	it('recursive redirect', done => {
		let requests = [];
		let reqHandler = file => requests.push(file);
		server.on('requested', reqHandler);

		download(`${host}/recursive`)
		.then(file => done(new Error('Should fail')))
		.catch(err => {
			assert.equal(err.code, 'EMAXATTEMPTS');
			assert(requests.length > 2);
			done();
		});
	});
});
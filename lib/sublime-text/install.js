/**
 * Installer script for Sublime Text plugin.
 * Scenario:
 * 1. Download zip from url in `downloadUrl` property of app object
 * 2. Unpack downloaded zip into temp dir
 * 3. If `commitUrl` in app object exists, download latest commit SHA
 *    form this url and save it as `autoupdate.json` file with updacked plugin
 * 4. Move downloaded package into LiveStyle folder in `install` property of app
 */
'use strict';

const fs = require('graceful-fs');
const path = require('path');
const http = require('http');
const https = require('https');
const mv = require('mv');
const rimraf = require('rimraf');
const debug = require('debug')('lsapp:sublime-text:install');
const download = require('../helpers/download');
const unzip = require('../helpers/unzip');
const request = require('../helpers/request');
const utils = require('../node-utils');

module.exports = function(app) {
	return download(app.downloadUrl)
	.then(unzip)
	.then(dest => setupAutoupdate(app, dest).then(() => dest))
	.then(dest => moveToApp(app, dest));
};

function setupAutoupdate(app, dest) {
	if (!app.commitUrl) {
		debug('no "commitUrl" property in app, skip autoupdate setup');
		return Promise.resolve();
	}

	return request(app.commitUrl)
	.then(data => {
		data = JSON.parse(data);
		debug('latest sha: %s', data.sha);
		if (!data.sha) {
			debug('no sha in received payload');
			return null;
		}

		return writeFile(path.join(dest, 'autoupdate.json'), JSON.stringify({
			sha: data.sha,
			created: new Date()
		}));
	})
	.catch(err => {
		console.warn('Unable to setup autoupdate', err);
		console.warn(err.stack);
	});
}

function moveToApp(app, from) {
	let to = path.join(utils.expandUser(app.install), 'LiveStyle');
	debug('moving contents of %s into %s', from, to);
	return new Promise((resolve, reject) => {
		rimraf(to, err => {
			if (err) {
				return reject(err);
			}
			mv(from, to, {mkdirp: true}, err => err ? reject(err) : resolve(to));
		});
	});
}

function writeFile(filePath, contents) {
	return new Promise((resolve, reject) => {
		fs.writeFile(filePath, contents, err => err ? reject(err) : resolve(filePath));
	});
}
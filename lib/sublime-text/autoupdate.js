/**
 * Setup autoupdate process for given Sublime Text app object
 */
'use strict';

const fs = require('graceful-fs');
const path = require('path');
const EventEmitter = require('events');
const debug = require('debug')('lsapp:sublime-text:autoupdate');
const request = require('../helpers/request');
const utils = require('../node-utils');

module.exports = function(app) {
	return new AutoUpdate(app);
};

class AutoUpdate extends EventEmitter {
	constructor(app) {
		super();
		this.app = app;
		this._running = false;
	}

	check() {
		let app = this.app;
		if (!app.commitUrl) {
			debug('Aborting auto-update check: no commitUrl in app');
			return Promise.reject(new Error('No commitUrl'));
		}

		debug('Check for auto-update');
		this.emit('checkForUpdate', app);
		let extensionPath = path.resolve(utils.expandUser(app.install), 'LiveStyle');
		return validateDir(extensionPath)
		.then(dir => {
			dir = path.resolve(dir, 'autoupdate.json');
			debug('check auto-update in %s', dir);
			return read(dir);
		})
		.then(local => {
			debug('check commit in %s', local);
			return request(app.commitUrl)
			.then(remote => JSON.parse(local).sha !== JSON.parse(remote).sha);
		})
		.then(shouldUpdate => {
			debug('should auto-update? %o', shouldUpdate);
			this.emit('checkForUpdateStatus', shouldUpdate, app);
			if (shouldUpdate) {
				this.emit('shouldUpdate', app);
			}
			return shouldUpdate;
		});
	}

	/**
	 * Starts auto-update polling
	 * @return
	 */
	start(seconds) {
		if (!this._running) {
			this._running = true;
			this._updateLoop(seconds * 1000);
		}
		return this;
	}

	stop() {
		if (this._timer) {
			clearTimeout(this._timer);
			this._timer = null
		}
		this._running = false;
		return this;
	}

	_updateLoop(timeout) {
		if (this._running) {
			this._timer = setTimeout(() => {
				this.check()
				.catch(err => true)
				.then(() => this._updateLoop(timeout));
			}, timeout).unref();
		}
	}
};

function read(file) {
	return new Promise((resolve, reject) => {
		fs.readFile(file, 'utf8', (err, contents) => err ? reject(err) : resolve(contents));
	});
}

function validateDir(dir) {
	// for sake of development, make sure extension path is not a symlink
	return new Promise((resolve, reject) => {
		fs.lstat(dir, (err, stat) => {
			if (stat && stat.isSymbolicLink()) {
				debug('skip auto-update: extension dir is a symlink')
				err = new Error('Extension dir is a symlink');
				err.code = 'ESYMLINKEXT';
			}
			err ? reject(err) : resolve(dir);
		});
	});
}
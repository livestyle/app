/**
 * Setup autoupdate process for given Sublime Text app object
 */
'use strict';

const fs = require('graceful-fs');
const path = require('path');
const EventEmitter = require('events');
const request = require('../helpers/request');

module.exports = function(app) {
	return new AutoUpdate(app);
};

class AutoUpdate extends EventEmitter {
	constructor(app) {
		super();
		this.app = app;
	}

	check() {
		let app = this.app;
		if (!app.commitUrl) {
			return Promise.reject(new Error('No commitUrl'));
		}

		return read(path.resolve(app.install, 'LiveStyle', 'autoupdate.json'))
		.then(local => {
			return request(app.commitUrl)
			.then(remote => JSON.parse(local).sha !== JSON.parse(remote).sha);
		})
		.then(shouldUpdate => {
			if (shouldUpdate) {
				this.emit('shouldUpdate', this.app);
			}
			return shouldUpdate;
		});
	}

	/**
	 * Starts auto-update polling
	 * @return
	 */
	start(seconds) {
		this._timer = setInterval(() => this.check(), seconds * 1000);
		this._timer.unref();
	}

	stop() {
		if (this._timer) {
			clearInterval(this._timer);
			this._timer = null
		}
	}
};

function read(file) {
	return new Promise((resolve, reject) => {
		fs.readFile(file, 'utf8', (err, contents) => err ? reject(err) : resolve(contents));
	});
}
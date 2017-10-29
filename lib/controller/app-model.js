/**
 * A model instance that represents current application state: installed plugins
 * and active Remote View sessions
 */
'use strict';

const debug = require('debug')('lsapp:app-model');
const appsDfn = require('../apps');
const googleChrome = require('../google-chrome');
const sublimeText = require('../sublime-text');

module.exports = function(model, client) {
	model.on('change', () => client.send('app-model', model.toJSON()));

	var apps = {
		st2: setupApp(appsDfn.st2, sublimeText, model, client),
		st3: setupApp(appsDfn.st3, sublimeText, model, client),
		chrome: setupApp(appsDfn.chrome, googleChrome, model, client)
	};

	Object.keys(apps).forEach(k => apps[k].detect());

	return {
		install(id) {
			return apps[id]
				? apps[id].install()
				: Promise.reject(new Error(`Unknown app ${id}`));
		},
		detect(id) {
			return apps[id]
				? apps[id].detect()
				: Promise.reject(new Error(`Unknown app ${id}`));
		}
	};
};

function setupApp(app, handler, model, client) {
	var attributeName = app.id;
	var installPromise = null;
	var autoupdater;

	if (handler.autoupdate) {
		autoupdater = handler.autoupdate(app)
		.on('shouldUpdate', app => install('updating'))
		.start(60 * 60); // check every hour
	}

	var detect = pollFactory(model, attributeName, () => {
		return handler.detect(app, client)
		.then(result => {
			if (result && autoupdater) {
				debug('%s plugin installed, check for updates', app.id);
				autoupdater.check();
			}
			return result;
		});
	});

	var install = (state) => {
		if (installPromise) {
			return installPromise;
		}

		model.set(attributeName, state || 'installing');
		return installPromise = handler.install(app)
		.then(() => {
			installPromise = null;
			detect(model.unset(attributeName))
		})
		.catch(err => {
			debug(err);
			installPromise = null;
			model.set(attributeName, createError(err));
			return Promise.reject(err);
		});
	};

	return {detect, install, autoupdater};
}

function pollFactory(model, attributeName, detectFn) {
	var timerId = null;
	return function poll() {
		if (timerId) {
			clearTimeout(timerId);
			timerId = null;
		}

		debug('polling install status for %s', attributeName);
		detectFn()
		.then(result => {
			model.set(attributeName, result ? 'installed' : 'not-installed');
			timerId = null;
		})
		.catch(err => {
			model.set(attributeName, !err ? 'not-installed' : {
				error: err.message,
				errorCode: err.code
			});
			timerId = setTimeout(poll, 5000).unref();
		});
	};
}

function createError(err) {
	var data = {error: err.message};
	if (err.code) {
		data.errorCode = err.code;
	}
	return data;
}

if (require.main === module) {
	let pkg = require('../../package.json');
	require('../client')(pkg.config.websocketUrl, function(err, client) {
		if (err) {
			return debug(err);
		}
		module.exports(client).on('change', () => console.log(this.attributes));
	});
}

/**
 * A model instance that represents current application state: installed plugins
 * and active Remote View sessions
 */
'use strict';

var debug = require('debug')('lsapp:app-model');
var tunnelController = require('./tunnel');
var Model = require('../model');
var googleChrome = require('../google-chrome');
var sublimeText = require('../sublime-text');

module.exports = function(model, client) {
	tunnelController.on('update', sessions => model.set('rvSessions', sessions));

	var pollChromeStatus = pollFactory(model, 'chromePlugin', googleChrome.detect);
	var pollSublimeTextStatus = pollFactory(model, 'sublimeTextPlugin', sublimeText.detect);

	pollChromeStatus(client);
	pollSublimeTextStatus(client);

	model.on('change', () => client.send('app-model', model.toJSON()));

	// supress 'error' event since in Node.js, in most cases,
	// it means unhandled exception
	client.on('error', err => console.error(err));

	return {
		model,
		client,
		installChrome() {
			return googleChrome.install().catch(err => {
				debug(err);
				model.set('chromePlugin', createError(err));
				return Promise.reject(err);
			});
		},
		installSublimeText(versions) {
			versions = versions ? versions.split(',') : ['st2', 'st3'];
			debug('install versions: %o', versions);
			return sublimeText.install(versions)
			.then(() => {
				// when installed, reset current plugin state and run plugin check again
				model.unset('sublimeTextPlugin');
				pollSublimeTextStatus(client);
			})
			.catch(err => {
				debug(err);
				model.set('sublimeTextPlugin', createError(err));
				return Promise.reject(err);
			});
		},
		checkPluginStatus(plugin) {
			if (plugin === 'chrome') {
				return pollChromeStatus(client);
			}

			if (plugin === 'st') {
				return pollSublimeTextStatus(client);
			}
		}
	};
};

function pollFactory(model, attributeName, detectFn) {
	var timerId = null;
	return function poll(client) {
		if (timerId) {
			clearTimeout(timerId);
			timerId = null;
		}

		debug('polling install status for %s', attributeName);
		detectFn(client).then(function(result) {
			model.set(attributeName, result);
			timerId = null;
		}, function(err) {
			var status = false;
			if (err) {
				status = {
					error: err.message,
					errorCode: err.code
				};
			}
			model.set(attributeName, status);
			timerId = setTimeout(poll, 5000, client);
			timerId.unref();
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
		module.exports(client).on('change', function() {
			console.log(this.attributes);
		});
	});
}
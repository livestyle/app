/**
 * A model instance that represents current application state: installed plugins
 * and active Remote View sessions
 */
'use strict';

var Model = require('../model');
var detectChrome = require('../detect/chrome');
var livestyleClient = require('../client');
var debug = require('debug')('lsapp:app-model');
var pkg = require('../../package.json');

var model = module.exports = new Model();

function pollChromePluginStatus(client) {
	detectChrome(client).then(function() {
		model.set('chromePluginInstalled', true);
	}, function(err) {
		var status = false;
		if (err) {
			status = {
				error: err.message,
				errorCode: err.code
			};
		}
		model.set('chromePluginInstalled', status);
		setTimeout(pollChromePluginStatus, 5000, client);
	});
}

livestyleClient(pkg.config.websocketUrl, function(err, client) {
	if (err) {
		return debug(err);
	}

	pollChromePluginStatus(client);
});


if (require.main === module) {
	// let charm = require('charm')(process);
	// charm.reset();

	let renderState = function() {
		// var dy = 1;
		// var line = function(msg) {
		// 	charm.position(1, dy++).write(msg);
		// };

		// charm.erase('screen').cursor(true);
		// Object.keys(model.attributes).forEach(function(key) {
		// 	line(`${key}: ${JSON.stringify(model.attributes[key])}`);
		// });
		// line('');
		console.log(model.attributes);
	};

	renderState();
	model.on('change', renderState);
}
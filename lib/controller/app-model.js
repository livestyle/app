/**
 * A model instance that represents current application state: installed plugins
 * and active Remote View sessions
 */
'use strict';

var debug = require('debug')('lsapp:app-model');
var Model = require('../model');
var tunnelController = require('./tunnel');

module.exports = function(client) {
	var model = new Model();
	tunnelController.on('update', function(sessions) {
		model.set('rvSessions', sessions);
	});
	var pollChromeStatus = pollFactory(model, 'chromePlugin', require('../detect/chrome'));
	var pollSublimeTextStatus = pollFactory(model, 'sublimeTextPlugin', require('../detect/sublime-text'));

	pollChromeStatus(client);
	pollSublimeTextStatus(client);
	return model;
};

function pollFactory(model, attributeName, detectFn) {
	return function poll(client) {
		detectFn(client).then(function(result) {
			model.set(attributeName, result);
		}, function(err) {
			var status = false;
			if (err) {
				status = {
					error: err.message,
					errorCode: err.code
				};
			}
			model.set(attributeName, status);
			setTimeout(poll, 5000, client);
		});	
	};
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
/**
 * Plugin installer script for Google Chrome
 */
'use strict';
var launcher = require('browser-launcher2');
var app = require('../apps.json').chrome;

module.exports = function() {
	// Chrome installer basically opens special web pages in Chrome
	// browser that guides user, no big deal
	return new Promise(function(resolve, reject) {
		launcher(function(err, launch) {
			if (err) {
				return reject(err);
			}

			launch(app.install, {
				browser: 'chrome',
				detached: true
			}, function(err, instance) {
				err ? reject(err) : resolve();
			});
		});
	});
};
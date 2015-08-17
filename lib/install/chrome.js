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

			// for all Chrome-based browsers reset `profile` option
			// because we need to install extension into default profile
			launch.browsers.forEach(function(browser) {
				if (browser.name.indexOf('chrom') !== -1) {
					browser.profile = null;
				}
			});

			launch(app.install, {
				browser: 'chrome',
				detached: true
			}, function(err, instance) {
				err ? reject(err) : resolve();
			});
		});
	});
};
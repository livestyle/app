/**
 * Plugin installer script for Google Chrome
 */
'use strict';
const cp       = require('child_process');
const launcher = require('browser-launcher2');

module.exports = function(app) {
	// Chrome installer basically opens special web pages in Chrome
	// browser that guides user, no big deal
	return new Promise(function(resolve, reject) {
		launcher(function(err, launch) {
			if (err) {
				return reject(err);
			}

			// for all Chrome-based browsers reset `profile` option
			// because we need to install extension into default profile
			var chrome, chromium, chromeLike;
			launch.browsers.forEach(function(browser) {
				if (browser.name.indexOf('chrom') !== -1) {
					browser.profile = null;
					chromeLike = browser;
					if (browser.name === 'chrome') {
						chrome = browser;
					} else if (browser.name === 'chromium') {
						chromium = browser;
					}
				}
			});

			if (process.platform === 'darwin') {
				launchOSX(chrome || chromium || chromeLike, app.install)
				.then(resolve, reject);
			} else {
				launch(app.install, {
					browser: 'chrome',
					detached: true
				}, function(err, instance) {
					err ? reject(err) : resolve();
				});
			}
		});
	});
};

/**
 * Current implementation of browser-launcher2 uses a set of commands
 * that prevent Chrome from opening given URL in default profile of
 * currently running Chrome process. This function fixes this issue
 * @param  {Object} browser
 * @param  {String} url
 */
function launchOSX(browser, url) {
	return new Promise((resolve, reject) => {
		cp.spawn('open', ['-a', browser.command, url], {detached: true})
		.on('error', reject)
		.on('close', code => {
			if (code) {
				var err = new Error(`Failed to open ${browser.command}, exit code of #${code}`);
				err.code = 'ECMDERR';
				err.exitCode = code;
				return reject(err);
			}
			resolve();
		});
	});
}
/**
 * GitHub Release auto-update module for OSX app.
 * Fetches most recent release from project repo.
 * Then it checks if there is a `RELEASES` asset exists. If so,
 * returns its parent foldder as auto-update feed URL.
 */
'use strict';

const path = require('path');
const ghRelease = require('./gh-release');

const feedFile = 'RELEASES';

module.exports = function(pkg) {
	return ghRelease.findUpdateRelease(pkg)
	.then(release => {
		var feed = release.assets[feedFile];
		if (!feed) {
			return ghRelease.warn(`No ${feedFile} asset in latest ${release.name} release`);
		}

		return path.dirname(feed.browser_download_url);
	});
};
/**
 * GitHub Release auto-update module.
 * Fetches all releases for current project repo and finds most recent one.
 * Then it checks if there is a `osx-auto-update.json` asset exists. If so,
 * returns it as auto-update feed URL.
 */
'use strict';

const semver = require('semver');
const ghRelease = require('./gh-release');
const debug = require('debug')('lsapp:autoupdate:darwin');

const feedFile = 'osx-auto-update.json';
const reVersion = /^v?(\d+\.\d+\.\d+)/;

module.exports = function(pkg) {
	return ghRelease.latest(pkg)
	.then(release => {
		// check if latest release is newer than current one
		let m = release.name.match(reVersion);
		if (!m) {
			return warn('Latest release does not contain valid semver tag');
		}

		// compare versions
		if (!semver.lt(pkg.version, m[1])) {
			return warn('Current package version is most recent');
		}

		var feed = assets(release)[feedFile];
		if (!feedFile) {
			return warn(`No ${feedFile} asset in latest ${asset.name} release`);
		}

		return feed.browser_download_url;
	});
};

function warn(message) {
	var err = new Error(message);
	err.code = 'EAUTOUPDATEWARN';
	return Promise.reject(err);
}

function assets(release) {
	return release.assets.reduce((r, asset) => {
		if (asset.state === 'uploaded') {
			r[asset.name] = asset;
		}
		return r;
	}, {});
}
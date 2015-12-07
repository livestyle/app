'use strict';

const autoUpdater = require('electron').autoUpdater;
const debug = require('debug')('lsapp:autoupdate');
var feedFetcher;
try {
	feedFetcher = require(`./${process.platform}`);
} catch(e) {};

const checkTimeout = 60 * 60 * 1000; // 1 hour

module.exports = function(pkg) {
	if (!feedFetcher) {
		return console.warn('No valid feed fetcher for current platform');
	}

	process.nextTick(() => check(pkg));
};

function check(pkg) {
	debug('Checking for updates...');
	return feedFetcher(pkg)
	.then(feedUrl => {
		debug('Update available, feed url: %s', feedUrl);
		autoUpdater.setFeedURL(feedUrl);
		autoUpdater.checkForUpdates();
	})
	.catch(err => {
		if (err) {
			if (err.code === 'EAUTOUPDATEWARN') {
				// a simple warning, try again later
				console.warn(err);
				setTimeout(() => check(pkg), checkTimeout).unref();
			} else {
				// looks like a fatal error, can’t recover
				console.error(err);
				return Promise.reject(err);
			}
		}
	});
}
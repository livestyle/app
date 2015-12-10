'use strict';

const semver = require('semver');
const parseUrl = require('url').parse;
const debug = require('debug')('lsapp:autoupdate:gh-release');
const request = require('request').defaults({
	json: true,
	headers: {
		accept: 'application/vnd.github.v3+json',
		'user-agent': 'GitHub Realease auto-updater for Electron'
	}
});

const reVersion = /^v?(\d+\.\d+\.\d+)/;

var latest = module.exports.latest = function(pkg) {
	return new Promise((resolve, reject) => {
		if (!pkg) {
			return reject(new Error('No package meta-data object is given'));
		}

		if (!pkg.repository || pkg.repository.type !== 'git' || isGitHubUrl(pkg.repository.url)) {
			return reject(new Error('No valid repository field in package data'));
		}

		var url = releaseApiEndpoint(pkg.repository.url, '/latest');
		debug('get latest release from %s', url);
		request(url, expectResponse(resolve, reject));
	});
};

var findUpdateRelease = module.exports.findUpdateRelease = function(pkg) {
	return latest(pkg)
	.then(release => {
		// check if latest release is newer than current one
		let m = release.tag_name.match(reVersion) || release.name.match(reVersion);
		if (!m) {
			return warn('Latest release does not contain valid semver tag');
		}

		// compare versions
		if (!semver.lt(pkg.version, m[1])) {
			return warn('Current package version is the most recent');
		}

		return Promise.resolve({
			name: release.name,
			assets: assets(release)
		});
	});
};

var warn = module.exports.warn = function(message) {
	var err = new Error(message);
	err.code = 'EAUTOUPDATEWARN';
	return Promise.reject(err);
}

function isGitHubUrl(url) {
	return parseUrl(url || '').hostname !== 'github.com';
}

function releaseApiEndpoint(repoUrl, suffix) {
	var url = parseUrl(repoUrl);
	var repo = url.pathname.replace(/^\/|\.git$/g, '');
	return `https://api.github.com/repos/${repo}/releases${suffix || ''}`;
}

function expectResponse(resolve, reject, code) {
	code = code || 200;
	return function(err, res, content) {
		if (!err && res.statusCode === code) {
			if (typeof content === 'string') {
				content = JSON.parse(content);
			}
			return resolve(content);
		}

		if (!err) {
			if (typeof content !== 'string') {
				content = JSON.stringify(content);
			}
			err = new Error('Unexpected response code: ' + res.statusCode + '\n\n' + content);
		}
		reject(err);
	};
}

function assets(release) {
	return release.assets.reduce((r, asset) => {
		if (asset.state === 'uploaded') {
			r[asset.name] = asset;
		}
		return r;
	}, {});
}
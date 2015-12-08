/**
 * A script for packing and publishing app
 */
'use strict';

var path = require('path');
var fs = require('fs');
var parseUrl = require('url').parse;
var distribute = require('./distribute');
var publish = require('./release');
var pkg = require('../package.json');

console.log('Packing and publishing app for %s platform (v%s)', process.platform, pkg.version);

var repo = parseUrl(pkg.repository.url).pathname.slice(1).replace(/\.git$/, '');
var release = 'v' + pkg.version;

distribute()
.then(autoUpdate)
.then(assets => {
	console.log('Created assets', assets);
	return publish({release, repo, assets});
})
.then(() => console.log('Published assets in %s release', release))
.catch(err => {
	console.error(err);
	process.exit(1);
});

function autoUpdate(assets) {
	if (process.platform !== 'darwin') {
		return Promise.resolve(assets);
	}

	// create file with auto-update
	if (!Array.isArray(assets)) {
		assets = [assets];
	}
	var reAppPackage = /\.zip$/;
	let appPackage = assets.reduce((prev, cur) => reAppPackage.test(cur) ? cur : prev, null);
	if (!appPackage) {
		return Promise.reject(new Error('No app package for OSX bundle, aborting'));
	}

	return new Promise((resolve, reject) => {
		var contents = JSON.stringify({
			url: `https://github.com/${repo}/releases/download/${release}/${path.basename(appPackage)}`
		});

		var updateFile = path.join(path.dirname(appPackage), 'osx-auto-update.json');
		fs.writeFile(updateFile, contents, err => {
			if (err) {
				return reject(err);
			}

			assets.push(updateFile);
			resolve(assets);
		});
	});
}
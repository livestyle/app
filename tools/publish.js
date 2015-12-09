/**
 * A script for packing and publishing app
 */
'use strict';

var path = require('path');
var fs = require('fs');
var bundle = require('./distribute');
var publish = require('./release');
var pkg = require('../package.json');

var repo = parseUrl(pkg.repository.url).pathname.slice(1).replace(/\.git$/, '');
var release = 'v' + pkg.version;

console.log('Packing and publishing app for %s platform (v%s)', process.platform, pkg.version);

bundle()
.then(assets => {
	console.log('Created assets', assets);
	return publish({release, repo, assets});
})
.then(() => console.log('Published assets in %s release', release))
.catch(err => {
	console.error(err);
	process.exit(1);
});
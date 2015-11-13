/**
 * A script for packing and publishing app
 */
'use strict';

var parseUrl = require('url').parse;
var distribute = require('./distribute');
var publish = require('./release');
var pkg = require('../package.json');

console.log('Packing and publishing app for %s platform (v%s)', process.platform, pkg.version);

var repo = parseUrl(pkg.repository.url).pathname.slice(1).replace(/\.git$/, '');
var release = 'v' + pkg.version;

distribute()
.then(assets => {
	console.log('Created assets', assets);
	return publish({release, repo, assets});
})
.then(() => console.log('Published asset in %s release', release))
.catch(err => {
	console.error(err);
	process.exit(1);
});
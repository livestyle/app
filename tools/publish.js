/**
 * A script for packing and publishing app
 */
'use strict';

var path = require('path');
var fs = require('fs');
var bundle = require('./distribute');
var publish = require('./release');
var info = require('./release-info');

console.log('Packing and publishing app for %s platform (v%s)', process.platform, info.release);

bundle()
.then(assets => {
	console.log('Created assets', assets);
	return publish({
		release: info.release, 
		repo: info.repo, 
		assets
	});
})
.then(() => console.log('Published assets in %s release', info.release))
.catch(err => {
	console.error(err);
	process.exit(1);
});
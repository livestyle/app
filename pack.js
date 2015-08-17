/**
 * Script for packing build artifact
 */
'use strict';
var fs = require('fs');
var path = require('path');
var yazl = require('yazl');
var glob = require('glob-all');
var pkg = require('./package.json');

const dest = 'ls-app.zip';
var files = [
	'{assets,lib,ui}/**',
	'{main,backend}.js',
	'index.html',
	'package.json',
	'node_modules/{' + Object.keys(pkg.dependencies) + '}/**'
];

glob(files, {nodir: true}, function(err, files) {
	if (err) {
		console.error(err);
		process.exit(1);
	}

	console.log('Files to pack: ', files.length);

	var cwd = process.cwd();
	var archive = new yazl.ZipFile();
	files.forEach(function(file) {
		archive.addFile(file, file.replace(/\\/g, '/'));
	});

	archive.outputStream
	.pipe(fs.createWriteStream(dest))
	.on('close', function() {
		console.log('Packaging done: ' + dest);
	});
	archive.end();
});
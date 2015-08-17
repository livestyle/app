/**
 * Script for packing build artifact
 */
'use strict';
var fs = require('fs');
var path = require('path');
var yazl = require('yazl');
var glob = require('glob');
var pkg = require('./package.json');

const dest = 'ls-app.zip';
var ignore = [
	'.*', 
	'appveyor.yml', 
	'*.zip',
	'*.md'
];
var reIgnore = new RegExp('^node_modules[\\/\\\\](?:' + Object.keys(pkg.devDependencies).join('|') + ')[\\/\\\\]');

glob('**', {ignore, nodir: true}, function(err, files) {
	if (err) {
		console.error(err);
		process.exit(1);
	}

	files = files.filter(function(file) {
		return !reIgnore.test(file);
	});

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
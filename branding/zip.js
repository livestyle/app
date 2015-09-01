/**
 * Packs app as ZIP archive
 */
'use strict';

var fs = require('fs');
var yazl = require('yazl');
var cmd = require('./cmd');

module.exports = function(app, dest) {
	var pack = process.platform === 'darwin' ? packOSX : packCommon;
	return prepare(app, dest)
	.then(function() {
		return pack(app, dest);
	});
};

function packOSX(app, dest) {
	// XXX I have to preserve symlinks in zip. Currently, I didn’t found
	// and Node.js zip module that supports symlinks in archive so I’m using
	// `ditto` command
	return new Promise(function(resolve, reject) {
		cmd('ditto', ['-ck', '--sequesterRsrc', '--keepParent', app.dir, dest], function(err) {
			err ? reject(err) : resolve(dest);
		});
	});
}

function packCommon(app, dest) {
	return new Promise(function(resolve, reject) {
		var cwd = path.dirname(app.dir);
		glob(['**'], {cwd, nodir: true}, function(err, files) {
			if (err) {
				return reject(err);
			}

			debug('files to pack: %d', files.length + symlinks.length);

			fs.unlink(dest, function() {
				var archive = new yazl.ZipFile();
				files.forEach(function(file) {
					var absPath = path.resolve(cwd, file);
					archive.addFile(absPath, file.replace(/\\/g, '/'));
				});

				archive.outputStream
				.pipe(fs.createWriteStream(dest))
				.on('close', function() {
					resolve(dest);
				});
				archive.end();
			});
		});
	});
}

function prepare(app, dest) {
	return new Promise(function(resolve, reject) {
		fs.unlink(dest, resolve);
	});
}
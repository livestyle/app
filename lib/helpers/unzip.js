/**
 * A promisified Unzip
 */
'use strict';

const fs     = require('graceful-fs');
const path   = require('path');
const unzip  = require('unzip');
const mkdirp = require('mkdirp');
const temp   = require('temp').track();
const debug  = require('debug')('lsapp:unzip');

module.exports = function(src, dest) {
	return checkDest(dest)
	.then(dest => unpack(src, dest))
	.then(checkResult);
};

function checkDest(dest) {
	if (dest) {
		return Promise.resolve(dest);
	}

	return new Promise((resolve, reject) => {
		temp.mkdir('lsapp-unzip', (err, dir) => err ? reject(err) : resolve(dir));
	});
}

function unpack(src, dest) {
	debug('unpacking %s into %s', src, dest);
	return new Promise(function(resolve, reject) {
		fs.createReadStream(src)
		.pipe(unzip.Parse())
		.on('entry', function(entry) {
			if (entry.type === 'Directory') {
				return entry.autodrain();
			}

			var filePath = path.join(dest, entry.path);
			mkdirp(path.dirname(filePath), err => {
				if (err) {
					entry.autodrain();
					return this.emit('error', err);
				}
				entry.pipe(fs.createWriteStream(filePath));
			});
		})
		.once('close', () => resolve(dest))
		.once('error', reject);
	});
}

/**
 * Reads result of unpacked data. If it contains just a single folder,
 * switch context into it
 * @param  {String} dest
 * @return {Promise}
 */
function checkResult(dest) {
	return new Promise((resolve, reject) => {
		let skipFiles = ['.DS_Store'];
		fs.readdir(dest, (err, items) => {
			if (err) {
				return reject(err);
			}

			items = items.filter(item => skipFiles.indexOf(item) === -1);
			debug('items found in result: %d', items.length);

			if (items.length !== 1) {
				return resolve(dest);
			}

			// got just one item, make sure it’s a directory
			let candidate = path.join(dest, items[0]);
			fs.stat(candidate, (err, stat) => {
				resolve(stat && stat.isDirectory() ? candidate : dest);
			});
		});
	});
}
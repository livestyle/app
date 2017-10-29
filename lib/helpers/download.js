/**
 * Returns a Promise that downloads given resource and stores it in
 * a temp folder. The Promise is resolved with path to downloaded
 * file in temp folder
 */
'use strict';

const http   = require('http');
const https  = require('https');
const temp   = require('temp').track();
const debug  = require('debug')('lsapp:download');

const defaultOptions = {
	attempt: 0,
	maxAttempts: 5
};

var download = module.exports = function(url, options) {
	options = Object.assign({}, defaultOptions, options);
	return new Promise(function(resolve, reject) {
		if (options.attempt >= options.maxAttempts) {
			return reject(error(`Failed to download ${url} in ${options.attempt} attempts`, 'EMAXATTEMPTS'));
		}

		debug('downloading %s, attempt %d', url, options.attempt);
		let transport = /^https:/.test(url) ? https : http;
		transport.get(url, function(res) {
			debug('response: %d', res.statusCode);
			if (res.statusCode === 200) {
				let dest = temp.createWriteStream();
				return res.pipe(dest)
				.once('finish', () => resolve(dest.path))
				.once('error', reject);
			}

			if (res.statusCode === 301 || res.statusCode === 302) {
				// redirect
				let location = res.headers.location;
				if (location) {
					let opt = Object.assign({}, options, {attempt: options.attempt + 1});
					return download(location, opt).then(resolve, reject);
				} else {
					return reject(error('Got redirect (' + res.statusCode + ') but no Location header', 'EINVALIDRESPONSE'));
				}
			}

			reject(error('Unknown response code: ' + res.statusCode, 'EUNKNOWNRESPONSE'));
		}).once('error', reject);
	});
};

function error(message, code) {
	var err = new Error(message);
	if (code) {
		err.code = code;
	}
	return err;
}

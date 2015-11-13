/**
 * Updates GitHub release with given file for given version
 */
'use strict';

var fs = require('fs');
var path = require('path');
var extend = require('xtend');
var debug = require('debug')('lsapp:release');
var mime = require('mime');
var request = require('request').defaults({
	json: true,
	headers: {
		accept: 'application/vnd.github.v3+json',
		authorization: 'token ' + process.env.PUBLISH_TOKEN,
		'user-agent': 'LiveStyle publisher bot'
	}
});

if (!process.env.PUBLISH_TOKEN) {
	throw new Error('No PUBLISH_TOKEN env variable');
}

module.exports = function(data) {
	if (!data.domain) {
		data = extend(data, {domain: 'https://api.github.com'});
	}

	return getReleases(data)
	.then(releases => {
		// Check if given release exists. If so, we should update it,
		// otherwise create new one
		var current = releases.reduce((prev, cur) => cur.name === data.release ? cur : prev, null);
		debug(current ? 'found release for %s' : 'no release for %s', data.release);
		return current ? Promise.resolve(current) : createRelease(data);
	})
	.then(release => {
		// create an assets upload pipeline: check if asset with given name exists;
		// if so, delete it first, then upload a new version
		var assetsToUpload = data.assets || [];
		if (!Array.isArray(assetsToUpload)) {
			assetsToUpload = [assetsToUpload];
		}

		var existingAssets = (release.assets || []).reduce((result, asset) => {
			result[asset.name] = asset;
			return result;
		}, {});

		var pipeline = Promise.resolve('aaa');
		assetsToUpload.forEach(function(asset) {
			var ex = existingAssets[path.basename(asset)];
			if (ex) {
				pipeline = pipeline.then(() => deleteAsset(data, ex.id));
			}
			pipeline = pipeline.then(() => uploadAsset(release, asset));
		});
		return pipeline;
	});
};


/**
 * Fetches all available releases for given repo
 * @param  {String} repo Path to repo
 * @return {Promise}
 */
function getReleases(data) {
	return new Promise(function(resolve, reject) {
		var url = `${data.domain}/repos/${data.repo}/releases`;
		debug('fetching releases from %s', url);
		request(url, expectResponse(resolve, reject));
	});
}

/**
 * Creates new release for given payload
 * @param  {Object} data
 * @return {Promise}
 */
function createRelease(data) {
	debug('creating release %s', data.release);
	return new Promise(function(resolve, reject) {
		request.post(`${data.domain}/repos/${data.repo}/releases`, {body: {
			tag_name: data.release,
			target_commitish: data.target || 'master',
			name: data.release
		}}, expectResponse(resolve, reject, 201));
	});
}

function uploadAsset(release, asset) {
	return new Promise(function(resolve, reject) {
		debug('uploading asset %s for release %s', asset, release.name);
		var stat = fs.statSync(asset);
		var fileName = path.basename(asset);
		var uploadUrl = release.upload_url.split('{')[0] + '?name=' + fileName;
		
		fs.createReadStream(asset)
		.pipe(request.post(uploadUrl, {
			headers: {
				'Content-Type': mime.lookup(fileName),
				'Content-Length': stat.size,
			}
		}))
		.on('error', reject)
		.on('end', resolve);
	});
}

function deleteAsset(data, assetId) {
	return new Promise(function(resolve, reject) {
		debug('removing asset %s', assetId);
		request.del(
			`${data.domain}/repos/${data.repo}/releases/assets/${assetId}`, 
			expectResponse(resolve, reject, 204)
		);
	});
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
			err = new Error(`Unexpected response code: ${res.statusCode}\n\n${content}`);
		}
		reject(err);
	};
}

if (require.main === module) {
	var app = {
		repo: 'livestyle/app',
		release: 'sample',
		assets: path.resolve(__dirname, '../livestyle-osx.zip')
	};

	module.exports(app).then(function() {
		console.log('Done!');
	}, function(err) {
		console.error(err.stack ? err.stack : err);
		process.exit(1);
	});
}
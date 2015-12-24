'use strict';

const http = require('http');
const https = require('https');
const parseUrl = require('url').parse;

module.exports = function(url) {
	return new Promise((resolve, reject) => {
		let transport = /^https:/.test(url) ? https : http;
		let payload = parseUrl(url);
		payload.headers = {
			'User-Agent': 'LiveStyle app'
		};

		transport.get(payload, res => {
			let data = [];
			res
			.on('data', chunk => data.push(chunk))
			.on('end', () => resolve(Buffer.concat(data).toString()))
			.on('error', reject);
		})
		.on('error', reject);
	});
}
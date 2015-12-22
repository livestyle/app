'use strict';

const http  = require('http');
const https = require('https');

module.exports = function(url) {
	return new Promise((resolve, reject) => {
		let transport = /^https:/.test(url) ? https : http;
		transport.get(url, res => {
			let data = [];
			res
			.on('data', chunk => data.push(chunk))
			.on('end', () => resolve(Buffer.concat(data).toString()))
			.on('error', reject);
		})
		.on('error', reject);
	});
}
'use strict';

const request = require('request')
const pkg = require('../package.json');

module.exports = request.defaults({
	json: true,
	headers: {
		'user-agent': `LiveStyle app/${pkg.version}`
	}
});

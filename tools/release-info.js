'use strict';

var pkg = require('../package.json');
var parseUrl = require('url').parse;

module.exports = {
	repo: parseUrl(pkg.repository.url).pathname.slice(1).replace(/\.git$/, ''),
	release: 'v' + pkg.version
};
/**
 * Module for working with Google Chrome plugin
 */
'use strict';

const app     = require('../apps.json').chrome;
const detect  = require('./detect');
const install = require('./install');

module.exports = {
	detect(client) {
		return detect(app, client);
	},
	install() {
		return install(app);
	}
};
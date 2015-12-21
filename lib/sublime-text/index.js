/**
 * Module for working with Sublime Text plugin
 */
'use strict';
const extend  = require('xtend');
const detect  = require('./detect');
const install = require('./install');
const apps    = require('../apps.json');

module.exports = {
	detect(client) {
		/**
		 * Sublime Text detection strategy:
		 * 1. Find all installed versions of Sublime Text
		 * 2. Check if all installed apps contain LiveStyle plugin. This resolves
		 * to an object whose key is editor id and value is plugin installation status
		 */
		var payload = [
			extend(apps.st3, {id: 'st3'}), 
			extend(apps.st2, {id: 'st2'})
		];

		return Promise.all(payload.map(app => detect(app)))
		.then(values => payload.reduce((result, p, i) => {
			result[p.id] = values[i];
			return result;
		}));
	},
	install: require('./install')
};
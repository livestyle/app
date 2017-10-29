/**
 * A dedicated module for resolving status of Sublime Text plugin.
 * The problem with ST plugin UI is that it must render status
 * for two plugins (two versions of Sumlime Text).
 *
 * Extracted as separate module for unit testing
 */
'use strict';

const pluginStatus = require('./plugin-status');

module.exports = function(model) {
	var st2 = pluginStatus(model.st2);
	var st3 = pluginStatus(model.st3);
	var is = state => (st2.state === state) ? st2 : (st3.state === state) && st3;

	if (is('error')) {
		let errState = is('error');
		// if either ST2 or ST3 is not installed, return state of installed app
		if (errState.value.errorCode === 'ENOSUBLIMETEXT' && st2.state !== st3.state) {
			let result = errState === st2 ? st3 : st2;
			if (result.state === 'not-installed') {
				result = Object.assign({}, result, {missing: [result === st2 ? 'st2' : 'st3']});
			}
			return result;
		}

		return errState;
	}

	if (is('not-installed')) {
		// both plugins are not installed
		if (st2.state === st3.state) {
			return Object.assign({}, st2, {missing: ['st2', 'st3']});
		}

		// one of the plugins is not installed
		return {
			state: 'partially-installed',
			message: '',
			progressMessage: '',
			missing: [is('not-installed') === st2 ? 'st2' : 'st3']
		};
	}

	return is('progress') || st3 || st2;
};

module.exports.update = pluginStatus.update;

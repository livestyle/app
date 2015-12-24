/**
 * A helper module for resolving given plugin state
 */
'use strict';

const messages = {
	'not-installed': '',
	'installed': 'Installed'
};

module.exports = function(value) {
	var state = value || 'progress';
	var message = '';
	var progressMessage = 'Checking status';

	if (isError(value)) {
		state = 'error';
		message =  value.error;
	}

	if (state in messages) {
		message = messages[state];
	}

	if (state === 'updating') {
		state = 'progress';
		progressMessage = 'Updating plugin';
	}

	if (state === 'installing') {
		state = 'progress';
		progressMessage = 'Installing plugin';
	}

	return {state, message, progressMessage, value};
};

module.exports.update = function(ctx, status) {
	if (typeof status !== 'object' || isError(status)) {
		status = module.exports(status);
	}

	ctx.dataset.extensionState = status.state;
	ctx.querySelector('.extension-message').innerHTML = status.message;
	ctx.querySelector('.extension-progress__message').innerHTML = status.progressMessage;
}

function isError(value) {
	return typeof value === 'object' && 'error' in value;
}
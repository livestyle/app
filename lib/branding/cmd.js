/**
 * Runs given command in terminal
 */
'use strict';

var cp = require('child_process');
var EventEmitter = require('events');

module.exports = function(command, args, options, callback) {
	var process;
	var stderr = '';
	var stdout = '';
	var ev = new EventEmitter();

	if (typeof args === 'function') {
		callback = args;
		args = [];
		options = {};
	}

	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	if (typeof args === 'object' && !Array.isArray(args)) {
		options = args;
		args = [];
	}

	// Buffer output, reporting progress
	process = cp.spawn(command, args, options);
	process.stdout.on('data', function (data) {
		data = data.toString();
		ev.emit('stdout', data);
		ev.emit('data', data, 'stdout');
		stdout += data;
	});
	process.stderr.on('data', function (data) {
		data = data.toString();
		ev.emit('stderr', data);
		ev.emit('data', data, 'stderr');
		stderr += data;
	});

	// If there is an error spawning the command, return error
	process.on('error', function (error) {
		return callback(error);
	});

	// Listen to the close event instead of exit
	// They are similar but close ensures that streams are flushed
	process.on('close', function (code) {
		var fullCommand;
		var error;

		if (code) {
			// Generate the full command to be presented in the error message
			if (!Array.isArray(args)) {
				args = [];
			}

			fullCommand = command;
			fullCommand += args.length ? ' ' + args.join(' ') : '';

			// Build the error instance
			var error = new Error('Failed to execute "' + fullCommand + '", exit code of #' + code);
			error.code = 'ECMDERR';
			error.details = stderr;
			error.exitCode = code;
			return callback(error);
		}

		return callback(null, stdout, stderr);
	});

	return ev;
}
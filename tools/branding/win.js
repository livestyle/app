'use strict';

var fs = require('graceful-fs');
var path = require('path');
var rcedit = require('rcedit');
var extend = require('xtend');
var debug = require('debug')('lsapp:distribute:win');
var installer = require('electron-installer-squirrel-windows');
var pkg = require('../../package.json');

const EXE = 'electron.exe';

module.exports = function(app) {
	return editResources(app)
	.then(renameExecutable)
	.then(createInstaller)
	.then(getAssets);
};

function editResources(app) {
	debug('edit app resources');
	return new Promise(function(resolve, reject) {
		debug('set icon %s', app.icon);
		var opt = {
			'version-string': {
				'ProductName': app.productName,
				'CompanyName': app.companyName,
				'FileDescription': app.description,
				'LegalCopyright': app.copyright,
				'OriginalFilename': app.name.toLowerCase() + '.exe'
			},
			'icon': app.icon,
			'file-version': app.version,
			'product-version': app.version
		};

		rcedit(path.join(app.dir, EXE), opt, function(err) {
			err ? reject(err) : resolve(app);
		});
	});
}

function renameExecutable(app) {
	debug('rename executable');
	return new Promise(function(resolve, reject) {
		var newName = app.name.toLowerCase() + path.extname(EXE);
		fs.rename(path.join(app.dir, EXE), path.join(app.dir, newName), function(err) {
			err ? reject(err) : resolve(app);
		});
	});
}

function createInstaller(app) {
	return new Promise((resolve, reject) => {
		var out = path.join(path.dirname(app.dir), 'installer');
		installer({
			name: app.name,
			product_name: app.productName,
			path: app.dir,
			authors: pkg.author,
			loading_gif: makePath('resources/install-spinner.gif'),
			setup_icon: makePath('icon/livestyle.ico'),
			exe: 'livestyle.exe',
			out,
			cert_path: makePath('../windows/livestyle.pfx'),
			cert_password: process.env.WIN_CERTIFICATE_PASSWORD,
			overwrite: true
		}, err => {
			if (err) {
				return reject(err);
			}

			resolve(extend(app, {dir: out}));
		});
	});
}

function makePath(fileName) {
	return path.resolve(__dirname, fileName);
}

function getAssets(app) {
	return new Promise((resolve, reject) => {
		fs.readdir(app.dir, (err, files) => {
			if (err) {
				return reject(err)
			}

			resolve(files.map(file => path.resolve(app.dir, file)));
		});
	});
}
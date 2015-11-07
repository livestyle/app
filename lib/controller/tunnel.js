/**
 * Remote View tunnel controller: manages all Remote View sessions and tunnel
 * connections
 */
'use strict';

var EventEmitter = require('events');
var extend = require('xtend');
var debug = require('debug')('lsapp:tunnel');
var TunnelCluster = require('remote-view-client').TunnelCluster;
var fileServer = require('../file-server');
var utils = require('../utils');

class TunnelClusterController extends EventEmitter {
	constructor() {
		super();
		this.clusters = [];

		var self = this;
		this._onClusterDestroy = function(err) {
			utils.removeFromArray(self.clusters, this);
			this.removeListener('error', self._onClusterError);
			this.removeListener('state', self._onClusterStateChange);
			self.emit('clusterDestroy', this, err);
			self._emitUpdate();
		};

		this._onClusterStateChange = function(state) {
			self.emit('clusterState', this, state);
			self._emitUpdate();
		};

		this._onClusterError = function(err) {
			self.emit('clusterError', this, err);
		};

		this._emitUpdate = utils.throttle(function() {
			self.emit('update', self.list());
		}, 20, {leading: false});
	}

	/**
	 * Returns JSON list of available clusters
	 * @return {Object}
	 */
	list() {
		return this.clusters.map(clusterJSON);
	}

	/**
	 * Creates new tunnel cluster with given Remote View session data
	 * @param  {Object} data Remote View session data
	 * @return {Promise}
	 */
	create(data) {
		return prepare(data).then(data => {
			var server = data._server;
			delete data._server;

			var cluster = new TunnelCluster(data)
			.once('state', this._onClusterStateChange)
			.once('error', this._onClusterError)
			.once('destroy', this._onClusterDestroy);

			if (server) {
				cluster._server = server;
				cluster.once('destroy', () => {
					var addr = server.address();
					debug('closing local file server %s', `http://${addr.address}:${addr.port}`);
					server.close();
					cluster._server = server = null;
				});
			}

			this.clusters.push(cluster);
			this.emit('clusterCreate', cluster);
			this._emitUpdate();
			return cluster;
		});
	}

	/**
	 * Closes session for given cluster
	 * @param  {TunnelCluster|String} cluster Cluster or cluster ID to close
	 * @return {TunnelCluster}
	 */
	close(cluster) {
		if (typeof cluster === 'string') {
			cluster = this.getById(cluster);
		}

		cluster && cluster.destroy();
		return cluster;
	}

	/**
	 * Closes all Remote View sessions
	 */
	closeAll() {
		for (var i = this.clusters.length - 1; i >= 0; i--) {
			this.close(this.clusters[i]);
		}
	}

	/**
	 * Returns cluster for given public id
	 * @param  {String} id Remote View session public id
	 * @return {TunnelCluster}
	 */
	getById(id) {
		for (var i = 0, il = this.clusters.length; i < il; i++) {
			if (this.clusters[i].options.publicId === id) {
				return this.clusters[i];
			}
		}
	}
};

module.exports = new TunnelClusterController();
module.exports.TunnelClusterController = TunnelClusterController;

function clusterJSON(cluster) {
	return {
		sessionId: cluster.options.sessionId,
		publicId: cluster.options.publicId,
		localSite: cluster.options.localSite,
		state: cluster.state
	};
}

/**
 * Performs pre-flight checks before creating a new tunnel cluster.
 * Creates local HTTP server for given payload, if required. Used for Remote View
 * sessions with `file:` protocol origins.
 * @param  {Object} data
 * @return {Promise}
 */
function prepare(data) {
	var origin = data.localSite;
	debug('validating %s', origin);
	if (/^https?:/.test(origin)) {
		return Promise.resolve(data);
	}

	if (/^file:/.test(origin)) {
		debug('should create local file server');
		return fileServer(origin).then(server => {
			var addr = server.address();
			var localSite = `http://${addr.address}:${addr.port}`;
			debug('created local file server %s for %s', localSite, origin);
			return extend(data, {localSite, _server: server});
		});
	}

	return Promise.reject(new Error('Unsupported origin: ' + origin));
}
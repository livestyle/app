/**
 * Remote View tunnel controller: manages all Remote View sessions and tunnel
 * connections
 */
'use strict';

var EventEmitter = require('events');
var debug = require('debug')('lsapp:tunnel');
var TunnelCluster = require('remote-view-client').TunnelCluster;
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
		var cluster = new TunnelCluster(data)
		.once('state', this._onClusterStateChange)
		.once('error', this._onClusterError)
		.once('destroy', this._onClusterDestroy);

		this.clusters.push(cluster);
		this.emit('clusterCreate', cluster);
		this._emitUpdate();
		return cluster;
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
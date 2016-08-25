/**
 * Remote View tunnel controller: manages all Remote View sessions and tunnel
 * connections
 */
'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const debug = require('debug')('lsapp:tunnel');
const TunnelCluster = require('remote-view-client').TunnelCluster;
const fileServer = require('../file-server');
const throttle = require('../utils').throttle;
const request = require('../request');

module.exports = class TunnelClusterController extends EventEmitter {
	constructor(options) {
		super();

		assert(options.remoteSessionUrl, '"remoteSessionUrl" option is not provided');

		this.options = options;
		this.clusters = new Set();

		var self = this;
		this._onClusterDestroy = function(err) {
			debug('cluster destroyed with error %o', err);
			self.clusters.delete(this);
			this.removeListener('error', self._onClusterError);
			this.removeListener('state', self._onClusterStateChange);
			self.emit('clusterDestroy', this, err);
			fileServer.destroy(this.options.origin || this.options.localSite);
			self._emitUpdate();
		};

		this._onClusterStateChange = function(state) {
			debug('cluster changed state to %s', state);
			self.emit('clusterState', this, state);
			self._emitUpdate();
		};

		this._onClusterError = function(err) {
			self.emit('clusterError', this, err);
		};

		this._emitUpdate = throttle(() => this.emit('update', this.list()), 20, {leading: false});
	}

	/**
	 * Returns JSON list of available clusters
	 * @return {Object}
	 */
	list() {
		return Array.from(this.clusters).map(clusterJSON);
	}

	/**
	 * Creates Remote View connection and tunnel cluster for given payload
	 * @param {Object} payload
	 * @return {Promise}
	 */
	connect(payload) {
		payload = payload || {};
		if (!payload.origin) {
			return error('ERVASSERT', 'No "origin" field in session payload');
		}

		return createHTTPServerIfRequired(payload.origin)
		.then(localSite => this.createRemoteSession(Object.assign({}, payload, {localSite})))
		.then(data => this.create(data));
	}

	/**
	 * Creates Remote View session with remote endpoint for given payload
	 * @param {Object}
	 * @return {Promise}
	 */
	createRemoteSession(payload) {
	    if (!payload.authorization) {
	        return error('ERVNOAUTH', 'No authorization header in payload');
	    }

		return new Promise((resolve, reject) => {
			return request.post(this.options.remoteSessionUrl, {
				headers: {
					Authorization: payload.authorization
				},
				body: {
					localSite: payload.localSite
				}
			}, (err, resp, body) => {
				if (err || body.error) {
					return reject(err || createError('ERVRESPONSE', body.error.message));
				}

				resolve(Object.assign({}, payload, body));
			});
		});
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

		this.clusters.add(cluster);
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
		this.clusters.forEach(cluster => this.close(cluster));
	}

	/**
	 * Returns cluster for given public id
	 * @param  {String} id Remote View session public id
	 * @return {TunnelCluster}
	 */
	getById(id) {
		for (let cluster of this.clusters) {
			if (cluster.options.publicId === id) {
				return cluster;
			}
		}
	}
};

function clusterJSON(cluster) {
	return {
		sessionId: cluster.options.sessionId,
		publicId: cluster.options.publicId,
		origin: cluster.options.origin,
		localSite: cluster.options.localSite,
		state: cluster.state
	};
}

function createHTTPServerIfRequired(origin) {
	if (!/^file:/.test(origin)) {
		return Promise.resolve(origin);
	}

	debug('Create local HTTP server for %s', origin);
	return fileServer(origin).then(server => server.host);
}

function error(code, message) {
    return Promise.reject(createError(code, message));
}

function createError(code, message) {
	var err = new Error(message || code);
    err.code = code;
	return err;
}

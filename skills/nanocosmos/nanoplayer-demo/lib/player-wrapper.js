/* nanoplayer-demo wrapper example: NanoDemo.SwitchPlayer.
 *
 * Presents nanoPlayer as a "switch player": load a list of streams, switch
 * between them in place with updateSource() (no teardown, no black frame).
 * Copy this file as the starting point for any feature wrapper; see
 * references/wrapper-pattern.md for the contract.
 *
 * Classic script. Load after js/demo-core.js. Browser: NanoDemo.SwitchPlayer.
 * Node (tests): module.exports.SwitchPlayer.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./demo-core.js')); }
  else { root.NanoDemo.SwitchPlayer = factory(root.NanoDemo).SwitchPlayer; }
})(typeof self !== 'undefined' ? self : this, function (core) {
  'use strict';

  var SWITCH_FAIL_EVENTS = ['onUpdateSourceFail', 'onUpdateSourceError', 'onUpdateSourceTimeout',
    'onUpdateSourceAbort', 'onUpdateSourceInvalid'];

  function SwitchPlayer(containerId, options) {
    var self = this;
    this._opts = options || {};
    this._streams = [];
    this._index = -1;
    this._pending = null; // { to, resolve, reject } while a switch is in flight
    this._state = 'idle';
    this._handlers = {};
    this._ctl = core.createController(containerId, {
      onState: function (s) { self._setState(s); },
      onError: function (msg) { self._emit('error', { message: msg }); },
      onStats: function (stats) { self._emit('stats', { stats: stats }); },
      onLog: function (name, e) { self._emit('log', { name: name, event: e }); }
    }, this._opts.env);
  }

  SwitchPlayer.prototype.on = function (type, fn) {
    (this._handlers[type] = this._handlers[type] || []).push(fn);
    return this;
  };

  SwitchPlayer.prototype._emit = function (type, data) {
    var evt = { type: type, data: data, time: Date.now() };
    (this._handlers[type] || []).slice().forEach(function (fn) { fn(evt); });
  };

  SwitchPlayer.prototype._setState = function (s) {
    if (s === this._state) { return; }
    this._state = s;
    this._emit('state', { state: s });
  };

  SwitchPlayer.prototype._source = function (i) {
    return core.buildSource({ stream: this._streams[i].stream, token: this._opts.token, server: this._opts.server });
  };

  // First outcome wins; later success/fail events for the same switch are ignored.
  SwitchPlayer.prototype._settle = function (errMsg, quiet) {
    var p = this._pending;
    if (!p) { return; }
    this._pending = null;
    if (errMsg) {
      if (!quiet) { this._emit('error', { message: 'Switch failed: ' + errMsg }); }
      p.reject(new Error(errMsg));
      return;
    }
    var from = this._index;
    this._index = p.to;
    this._emit('switched', { from: from, index: p.to });
    p.resolve(p.to);
  };

  SwitchPlayer.prototype.load = function (streams) {
    var self = this;
    if (!Array.isArray(streams) || streams.length === 0) {
      return Promise.reject(new Error('SwitchPlayer.load needs at least one stream.'));
    }
    this._settle('superseded by load()', true);
    this._streams = streams.slice();
    this._index = 0;
    var extra = { onUpdateSourceSuccess: function () { self._settle(null); } };
    SWITCH_FAIL_EVENTS.forEach(function (name) {
      extra[name] = function (e) { self._settle(core.errorMessage(e)); };
    });
    return this._ctl.load({
      stream: streams[0].stream,
      token: this._opts.token,
      server: this._opts.server,
      playback: this._opts.playback,
      style: this._opts.style,
      extra: extra
    }).then(function (player) { return player !== null; });
  };

  SwitchPlayer.prototype.switchTo = function (i) {
    var self = this;
    var player = this._ctl.player;
    if (!player) { return Promise.reject(new Error('Call load() first.')); }
    if (!(i >= 0 && i < this._streams.length)) { return Promise.reject(new Error('No stream at index ' + i + '.')); }
    if (this._pending) { return Promise.reject(new Error('A switch is already in progress.')); }
    if (i === this._index) { return Promise.resolve(i); }
    return new Promise(function (resolve, reject) {
      self._pending = { to: i, resolve: resolve, reject: reject };
      self._emit('switching', { from: self._index, to: i });
      // onUpdateSource* events are the authority for the outcome; a rejected
      // promise (bad source, player gone) fails the switch too.
      player.updateSource(self._source(i)).then(null, function (err) {
        self._settle(core.errorMessage(err));
      });
    });
  };

  SwitchPlayer.prototype.destroy = function () {
    this._settle('player destroyed', true);
    this._ctl.stop();
    this._index = -1;
  };

  Object.defineProperty(SwitchPlayer.prototype, 'state', { get: function () { return this._state; } });
  Object.defineProperty(SwitchPlayer.prototype, 'index', { get: function () { return this._index; } });

  return { SwitchPlayer: SwitchPlayer };
});

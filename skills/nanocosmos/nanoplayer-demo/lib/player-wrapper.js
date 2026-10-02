/* nanoplayer-demo wrapper example: NanoDemo.SwitchPlayer.
 *
 * Presents nanoPlayer as a "switch player": load a list of stream groups,
 * switch between them in place with updateSource() (no teardown, no black
 * frame). The page's PLAYER_CONFIG stays the single source of player
 * options; the wrapper only swaps source.group.id.
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

  // options = { config: the page's PLAYER_CONFIG (after applyUrlParams), env? }
  function SwitchPlayer(containerId, options) {
    var self = this;
    this._opts = options || {};
    this._config = this._opts.config;
    this._groups = [];
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

  SwitchPlayer.prototype._configFor = function (i) {
    return core.withSourceId(this._config, this._groups[i].id);
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

  // A switch the wrapper can't start: tell the page (error event) and the caller.
  SwitchPlayer.prototype._refuse = function (message) {
    this._emit('error', { message: message });
    return Promise.reject(new Error(message));
  };

  // groups = [{ label, id }]; plays groups[0] with the page config.
  SwitchPlayer.prototype.load = function (groups) {
    var self = this;
    if (!Array.isArray(groups) || groups.length === 0) {
      return Promise.reject(new Error('SwitchPlayer.load needs at least one group.'));
    }
    if (!this._config || !this._config.source || !this._config.source.group) {
      return Promise.reject(new Error('SwitchPlayer switches between groups: PLAYER_CONFIG needs source.group.'));
    }
    this._settle('superseded by load()', true);
    this._groups = groups.slice();
    this._index = 0;
    var extra = { onUpdateSourceSuccess: function () { self._settle(null); } };
    SWITCH_FAIL_EVENTS.forEach(function (name) {
      extra[name] = function (e) { self._settle(core.errorMessage(e)); };
    });
    return this._ctl.load(this._configFor(0), extra).then(function (player) { return player !== null; });
  };

  SwitchPlayer.prototype.switchTo = function (i) {
    var self = this;
    var player = this._ctl.player;
    if (!player) {
      return this._refuse(this._state === 'connecting' || this._state === 'buffering'
        ? 'Wait until the first group is playing, then switch.'
        : 'Call load() first.');
    }
    if (!(i >= 0 && i < this._groups.length)) { return this._refuse('No group at index ' + i + '.'); }
    // Not an error event: the UI disables switch buttons while a switch runs.
    if (this._pending) { return Promise.reject(new Error('A switch is already in progress.')); }
    if (i === this._index) { return Promise.resolve(i); }
    return new Promise(function (resolve, reject) {
      self._pending = { to: i, resolve: resolve, reject: reject };
      self._emit('switching', { from: self._index, to: i });
      // onUpdateSource* events are the authority for the outcome; a rejected
      // promise (bad source, player gone) fails the switch too.
      player.updateSource(self._configFor(i).source).then(null, function (err) {
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
  // The config currently playing (for the Configuration panel).
  Object.defineProperty(SwitchPlayer.prototype, 'config', {
    get: function () { return this._index >= 0 ? this._configFor(this._index) : this._config; }
  });

  return { SwitchPlayer: SwitchPlayer };
});

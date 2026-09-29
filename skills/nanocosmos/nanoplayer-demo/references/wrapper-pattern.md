# Wrapper pattern

A feature wrapper presents nanoPlayer as a product or use case of its own
(the "switch player", a "replay player", a "watch party"). The page talks to
the wrapper; only the wrapper talks to nanoPlayer.

`lib/player-wrapper.js` (`NanoDemo.SwitchPlayer`) is the worked example. The
`feature-wrapper` template wires it into a page.

## Contract

```js
var sp = new NanoDemo.SwitchPlayer('player', { token: params.token, server: params.server });
sp.on('state', function (e) { /* e.data.state */ });
sp.on('switched', function (e) { /* e.data.index */ });
sp.load([{ label: 'Cam 1', stream: 'XXXXX-YYYYY' }, { label: 'Cam 2', stream: '<uuid>' }]);
sp.switchTo(1);          // Promise<index>
sp.destroy();            // idempotent
sp.state; sp.index;
```

Rules every wrapper follows:

1. **Built on `NanoDemo.createController`.** The controller owns the only
   `NanoPlayer` instance, wires events in `setup({ events })` and handles
   double-loads and `pagehide`. The page never touches `NanoPlayer`.
2. **Feature-shaped API.** Methods name the feature (`switchTo`, not
   `updateSource`). `load(...)`, `destroy()`, `on(type, fn)` and a `state`
   getter are always present.
3. **One event shape:** `{ type, data, time }`. Always emit `state`,
   `error` (`data.message`, human-readable) and `stats`; add feature events
   (`switching`, `switched`).
4. **Errors are never swallowed.** Every player or feature failure becomes an
   `error` event. Promise rejections carry the same message.
5. **One outcome per action.** Guard in-flight actions (SwitchPlayer's
   `_pending`), so duplicate SDK events can't emit twice and a second click
   during a pending action is rejected, not queued.
6. **No DOM beyond the player container.** UI lives in `js/app.js`.
7. **`destroy()` is idempotent** and rejects pending actions quietly.

## Writing a new wrapper

1. Copy `lib/player-wrapper.js` into the demo as `js/<feature>-player.js` and
   rename `SwitchPlayer` → `<Feature>Player` (the UMD header attaches it to
   `NanoDemo`).
2. Keep the controller setup, `on`/`_emit`/`_setState`, `load` and `destroy`.
   Replace `switchTo` with the feature's methods. Player events the feature
   needs go into `extra` in `load()`, never `player.on()`.
3. Test it the way `tests/wrapper.test.mjs` tests SwitchPlayer, with the fake
   player from `tests/helpers.mjs`: happy path, failure path, duplicate
   events, action while pending, destroy while pending.
4. If the wrapper is useful beyond one demo, move it into this skill's `lib/`
   with its tests and add it to `new-demo.mjs`.

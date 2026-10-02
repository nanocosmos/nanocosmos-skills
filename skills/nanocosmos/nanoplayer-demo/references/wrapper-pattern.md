# Wrapper pattern

A feature wrapper presents nanoPlayer as a product or use case of its own
(the "switch player", a "replay player", a "watch party"). The page talks to
the wrapper; only the wrapper talks to nanoPlayer. The page's `PLAYER_CONFIG`
stays the single source of player options: a wrapper changes only what its
feature is about.

`lib/player-wrapper.js` (`NanoDemo.SwitchPlayer`) is the worked example. The
`feature-wrapper` template wires it into a page.

## Contract

```js
var config = NanoDemo.applyUrlParams(PLAYER_CONFIG, location.search);
var GROUPS = [{ label: 'Cam 1', id: '<group id>' }, { label: 'Cam 2', id: '<group id>' }];

var sp = new NanoDemo.SwitchPlayer('player', { config: config });
sp.on('state', function (e) { /* e.data.state */ });
sp.on('switched', function (e) { /* e.data.index; sp.config is now the active config */ });
sp.load(GROUPS);         // plays GROUPS[0] with the page config
sp.switchTo(1);          // Promise<index>: updateSource with source.group.id = GROUPS[1].id
sp.destroy();            // idempotent
sp.state; sp.index; sp.config;
```

Rules every wrapper follows:

1. **Built on `NanoDemo.createController`.** The controller owns the only
   `NanoPlayer` instance, wires events in `setup({ events })` and handles
   double-loads and `pagehide`. The page never touches `NanoPlayer`.
2. **Takes the page config, changes only its feature.** SwitchPlayer swaps
   `source.group.id` (via `withSourceId`) and nothing else; `startQuality`,
   `security`, `options`, `playback` come from `PLAYER_CONFIG`. Expose the
   active config (`config` getter) so the page's Configuration panel shows
   what is playing.
3. **Feature-shaped API.** Methods name the feature (`switchTo`, not
   `updateSource`). `load(...)`, `destroy()`, `on(type, fn)` and a `state`
   getter are always present.
4. **One event shape:** `{ type, data, time }`. Always emit `state`,
   `error` (`data.message`, human-readable) and `stats`; add feature events
   (`switching`, `switched`).
5. **Errors are never swallowed.** Every player or feature failure becomes an
   `error` event, including refusals ("Wait until the first group is
   playing"). Promise rejections carry the same message.
6. **One outcome per action.** Guard in-flight actions (SwitchPlayer's
   `_pending`), so duplicate SDK events can't emit twice and a second click
   during a pending action is rejected, not queued.
7. **No DOM beyond the player container.** UI lives in `js/app.js`.
8. **`destroy()` is idempotent** and rejects pending actions quietly.

## Writing a new wrapper

1. The scaffold copies `js/player-wrapper.js` (SwitchPlayer). For a different
   feature, rename it to `js/<feature>-player.js`, rename the class, and
   update the `<script>` tag.
2. Keep the controller setup, `on`/`_emit`/`_setState`, `load` and `destroy`.
   Replace `switchTo` with the feature's methods. Player events the feature
   needs go into `extra` in `this._ctl.load(config, extra)`, never
   `player.on()`. `extra` handlers are guarded like the built-in ones.
3. A wrapper with several players (e.g. multiview) uses one controller per
   player and must define what happens when one of them fails; document it.
4. Test it the way `tests/wrapper.test.mjs` tests SwitchPlayer, with the fake
   player from `tests/helpers.mjs`: happy path, failure path, duplicate
   events, action while pending, destroy while pending.
5. If the wrapper is useful beyond one demo, move it into this skill's `lib/`
   with its tests and add it to `new-demo.mjs`.

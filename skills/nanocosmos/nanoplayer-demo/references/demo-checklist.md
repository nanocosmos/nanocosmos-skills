# "Demo done" checklist

Run `node scripts/check-demo.mjs <demo>` first; it covers the items marked (auto).

## Configuration
- [ ] (auto) The page defines `var PLAYER_CONFIG = { … }` (index.html or js/app.js)
- [ ] It plays a group (`source.group.id`) with `startQuality`; single stream only via `?stream=` when asked for
- [ ] (auto) No hardcoded `serverDomain`; no `startIndex` next to a group
- [ ] Every option you changed is commented with why; nothing player-related outside `PLAYER_CONFIG` or `mergeConfig` overrides
- [ ] The Configuration panel shows the effective config, Copy works, tokens show as `[redacted]`
- [ ] Audio: `muted: false` + `automute: true`, or `muted: true` with a comment (multi-tile, kiosk)

## Structure and look
- [ ] Started from a `nanoplayer-demo` template of the right type
- [ ] (auto) `product-theme.css` linked, then `page.css`; no `<style>`, no `style=""`
- [ ] (auto) `page.css` uses theme tokens only
- [ ] `product-theme.css` and `js/demo-core.js` are unmodified copies
- [ ] Header logo matches the product (nanoStream for player demos); title is set
- [ ] (auto) `noindex, nofollow`; footer version stamp present, with today's date
- [ ] No template placeholder copy left ("Event or customer description goes here", "Event · venue · dates go here", "About this feature" text changed to the real feature)
- [ ] Viewer-facing pages show no developer text (URL params, debug panels)

## Player behavior (real browser, real streams)
- [ ] Plays the group; `?stream=XXXXX-YYYYY` plays a single stream
- [ ] `?token=` plays a secured group; the token doesn't appear in the panel, log or copied report
- [ ] A wrong group / offline stream shows a readable error (e.g. "Stream not found") and an Error badge
- [ ] Stop, then Load again works; double-clicking Load leaves one player
- [ ] Status line shows bitrate and buffer delay with target (record whether the buffer values look like seconds)
- [ ] (auto) No player `stop()` calls; no `player.on('onX')` after setup
- [ ] Wrapper demos: every feature action works, and a failure shows an error

## Safety
- [ ] (auto) No hardcoded JWTs or keys
- [ ] Demo JWTs, if any are shared in links, are expired-acceptable (check `exp`)

## Browsers
- [ ] Chrome, Safari, Firefox, plus one mobile browser (iOS Safari or Android Chrome)
- [ ] Layout holds at phone width (known theme issue at 375 px: report to brand-guidelines, don't patch)

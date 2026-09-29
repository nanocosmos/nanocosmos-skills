# "Demo done" checklist

Run `node scripts/check-demo.mjs <demo>` first; it covers the items marked (auto).

## Structure and look
- [ ] Started from a `nanoplayer-demo` template of the right type
- [ ] (auto) `product-theme.css` linked, then `page.css`; no `<style>`, no `style=""`
- [ ] (auto) `page.css` uses theme tokens only
- [ ] `product-theme.css` and `js/demo-core.js` are unmodified copies
- [ ] Header logo matches the product (nanoStream for player demos); title is set
- [ ] (auto) `noindex, nofollow`; footer version stamp present and bumped, with today's date
- [ ] No template placeholder copy left ("Event or customer description goes here", "About this feature" text changed to the real feature)

## Player behavior (real browser, real streams)
- [ ] Plays by stream name and by group UUID
- [ ] `?token=` plays a secured stream; the token doesn't appear in the log or copied report
- [ ] An offline or misspelled stream shows "Stream not found or offline" and an Error badge
- [ ] Stop, then Load again works; double-clicking Load leaves one player
- [ ] (auto) No player `stop()` calls; no `player.on('onX')` after setup
- [ ] Wrapper demos: every feature action works, and a failure shows an error

## Safety
- [ ] (auto) No hardcoded JWTs or keys
- [ ] Demo JWTs, if any are shared in links, are expired-acceptable (check `exp`)

## Browsers
- [ ] Chrome, Safari, Firefox, plus one mobile browser (iOS Safari or Android Chrome)
- [ ] Layout holds at phone width (no horizontal scroll)

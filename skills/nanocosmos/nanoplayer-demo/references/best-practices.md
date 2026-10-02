# nanoPlayer demo best practices

Authority: the official nanoPlayer docs, player **5.0.13**. Each rule names its
source page as a `nano-docs` repo path (`docs/nanoplayer/…`); the published
page is `https://docs.nanocosmos.de/docs/nanoplayer/<file name without extension>`.
When the docs and this page disagree, the docs win: fix this page.

## 1. Configuration lives in the page

1. Every demo starts its script with one literal `PLAYER_CONFIG` in the
   docs' shape (`source`, `playback`, `style`), every option written out and
   commented. It is what nanoPlayer receives; the demo only adds `events`.
2. URL parameters change a copy of it, in one visible call:
   `var config = NanoDemo.applyUrlParams(PLAYER_CONFIG, location.search);`
3. Controls in a demo (latency mode, MoQ, …) write into a copy of the config
   with `NanoDemo.mergeConfig`, never into hidden state.
4. Every page shows the Configuration panel (`NanoDemo.mountConfigPanel`):
   the effective config as JSON with a Copy button, tokens redacted. The
   viewer-facing `branded-page` shows it only with `?config=1`.
5. Never put options in `demo-core.js`; it builds no config.

## 2. Group playback (default)

6. Play by **bintu stream group**: `source.group.id`. The docs call it "the
   easiest player configuration available, especially for ABR setup"
   (`docs/nanoplayer/nanoplayer_getting_started.md`). Shape: `group: { id,
   security, apiurl?, startQuality? }`; `apiurl` defaults to
   `https://bintu.nanocosmos.de` (`docs/nanoplayer/nanoplayer_feature_stream_group_configuration.md`).
7. Use `group.startQuality` (`high | medium-high | medium | medium-low |
   low`, default `low`), not `startIndex`: it maps to a valid index whatever
   the number of renditions (`docs/nanoplayer/nanoplayer_feature_stream_group_configuration.md`).
   Demos use `medium`; with fast start the docs advise starting at medium or
   lower (`docs/nanoplayer/nanoplayer_feature_fast_start.md`).
8. `?stream=XXXXX-YYYYY` is the explicit opt-in for a single stream that is
   not in a group: `entries` with `defaults.service: 'bintu'`
   (`docs/nanoplayer/nanoplayer_feature_source_defaults.md`). `?stream=` wins
   over `?group=`.
9. Do not set `source.general.serverDomain` in a template: it "has highest
   prio and will override/modify all h5live server domains"
   (`docs/nanoplayer/nanoplayer_api.mdx`). Only `?server=` sets it.

## 3. Autoplay and audio

10. `autoplay: true, automute: true, muted: false`: "the player will attempt
    to start the playback unmuted. If this fails due to browser autoplay
    policy restrictions the playback will be started muted"
    (`docs/nanoplayer/nanoplayer_autoplay.md`).
11. Exceptions, each commented in the template: `multi-player` (tiles would
    overlap) and `branded-page` (unattended screen) use `muted: true`.
12. iOS low power mode needs a user interaction even when muted
    (`docs/nanoplayer/nanoplayer_autoplay.md`); error 1005 means "playback
    must be initialized by user gesture": show a play button, don't retry.

## 4. Latency, MoQ, ABR settings

13. `latencyControlMode`: `classic | fastadaptive | balancedadaptive`
    (default `balancedadaptive`): a behavior, not seconds
    (`docs/nanoplayer/nanoplayer_feature_latency_control_modes.md`). Leave
    `tweaks.buffer` alone with the adaptive modes.
14. `enableMediaOverQuic: true` (default) uses MoQ where the browser supports
    it and falls back to WebSocket/MSE (`docs/nanoplayer/nanoplayer_feature_moq.md`).
    MoQ renders to a `<canvas>`, not a `<video>`.
15. `options.adaption.rule: 'deviationOfMean2'` turns ABR on; `'none'` keeps
    the start quality. It is not a transport switch (`docs/nanoplayer/nanoplayer_api.mdx`).
16. `options.switch`: `method: 'server', pauseOnError: false, forcePlay: true,
    timeout: 20` (API default 20 s; the getting-started example uses 10)
    (`docs/nanoplayer/nanoplayer_api.mdx`).
17. `style.scaling: 'letterbox'` (default; `fill`, `crop` are the other
    values; `resize`/`original` were removed in v5) (`docs/nanoplayer/nanoplayer_api.mdx`).

## 5. ABR at runtime

18. `player.switchStream(index)` forces a rendition and disables active ABR;
    `player.setAdaption({ rule: 'deviationOfMean2' })` turns ABR back on
    (`docs/nanoplayer/nanoplayer_feature_stream_switching.md`, `docs/nanoplayer/nanoplayer_api.mdx`).
19. `onSwitchStreamInit / Success / Fail / Abort` carry `data.entry` (the
    current source entry) and `data.type` (`up`, `down`, `direct`); show the
    active quality from `data.entry`, not from a hardcoded list.
20. UNVERIFIED: the docs do not document how to read a group's full rendition
    list before switching. Don't invent "High/Medium/Low" buttons; if a demo
    needs them, check the resolved config in a real browser first and say so
    in the demo.
21. Different content is `updateSource(source)`; a quality change is
    `switchStream(index)`. There is no `stop()`: stop is `destroy()`.

## 6. Events, stats and errors

22. Pass events in `setup({ events })` (the controller does), never
    `player.on()` after `setup()`.
23. `onStats` (`docs/nanoplayer/nanoplayer_api.mdx`): `bitrate.*` is in
    **bit/s** (demos show kbps). There is no latency field. Demos show
    `buffer.delay.current` as "Buffer delay" next to `buffergoal.real` (the
    latency control's target) as "target". UNVERIFIED: the docs give no unit
    for `buffer.delay` or `buffergoal`; demos show seconds (media-timeline
    values, compared with `tweaks.buffer` in seconds). `onError`'s
    `bufferDelayCurrent` is documented in ms.
24. Error codes (`docs/nanoplayer/nanoplayer_api_errors.md`, codes in
    `docs/nanoplayer/nanoplayer_api.mdx`): 2001 stream not found, 2002 no
    media, 2003 not enough media data, 2004 source stopped, 4006 source request
    timed out, 4900–4904 security (4901 invalid token, 4903 expired/missing
    token), 5001–5010 setup/configuration (5002/5003 browser support).
    `NanoDemo.errorText` maps these to readable text.
25. Don't retry these; the player recovers itself or the user must act: 1005,
    1007, 1008, 1009, 3001–3005, 3100, 3101, 3200, 4003. For 1007/1009 wait
    for the page to be visible again (`document.visibilityState`). Other
    errors: limited replay attempts with increasing intervals
    (`docs/nanoplayer/nanoplayer_api_errors.md`).

## 7. Tokens

26. JWT only: `security: { jwtoken }` on the group (or entry). Presence of a
    token means secure; no separate switch (`docs/nanoplayer/nanoplayer_security_jwt.md`).
27. An expired token can't open new connections **or switch streams or
    renditions** on an existing connection; existing sessions continue unless
    the token has `forceDisconnect` (`docs/nanoplayer/nanoplayer_security_jwt.md`).
28. Never ship tokens or keys in a demo file: pass them with `?token=`; the
    panel, log and report redact them.

## 8. Deprecated: never use

29. `source.options.switch.fastStart` (use `playback.faststart`);
    `source.h5live`, `source.bintu`, `source.hls` (use `group` or `entries`);
    STS tokens (use JWT); scaling `resize`/`original`
    (`docs/nanoplayer/nanoplayer_api.mdx`, `docs/nanoplayer/nanoplayer_release_history.md`).

## 9. Demo conventions (owned by this skill)

30. Load `https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js`,
    then `js/demo-core.js`.
31. Look: link `product-theme.css` unmodified, then `page.css`; tokens only
    in `page.css`; class selectors only (nanocosmos-brand-guidelines).
32. Copy is functional and label-driven; the only marketing links are the
    standard header pill pair.
33. First build ships as `1.0.0` with the scaffold date; bump the footer
    version on every change after handover.
34. `<meta name="robots" content="noindex, nofollow">`; players are destroyed
    on `pagehide`.
35. Customer branding (`branded-page`) = customer logo + copy; colors stay
    nanocosmos tokens. No logo yet: keep the "logo pending" placeholder.

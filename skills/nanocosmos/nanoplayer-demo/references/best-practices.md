# nanoPlayer demo best practices

One line per rule. Where another skill owns the detail, follow the pointer;
don't copy the detail into a demo.

## Player usage (details: nanostream-development/SKILL.md)

1. Load `https://demo.nanocosmos.de/nanoplayer/api/release/nanoplayer.5.min.js`, then `js/demo-core.js`. `startPlayer` reports a blocked CDN readably.
2. Pass player events in `setup({ events })`. Never call `player.on('onX')` after `setup()`: it races the first events. `createController` does this for you.
3. Always surface `onStreamInfoError` (offline or unknown stream) and `onError` (`e.data.message` first). `statusHandlers` shows both in the status bar.
4. Drive UI state from player events (`onPlay`, `onPause`, buffering), not from click handlers.
5. Use `onStats` for metrics; never poll.
6. There is no stop method on the player. Stop = `destroy()` (`controller.stop()`); another stream in place = `updateSource(source)`; an ABR rendition = `switchStream(index)`.
7. `latencyControlMode` is `fastadaptive`, `balancedadaptive` (default) or `classic`: a behavior, not seconds. `buildConfig` rejects anything else.
8. Autoplay needs `automute`; `buildConfig` enforces it.
9. `adaption.rule` stays `deviationOfMean2`; it's not an ABR on/off switch.

## Demo conventions (owned here)

10. URL params: `?stream=` (name or UUID, auto-detected), `?token=` (alias `?jwtoken=`), `?server=`; multi-stream demos add `?streams=a,b,c`. Document them in the page's helper text.
11. Never ship credentials: no API keys, metrics keys or long-lived tokens in any file. Tokens come from `?token=`, and logs/reports are redacted. `check-demo` flags JWT literals and key assignments.
12. The default stream is one constant (`DEFAULTS.stream`, or a `DEFAULT_STREAMS` constant at the top of `app.js`).
13. Copy is functional and label-driven. The only marketing links are the standard header pill pair from `product-sample.html`.
14. Bump the footer version stamp on every change (PATCH for fixes, MINOR for features), with today's date.
15. `<meta name="robots" content="noindex, nofollow">`.
16. Players are destroyed on `pagehide`, so demos don't leave viewer sessions open (`startPlayer` does it).
17. Look: link `product-theme.css` unmodified, then `page.css`; tokens only in `page.css`; class selectors only. Details: nanocosmos-brand-guidelines, product tier.
18. Customer branding (`branded-page`) = customer logo + copy. Colors stay nanocosmos tokens.

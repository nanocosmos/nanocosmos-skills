# nanoplayer-demo skill — design

Date: 2026-09-29 · Owner: player team · Status: draft for review

## 1. Goal

The player team gets repeated requests from other teams (sales, marketing,
support, product) to build nanoPlayer demos. Today every demo is built ad hoc,
so structure, player usage and look drift apart (see the Bootstrap/jQuery,
per-demo `demo.css` generation in `client-demo-apps/nanoplayer/*`).

The `nanoplayer-demo` skill makes every new demo:

- use nanoPlayer 5 **correctly** (config, events, lifecycle, security),
- share **one base look** — the nanocosmos product tier,
- start from a **known template** matching the demo type,
- pass the same **"demo done" checklist** before handover.

Success = a demo built by anyone with the skill loaded is indistinguishable in
structure and look from one built by the player team, and passes the checklist
without rework.

## 2. Non-goals

- **No new visual style.** The look is owned by `nanocosmos-brand-guidelines`
  (`product-theme.css`). This skill never defines colors, fonts or components.
- **No duplicated player facts.** Verified config values, event semantics and
  lifecycle rules stay in `nanostream-development`; this skill links to them.
- No build tooling / frameworks. No marketing pages (those stay in
  brand-guidelines' marketing tier).
- Not migrating old demos in `client-demo-apps/`.

## 3. Ownership boundaries (no overlap)

| Concern | Owner |
|---|---|
| Colors, fonts, header/footer, buttons, panels, workbench layout, theme sync | `nanocosmos-brand-guidelines` (`product-theme.css`, `product-sample.html`, `check_theme_sync.sh`, `theme_consumers.txt`) |
| Player config values, events, lifecycle, JWT, ABR, `updateSource`/`switchStream` | `nanostream-development` |
| Demo templates, wrapper pattern, demo best-practice rules, checklist, demo hosting | **`nanoplayer-demo` (new)** |
| Dark Neutral Studio | not used for nanocosmos demos (per brand-guidelines priority note) |

Where a rule exists in an owner skill, `nanoplayer-demo` states it in one line
and points to the owner — it never restates details that could drift.

## 4. Demo types (templates)

| ID | Template | Use for |
|---|---|---|
| A | `single-player` | One stream in the brand shell — links for sales/marketing |
| B | `feature-showcase` | One player feature with its controls (ABR, MOQ vs H5Live, latency modes, token security, captions) |
| C | `multi-player` | Grid of streams / side-by-side comparison |
| D | `diagnostics` | Stats panel, event log, copy-report for support |
| E | `branded-page` | Player inside a customer- or event-branded product page |
| G | `feature-wrapper` | A JS wrapper around nanoPlayer presenting a feature/use case as its own thing (e.g. switch player) |

## 5. File layout

### 5.1 Every demo (minimum)

Per brand-guidelines' rule for new product pages (decided 2026-09-04), CSS is
never inlined:

```
<demo-name>/
  index.html          markup + (for simple demos) inline <script>
  product-theme.css   unmodified physical copy of the canonical theme
  page.css            demo-specific styles only, theme tokens only, no raw hex
```

### 5.2 When to add JS modules

Move JS out of `index.html` into modules when **any** of these is true:

- the demo has a reusable wrapper (type G always does),
- the demo has more than one page,
- inline JS exceeds ~300 lines.

```
<demo-name>/
  index.html
  product-theme.css
  page.css
  js/
    player-wrapper.js   the wrapper (ES module)
    app.js              page wiring: URL params, UI ↔ wrapper
```

ES modules don't load from `file://`; such demos are run from a static server
(`npx serve`, `python -m http.server`) or GitLab Pages. Demos with only an
inline script still open from `file://` (linked CSS files load fine there).

### 5.3 Skill layout

```
skills/nanocosmos/nanoplayer-demo/
  SKILL.md                    trigger, template picker, rules summary, checklist pointer
  templates/
    single-player/            index.html, page.css
    feature-showcase/
    multi-player/
    diagnostics/
    branded-page/
    feature-wrapper/          index.html, page.css, js/player-wrapper.js, js/app.js
  references/
    best-practices.md         demo rules (§6) with links to nanostream-development
    wrapper-pattern.md        wrapper contract (§7)
    demo-checklist.md         "demo done" checklist (§8)
  internal/                   internal tier — never shipped publicly
    hosting.md                GitLab Pages deploy, internal test streams, theme registration
```

Templates don't include their own `product-theme.css`; the skill tells the
agent to copy the current canonical file from brand-guidelines when
scaffolding, so templates can't carry a stale theme.

## 6. Best-practice rules (content of `best-practices.md`)

Each rule is one line plus a pointer where another skill owns the detail.

Player usage (detail in `nanostream-development`):
1. Load `nanoplayer.5.min.js` from the nanocosmos CDN; guard `typeof NanoPlayer !== "undefined"`.
2. Pass events in `setup({ events: {...} })` — never `player.on()` in `setup().then()` (race).
3. Always handle `onStreamInfoError` and `onError` (`e.data.message` first) and show them in the UI.
4. Drive UI state from player events (`onPlay`, `onPause`, buffering), not click handlers.
5. Use `onStats` for metrics; never poll.
6. There is no `stop()`. Stop = `destroy()`; switch streams = `updateSource()`; ABR rendition = `switchStream(index)`.
7. Only `latencyControlMode` values `fastadaptive` / `balancedadaptive` / `classic`.
8. Autoplay implies muted (`autoplay`, `automute`, `muted`).

Demo conventions (owned here):
9. Standard URL params: `?stream=` (name or UUID, auto-detected), `?token=` (alias `?jwtoken=`), `?server=`. Demo-specific params are documented in the page footer/help.
10. Never embed credentials, API keys or long-lived tokens. Demo JWTs only if expired-acceptable and `exp` checked.
11. Default stream comes from a single constant at the top of the script.
12. Copy: functional, label-driven, no marketing CTAs (brand-guidelines product tier).
13. Page version stamp in the footer; bump on every change.
14. `<meta name="robots" content="noindex, nofollow">`.
15. `destroy()` the player on `pagehide`, so demos don't leave sessions open.

## 7. Wrapper pattern (content of `wrapper-pattern.md`)

For type G demos. The wrapper hides nanoPlayer behind a small feature-shaped API.

```js
// js/player-wrapper.js
export class SwitchPlayer {            // named after the feature
  constructor(containerId, options)    // no side effects beyond storing config
  async load(streams)                  // builds config, new NanoPlayer + setup()
  async switchTo(index)                // feature API — uses updateSource/switchStream
  on(event, handler)                   // wrapper-level events, e.g. "state", "error", "switched"
  destroy()                            // player.destroy(), remove listeners, reset state
  get state()                          // "idle" | "connecting" | "playing" | "paused" | "error"
}
```

Contract:
- The wrapper owns the only `NanoPlayer` instance; the page never touches it directly.
- Player events are wired in `setup({events})` and re-emitted as wrapper events
  with a single normalized shape `{ type, data, time }`.
- Errors are never swallowed: every player error becomes an `"error"` event
  with a human-readable message.
- No DOM work beyond the player container; UI lives in `app.js`.
- `destroy()` is idempotent.

The switch player serves as the worked example (checked against
`stream-switching-demo`).

## 8. "Demo done" checklist (content of `demo-checklist.md`)

- [ ] Started from a `nanoplayer-demo` template of the right type
- [ ] `product-theme.css` is an unmodified copy of canonical; `page.css` uses tokens only
- [ ] Header/footer/buttons per `product-sample.html`; version stamp present
- [ ] Plays by name and by UUID; `?token=` works; offline stream shows an error
- [ ] Stop/switch use `destroy()`/`updateSource()`; no `stop()` calls
- [ ] No credentials in source; tokens redacted in any copied report
- [ ] Tested in Chrome, Safari, Firefox + one mobile browser
- [ ] (internal) Registered in `theme_consumers.txt`; deployed per `internal/hosting.md`

## 9. Public vs internal tier

Follows the two-tier layout of the other skills: `internal/` folders are never
shipped, `<!-- internal -->` blocks are stripped at build.

- **Public:** `best-practices.md`, `wrapper-pattern.md`, `demo-checklist.md`
  (minus internal items), SKILL.md.
- **Internal until the brand decision** (`nanostream-demo-styling` in
  REVIEW-NOTES.md) is resolved: all `templates/` (they depend on the
  non-public `product-theme.css`) and `internal/hosting.md`.

## 10. Repo note

This repo is generated from a private source repo. Work happens on branch
`feature/nanoplayer-demo-skill` here; before release the skill must be ported
into the source repo (or it will be overwritten on the next sync). Plugin
metadata (`.claude-plugin/`), README skill table, CHANGELOG and `install.sh`
skill list are updated in the same change.

## 11. Known inconsistencies — out of scope, flagged

- `nanostream-development/player/player-demo.html` uses Dark Neutral Studio
  colors. The new skill says "for nanocosmos demos use nanoplayer-demo
  templates", and the page's owner is notified.
- `nanostream-development/player/README.md` describes sibling pages inlining
  CSS, which is out of date since 2026-09-04. Flagged to its owner.
- Font hosting (Google Fonts stopgap) stays as brand-guidelines ships it.

## 12. Testing

- Each template: open locally, play the demo stream by name, by UUID and with a
  token; point it at an offline stream to confirm the error path; Stop, then Load again.
- `check_theme_sync.sh --diff` against a scaffolded demo reports IN SYNC.
- Skill test (writing-skills): give a fresh agent 3 sample requests (single
  player for sales, ABR showcase, switch-player wrapper) with the skill loaded;
  each output must pass the checklist without manual fixes.
